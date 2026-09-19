"""Short SQLite transactions; IDs, reads and seed markers are dataset-scoped."""

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from .models import Dataset, EventInput, utc_text


class EventConflict(Exception):
    def __init__(self, event_id: str, event_index: int) -> None:
        self.event_id = event_id
        self.event_index = event_index
        super().__init__(f"Event ID {event_id!r} already exists with different content")


class Store:
    def __init__(self, path: Path) -> None:
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS events (
                    sequence INTEGER PRIMARY KEY,
                    dataset TEXT NOT NULL CHECK(dataset IN ('demo','live','historical')),
                    event_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    service TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    ingested_at TEXT NOT NULL,
                    UNIQUE(dataset, event_id)
                );
                CREATE INDEX IF NOT EXISTS events_time
                    ON events(dataset, timestamp DESC, sequence DESC);
                CREATE INDEX IF NOT EXISTS events_service_time
                    ON events(dataset, service, timestamp DESC, sequence DESC);
                CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """)

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def _ingest(
        self, db: sqlite3.Connection, dataset: Dataset, events: list[EventInput]
    ) -> dict[str, Any]:
        ids = []
        inserted = 0
        now = utc_text(datetime.now(UTC))
        for event_index, event in enumerate(events):
            event_id = event.event_id or str(uuid4())
            content = (
                utc_text(event.timestamp),
                event.service,
                event.severity,
                event.message,
                json.dumps(event.metadata, sort_keys=True, separators=(",", ":"), allow_nan=False),
            )
            existing = db.execute(
                "SELECT timestamp,service,severity,message,metadata FROM events "
                "WHERE dataset=? AND event_id=?",
                (dataset, event_id),
            ).fetchone()
            if existing is not None:
                if tuple(existing) != content:
                    raise EventConflict(event_id, event_index)
            else:
                db.execute(
                    "INSERT INTO events(dataset,event_id,timestamp,service,severity,"
                    "message,metadata,"
                    "ingested_at) VALUES (?,?,?,?,?,?,?,?)",
                    (dataset, event_id, *content, now),
                )
                inserted += 1
            ids.append(event_id)
        return {"event_ids": ids, "inserted": inserted, "duplicates": len(events) - inserted}

    def ingest(self, dataset: Dataset, events: list[EventInput]) -> dict[str, Any]:
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            return self._ingest(db, dataset, events)

    def seed_demo(self) -> None:
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("INSERT OR IGNORE INTO settings VALUES ('demo_run', ?)", (str(uuid4()),))
            if db.execute("SELECT value FROM settings WHERE key='demo_seeded'").fetchone():
                return
            end = datetime(2026, 1, 1, 12, tzinfo=UTC)
            events = []
            for minute in range(30):
                for service in ("api-gateway", "checkout", "worker"):
                    for index in range(40):
                        events.append(
                            EventInput(
                                timestamp=end - timedelta(minutes=30 - minute, seconds=-index),
                                service=service,
                                severity="WARNING" if index == 0 else "INFO",
                                message="Connection retried successfully"
                                if index == 0
                                else f"{service}: operation completed",
                                metadata={"synthetic": True, "duration_ms": 12 + index},
                                event_id=f"seed-{minute}-{service}-{index}",
                            )
                        )
            self._ingest(db, "demo", events)
            db.execute("INSERT INTO settings VALUES ('demo_seeded', ?)", (utc_text(end),))

    def browse(
        self,
        dataset: Dataset,
        *,
        service: str | None = None,
        severity: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        message: str = "",
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        clauses = ["dataset=?"]
        params: list[Any] = [dataset]
        for column, value in (("service", service), ("severity", severity)):
            if value:
                clauses.append(f"{column}=?")
                params.append(value)
        for operator, boundary in ((">=", start), ("<=", end)):
            if boundary is not None:
                clauses.append(f"timestamp {operator} ?")
                params.append(utc_text(boundary))
        if message:
            clauses.append("instr(lower(message), lower(?)) > 0")
            params.append(message)
        where = " AND ".join(clauses)
        with self.connection() as db:
            db.execute("BEGIN")  # count and page come from one snapshot
            count = db.execute(f"SELECT count(*) FROM events WHERE {where}", params).fetchone()[0]
            rows = db.execute(
                f"SELECT * FROM events WHERE {where} ORDER BY timestamp DESC, sequence DESC "
                "LIMIT ? OFFSET ?",
                (*params, page_size, (page - 1) * page_size),
            ).fetchall()
        return {
            "dataset": dataset,
            "total": count,
            "page": page,
            "page_size": page_size,
            "events": [dict(row) | {"metadata": json.loads(row["metadata"])} for row in rows],
        }
