"""Transactional notifications and bounded, real-time local HTTP delivery."""

import http.client
import json
import sqlite3
import time
from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict

from .evidence import EvidenceUnavailable
from .models import utc_text
from .store import Store

DESTINATION = "http://127.0.0.1:8000/api/receiver"
MAX_ATTEMPTS = 3
RETRY_DELAYS = (2, 5)
TIMEOUT = 2.0
Behavior = Literal["success", "fail-first-then-succeed", "always-fail"]


class ReceiverSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    behavior: Behavior


def initialize(db: sqlite3.Connection) -> None:
    db.executescript("""
        CREATE TABLE IF NOT EXISTS deliveries (
            id TEXT PRIMARY KEY, dataset TEXT NOT NULL, run TEXT,
            incident_id INTEGER NOT NULL, kind TEXT NOT NULL,
            created_at TEXT NOT NULL, payload TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'pending', attempts_used INTEGER NOT NULL DEFAULT 0,
            next_retry TEXT, behavior TEXT NOT NULL,
            UNIQUE(dataset,incident_id,kind)
        );
        CREATE TABLE IF NOT EXISTS delivery_attempts (
            delivery_id TEXT NOT NULL, number INTEGER NOT NULL, started_at TEXT NOT NULL,
            finished_at TEXT, status INTEGER, error TEXT, duration_ms REAL,
            duplicate INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(delivery_id,number)
        );
        CREATE TABLE IF NOT EXISTS receiver_receipts (
            delivery_id TEXT PRIMARY KEY, requests INTEGER NOT NULL, accepted INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO settings(key,value) VALUES ('receiver_behavior','success');
    """)


def enqueue(db: sqlite3.Connection, incident_id: int, kind: str, evaluation_id: int) -> None:
    incident = dict(db.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone())
    measurement = dict(
        db.execute("SELECT * FROM evaluations WHERE id=?", (evaluation_id,)).fetchone()
    )
    run = (
        db.execute("SELECT value FROM settings WHERE key='demo_run'").fetchone()[0]
        if incident["dataset"] == "demo"
        else None
    )
    behavior = (
        db.execute("SELECT value FROM settings WHERE key='receiver_behavior'").fetchone()[0]
        if incident["dataset"] == "demo"
        else "success"
    )
    delivery_id = str(uuid4())
    created = utc_text(datetime.now(UTC))
    payload = json.dumps(
        {
            "delivery_id": delivery_id,
            "kind": kind,
            "dataset": incident["dataset"],
            "run": run,
            "created_at": created,
            "incident": incident,
            "measurement": {
                key: measurement[key]
                for key in (
                    "id",
                    "start",
                    "end",
                    "total",
                    "errors",
                    "rate",
                    "expected",
                    "threshold",
                    "watermark",
                )
            },
        },
        sort_keys=True,
    )
    db.execute(
        "INSERT INTO deliveries(id,dataset,run,incident_id,kind,created_at,payload,behavior) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (delivery_id, incident["dataset"], run, incident_id, kind, created, payload, behavior),
    )


