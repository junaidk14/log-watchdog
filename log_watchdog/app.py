"""API plus compiled dashboard, served by a single loopback worker."""

import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import AfterValidator, AwareDatetime, BaseModel, ConfigDict, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .delivery import Delivery, ReceiverSettings
from .detector import DetectionDataset, Detector, DetectorConfig
from .evidence import Evidence, EvidenceUnavailable
from .historical import MAX_UPLOAD_BYTES, import_events, trends
from .lifecycle import Lifecycle
from .models import Dataset, IngestRequest, Severity, normalize_utc
from .store import DemoRunReset, EventConflict, Store

ROOT = Path(__file__).resolve().parent.parent


class ResetDemo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run: str = Field(min_length=1, max_length=100)
    confirm_demo_only: Literal[True]


def create_app(db_path: Path | None = None, frontend: Path | None = None) -> FastAPI:
    store = Store(db_path or Path(os.environ.get("LOG_WATCHDOG_DB", ".data/watchdog.sqlite3")))
    store.seed_demo()
    detector = Detector(store, DetectorConfig.from_environment())

    delivery = Delivery(store)
    lifecycle = Lifecycle(detector)

    async def deliver_pending() -> None:
        await asyncio.to_thread(delivery.recover_interrupted)
        while True:
            try:
                await asyncio.to_thread(delivery.tick)
            except Exception:
                logging.getLogger(__name__).exception("Delivery worker failed")
            await asyncio.sleep(0.25)

    async def evaluate_live() -> None:
        while True:
            try:
                await asyncio.to_thread(detector.evaluate, "live", datetime.now(UTC))
            except Exception:
                logging.getLogger(__name__).exception("Live evaluation failed; retrying next tick")
            await asyncio.sleep(detector.config.poll_seconds)

    async def retain_data() -> None:
        await asyncio.sleep(3600)
        while True:
            try:
                await asyncio.to_thread(lifecycle.cleanup)
            except Exception:
                logging.getLogger(__name__).exception("Retention failed; retrying next minute")
                await asyncio.sleep(60)
                continue
            await asyncio.sleep(3600)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        await asyncio.to_thread(lifecycle.cleanup)
        task = asyncio.create_task(evaluate_live())
        delivery_task = asyncio.create_task(deliver_pending())
        retention_task = asyncio.create_task(retain_data())
        try:
            yield
        finally:
            retention_task.cancel()
            try:
                await retention_task
            except asyncio.CancelledError:
                pass
            delivery_task.cancel()
            try:
                await delivery_task
            except asyncio.CancelledError:
                pass
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    app = FastAPI(title="Log Watchdog", version="0.1.0", lifespan=lifespan)
    app.state.detector = detector

    @app.get("/api/datasets/{dataset}/deliveries")
    def deliveries(
        dataset: Dataset,
        incident: Annotated[int | None, Query(ge=1)] = None,
        run: Annotated[str | None, Query(max_length=100)] = None,
    ) -> dict[str, Any]:
        try:
            return delivery.read(dataset, incident, run)
        except EvidenceUnavailable as exc:
            raise HTTPException(exc.status, exc.message) from exc

    @app.get("/api/demo/receiver")
    def receiver_settings() -> dict[str, str]:
        return {"behavior": delivery.settings()}

    @app.put("/api/demo/receiver")
    def configure_receiver(settings: ReceiverSettings) -> dict[str, str]:
        delivery.configure(settings.behavior)
        return {"behavior": settings.behavior}

    @app.post("/api/receiver")
    async def receiver(request: Request) -> JSONResponse:
        payload = bytearray()
        async for chunk in request.stream():
            payload.extend(chunk)
            if len(payload) > 65536:
                raise HTTPException(413, "Receiver payload exceeds 64 KiB")
        status, duplicate = await asyncio.to_thread(
            delivery.receive, request.headers.get("X-Delivery-ID", ""), bytes(payload)
        )
        return JSONResponse(
            {"accepted": status == 200, "duplicate": duplicate},
            status_code=status,
            headers={"X-Delivery-Duplicate": str(duplicate).lower()},
        )

    @app.get("/api/datasets/{dataset}/overview")
    def overview(dataset: DetectionDataset) -> dict[str, Any]:
        return detector.overview(dataset)

    @app.get("/api/datasets/{dataset}/incidents/{incident_id}/evidence")
    def evidence(
        dataset: DetectionDataset,
        incident_id: int,
        evaluation: Annotated[int | None, Query(ge=1)] = None,
        run: Annotated[str | None, Query(max_length=100)] = None,
        scope: Literal["evaluated", "all"] = "evaluated",
        severity: Severity | None = None,
        message: Annotated[str, Query(max_length=16384)] = "",
        event_id: Annotated[str | None, Query(max_length=200)] = None,
        page: Annotated[int, Query(ge=1, le=10000000)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 50,
    ) -> dict[str, Any]:
        try:
            return Evidence(store).read(
                dataset,
                incident_id,
                evaluation=evaluation,
                run=run,
                scope=scope,
                severity=severity,
                message=message,
                event_id=event_id,
                page=page,
                page_size=page_size,
            )
        except EvidenceUnavailable as exc:
            raise HTTPException(exc.status, exc.message) from exc

    @app.post("/api/demo/reset")
    def reset_demo(body: ResetDemo) -> dict[str, Any]:
        try:
            return lifecycle.reset_demo(body.run)
        except EvidenceUnavailable as exc:
            raise HTTPException(exc.status, exc.message) from exc

    @app.post("/api/demo/advance")
    def advance(run: Annotated[str | None, Query(max_length=100)] = None) -> dict[str, Any]:
        try:
            return detector.advance(run)
        except EvidenceUnavailable as exc:
            raise HTTPException(exc.status, exc.message) from exc
        except EventConflict as exc:
            raise HTTPException(
                409, "Simulation event ID conflicts; no advancement committed"
            ) from exc

    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]", "testserver"]
    )
    app.state.store = store

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Do not echo raw log content or non-JSON values (e.g. NaN) into an error response.
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {key: error[key] for key in ("loc", "msg", "type")} for error in exc.errors()
                ]
            },
        )

    @app.post("/api/datasets/{dataset}/events")
    def ingest(dataset: Dataset, request: IngestRequest) -> dict[str, Any]:
        try:
            return store.ingest(dataset, request.events)
        except EventConflict as exc:
            raise HTTPException(409, {"message": str(exc), "event_id": exc.event_id}) from exc

    @app.get("/api/datasets/{dataset}/events")
    def browse(
        dataset: Dataset,
        run: Annotated[str | None, Query(max_length=100)] = None,
        service: Annotated[str | None, Query(max_length=120)] = None,
        severity: Severity | None = None,
        start: Annotated[AwareDatetime, AfterValidator(normalize_utc)] | None = None,
        end: Annotated[AwareDatetime, AfterValidator(normalize_utc)] | None = None,
        message: Annotated[str, Query(max_length=16384)] = "",
        page: Annotated[int, Query(ge=1, le=10000000)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 50,
    ) -> dict[str, Any]:
        if start is not None and end is not None and start > end:
            raise HTTPException(422, "Start time must be at or before end time")
        try:
            return store.browse(
                dataset,
                run=run,
                service=service,
                severity=severity,
                start=start,
                end=end,
                message=message,
                page=page,
                page_size=page_size,
            )
        except DemoRunReset as exc:
            raise HTTPException(410, str(exc)) from exc

    @app.post("/api/historical/upload")
    async def upload_historical(request: Request) -> dict[str, Any]:
        media_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if media_type != "application/json":
            raise HTTPException(415, "Historical uploads require Content-Type: application/json.")
        payload = bytearray()
        async for chunk in request.stream():
            if len(payload) + len(chunk) > MAX_UPLOAD_BYTES:
                raise HTTPException(413, "File exceeds 5 MB (5,000,000 bytes). Split it and retry.")
            payload.extend(chunk)
        return await asyncio.to_thread(import_events, store, bytes(payload))

    @app.get("/api/historical/trends")
    def historical_trends(
        service: Annotated[str | None, Query(max_length=120)] = None,
        start: Annotated[AwareDatetime, AfterValidator(normalize_utc)] | None = None,
        end: Annotated[AwareDatetime, AfterValidator(normalize_utc)] | None = None,
    ) -> dict[str, Any]:
        if start is not None and end is not None and start > end:
            raise HTTPException(422, "Start time must be at or before end time")
        return trends(store, service, start, end)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    build = frontend or ROOT / "frontend" / "dist"
    if (build / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=build / "assets"), name="assets")

    @app.get("/", include_in_schema=False)
    def dashboard() -> FileResponse:
        if not (build / "index.html").is_file():
            raise HTTPException(
                503, "Dashboard not built. Run npm ci && npm run build in frontend/."
            )
        return FileResponse(build / "index.html")

    return app
