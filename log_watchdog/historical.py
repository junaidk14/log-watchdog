"""Bounded historical import and descriptive trends, independent of the detector."""

import json
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError

from .models import IngestRequest, utc_text
from .store import EventConflict, Store

MAX_UPLOAD_BYTES = 5_000_000


def import_events(store: Store, payload: bytes) -> dict[str, Any]:
    try:
        raw = json.loads(payload.decode("utf-8-sig"))
    except (ValueError, RecursionError) as exc:
        raise HTTPException(422, "Malformed JSON. Choose a UTF-8 JSON array of events.") from exc
    try:
        request = IngestRequest.model_validate({"events": raw})
    except ValidationError as exc:
        # Bound feedback as well as input, and never reflect arbitrary log content.
        errors = exc.errors(include_input=False, include_context=False, include_url=False)
        raise HTTPException(422, errors[:100]) from exc
    except RecursionError as exc:
        raise HTTPException(422, "JSON nesting is too deep. Simplify the event metadata.") from exc
    try:
        result = store.ingest("historical", request.events)
    except EventConflict as exc:
        row = exc.event_index + 1
        raise HTTPException(
            409, f"Row {row}: event_id conflicts with different content. No events imported."
        ) from exc
    return result | {
        "dataset": "historical",
        "start": utc_text(min(event.timestamp for event in request.events)),
        "end": utc_text(max(event.timestamp for event in request.events)),
    }


def trends(
    store: Store, service: str | None, start: datetime | None, end: datetime | None
) -> dict[str, Any]:
    clauses = ["dataset='historical'"]
    params: list[Any] = []
    if service:
        clauses.append("service=?")
        params.append(service)
    for operator, boundary in ((">=", start), ("<=", end)):
        if boundary is not None:
            clauses.append(f"timestamp {operator} ?")
            params.append(utc_text(boundary))
    where = " AND ".join(clauses)
    with store.connection() as db:
        db.execute("BEGIN")
        bounds = db.execute(
            f"SELECT min(timestamp), max(timestamp) FROM events WHERE {where}", params
        ).fetchone()
        if bounds[0] is None:
            return {"dataset": "historical", "total": 0, "buckets": []}
        first = datetime.fromisoformat(bounds[0]).replace(second=0, microsecond=0)
        last = datetime.fromisoformat(bounds[1])
        # At most 30 equal-width buckets, rounded up to whole minutes.
        span_seconds = (last - first) // timedelta(seconds=1) + 1
        seconds = max(60, ((span_seconds + 1799) // 1800) * 60)
        rows = db.execute(
            "SELECT (unixepoch(substr(timestamp,1,19))-unixepoch(?)) / ? AS bucket, "
            "count(*) AS total, sum(severity IN ('ERROR','FATAL')) AS errors "
            f"FROM events WHERE {where} GROUP BY bucket ORDER BY bucket",
            (utc_text(first), seconds, *params),
        ).fetchall()
    by_bucket = {row["bucket"]: row for row in rows}
    buckets = []
    for index in range(rows[-1]["bucket"] + 1):
        row = by_bucket.get(index)
        total, errors = (row["total"], row["errors"]) if row else (0, 0)
        bucket_start = first + timedelta(seconds=index * seconds)
        # The event schema permits year 9999; avoid overflowing the label at its edge.
        maximum = datetime.max.replace(tzinfo=UTC)
        remaining = (maximum - bucket_start).total_seconds()
        bucket_end = maximum if seconds > remaining else bucket_start + timedelta(seconds=seconds)
        buckets.append(
            {
                "start": utc_text(bucket_start),
                "end": utc_text(bucket_end),
                "total": total,
                "errors": errors,
                "rate": errors / total if total else None,
            }
        )
    return {
        "dataset": "historical",
        "service": service,
        "start": bounds[0],
        "end": bounds[1],
        "bucket_seconds": seconds,
        "total": sum(row["total"] for row in rows),
        "buckets": buckets,
    }