class Delivery:
    def __init__(self, store: Store) -> None:
        self.store = store

    def settings(self) -> str:
        with self.store.connection() as db:
            return str(
                db.execute("SELECT value FROM settings WHERE key='receiver_behavior'").fetchone()[0]
            )

    def configure(self, behavior: Behavior) -> None:
        with self.store.connection() as db:
            db.execute("UPDATE settings SET value=? WHERE key='receiver_behavior'", (behavior,))

    def read(
        self, dataset: str, incident: int | None = None, run: str | None = None
    ) -> dict[str, Any]:
        with self.store.connection() as db:
            db.execute("BEGIN")
            current_run = db.execute("SELECT value FROM settings WHERE key='demo_run'").fetchone()[
                0
            ]
            if dataset == "demo" and run is not None and run != current_run:
                raise EvidenceUnavailable(
                    410, "This demo run was reset. Return to the current demo."
                )
            if (
                incident is not None
                and db.execute(
                    "SELECT id FROM incidents WHERE dataset=? AND id=?", (dataset, incident)
                ).fetchone()
                is None
            ):
                raise EvidenceUnavailable(
                    404, "Incident unavailable in this dataset or no longer retained."
                )
            rows = db.execute(
                "SELECT d.*,i.service,i.state AS incident_state FROM deliveries d "
                "JOIN incidents i ON i.id=d.incident_id AND i.dataset=d.dataset "
                "WHERE d.dataset=? AND (? IS NULL OR d.incident_id=?) "
                "ORDER BY d.created_at DESC,d.id",
                (dataset, incident, incident),
            ).fetchall()
            deliveries = []
            for row in rows:
                item = dict(row)
                item["payload"] = json.loads(item["payload"])
                item["destination"] = DESTINATION
                item["attempts"] = [
                    dict(a)
                    for a in db.execute(
                        "SELECT * FROM delivery_attempts WHERE delivery_id=? ORDER BY number",
                        (row["id"],),
                    )
                ]
                deliveries.append(item)
            return {
                "deliveries": deliveries,
                "max_attempts": MAX_ATTEMPTS,
                "run": current_run if dataset == "demo" else None,
                "server_time": utc_text(datetime.now(UTC)),
            }

    def recover_interrupted(self) -> None:
        """Run once before the single worker starts. Claimed attempts consume budget."""
        now = datetime.now(UTC)
        with self.store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            for row in db.execute("SELECT * FROM deliveries WHERE state='sending'").fetchall():
                db.execute(
                    "UPDATE delivery_attempts SET finished_at=?,error=? "
                    "WHERE delivery_id=? AND number=? AND finished_at IS NULL",
                    (
                        utc_text(now),
                        "Process interrupted; HTTP outcome unknown",
                        row["id"],
                        row["attempts_used"],
                    ),
                )
                self._schedule(db, row["id"], row["attempts_used"], False, now)

    @staticmethod
    def _schedule(
        db: sqlite3.Connection, delivery_id: str, used: int, success: bool, now: datetime
    ) -> None:
        state = (
            "delivered" if success else "exhausted" if used >= MAX_ATTEMPTS else "retry scheduled"
        )
        retry = (
            utc_text(now + timedelta(seconds=RETRY_DELAYS[used - 1]))
            if state == "retry scheduled"
            else None
        )
        db.execute(
            "UPDATE deliveries SET state=?,next_retry=? WHERE id=?", (state, retry, delivery_id)
        )

    def tick(self) -> bool:
        now = datetime.now(UTC)
        with self.store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT * FROM deliveries WHERE state='pending' OR "
                "(state='retry scheduled' AND next_retry<=?) ORDER BY created_at,id LIMIT 1",
                (utc_text(now),),
            ).fetchone()
            if row is None:
                return False
            number = row["attempts_used"] + 1
            db.execute(
                "UPDATE deliveries SET state='sending',attempts_used=?,next_retry=NULL WHERE id=?",
                (number, row["id"]),
            )
            db.execute(
                "INSERT INTO delivery_attempts(delivery_id,number,started_at) VALUES (?,?,?)",
                (row["id"], number, utc_text(now)),
            )
        # Fixed endpoint, no proxies or redirect following; no database lock spans HTTP.
        started = time.monotonic()
        status = None
        error = None
        duplicate = False
        connection = http.client.HTTPConnection("127.0.0.1", 8000, timeout=TIMEOUT)
        try:
            connection.request(
                "POST",
                "/api/receiver",
                row["payload"].encode(),
                {
                    "Content-Type": "application/json",
                    "X-Delivery-ID": row["id"],
                },
            )
            response = connection.getresponse()
            status = response.status
            duplicate = response.getheader("X-Delivery-Duplicate") == "true"
            # The built-in receiver has a small response; never consume arbitrary bodies.
            response.read(4096)
            if not 200 <= status < 300:
                error = f"HTTP {status}"
        except (OSError, http.client.HTTPException) as exc:
            error = f"{type(exc).__name__}: {exc}"[:500]
        finally:
            connection.close()
        finished = datetime.now(UTC)
        with self.store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "UPDATE delivery_attempts SET finished_at=?,status=?,error=?,"
                "duration_ms=?,duplicate=? "
                "WHERE delivery_id=? AND number=?",
                (
                    utc_text(finished),
                    status,
                    error,
                    (time.monotonic() - started) * 1000,
                    int(duplicate),
                    row["id"],
                    number,
                ),
            )
            self._schedule(db, row["id"], number, error is None, finished)
        return True

    def receive(self, delivery_id: str, payload: bytes) -> tuple[int, bool]:
        with self.store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            delivery = db.execute("SELECT * FROM deliveries WHERE id=?", (delivery_id,)).fetchone()
            if delivery is None or payload != delivery["payload"].encode():
                return 400, False
            receipt = db.execute(
                "SELECT * FROM receiver_receipts WHERE delivery_id=?", (delivery_id,)
            ).fetchone()
            requests = receipt["requests"] + 1 if receipt else 1
            duplicate = bool(receipt and receipt["accepted"])
            success = (
                duplicate
                or delivery["behavior"] == "success"
                or (delivery["behavior"] == "fail-first-then-succeed" and requests > 1)
            )
            db.execute(
                "INSERT INTO receiver_receipts VALUES (?,?,?) ON CONFLICT(delivery_id) DO UPDATE "
                "SET requests=excluded.requests,accepted=excluded.accepted",
                (delivery_id, requests, int(success)),
            )
            return (200 if success else 503), duplicate
