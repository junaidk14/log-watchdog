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
from pydantic import AfterValidator, AwareDatetime
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .detector import DetectionDataset, Detector, DetectorConfig
from .evidence import Evidence, EvidenceUnavailable
from .models import Dataset, IngestRequest, Severity, normalize_utc
from .store import EventConflict, Store

ROOT = Path(__file__).resolve().parent.parent


def create_app(db_path: Path | None = None, frontend: Path | None = None) -> FastAPI:
    store = Store(db_path or Path(os.environ.get("LOG_WATCHDOG_DB", ".data/watchdog.sqlite3")))
    store.seed_demo()
    detector = Detector(store, DetectorConfig.from_environment())

    async def evaluate_live() -> None:
        while True:
            try:
                await asyncio.to_thread(detector.evaluate, "live", datetime.now(UTC))
            except Exception:
                logging.getLogger(__name__).exception("Live evaluation failed; retrying next tick")
            await asyncio.sleep(detector.config.poll_seconds)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        task = asyncio.create_task(evaluate_live())
        try:
            yield
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    app = FastAPI(title="Log Watchdog", version="0.1.0", lifespan=lifespan)
    app.state.detector = detector

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

    @app.post("/api/demo/advance")
    def advance() -> dict[str, Any]:
        try:
            return detector.advance()
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
        return store.browse(
            dataset,
            service=service,
            severity=severity,
            start=start,
            end=end,
            message=message,
            page=page,
            page_size=page_size,
        )

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
