"""Durable minute evaluations. All reads used for a decision share its write transaction."""

import json
import math
import os
import sqlite3
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .models import EventInput, utc_text
from .store import Store

DetectionDataset = Literal["demo", "live"]
MINUTE = timedelta(minutes=1)


class DetectorConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, frozen=True)
    baseline_windows: int = Field(default=30, ge=1, le=1440)
    minimum_baseline_windows: int = Field(default=10, ge=1, le=1440)
    minimum_events: int = Field(default=20, ge=1)
    recovery_windows: int = Field(default=3, ge=1)
    smoothing: float = Field(default=0.5, gt=0)
    sigma: float = Field(default=3.0, gt=0)
    minimum_increase: float = Field(default=0.05, ge=0, le=1)
    grace_seconds: int = Field(default=10, ge=0, le=3600)
    poll_seconds: float = Field(default=1, gt=0, le=60)

    @model_validator(mode="after")
    def coherent_history(self) -> "DetectorConfig":
        if self.minimum_baseline_windows > self.baseline_windows:
            raise ValueError("minimum_baseline_windows must not exceed baseline_windows")
        return self

    @classmethod
    def from_environment(cls) -> "DetectorConfig":
        return cls.model_validate_json(os.environ.get("LOG_WATCHDOG_DETECTOR", "{}"))


def comparison(errors: int, total: int, sample: int, config: DetectorConfig) -> tuple[float, float]:
    """Smoothed prior proportion plus predictive sampling variation and an increase guard."""
    p = (errors + config.smoothing) / (total + 2 * config.smoothing)
    uncertainty = math.sqrt(p * (1 - p) * (1 / sample + 1 / (total + 2 * config.smoothing)))
    return p, min(1.0, max(p + config.sigma * uncertainty, p + config.minimum_increase))


def minute(value: datetime) -> datetime:
    return value.astimezone(UTC).replace(second=0, microsecond=0)


class Detector:
    def __init__(self, store: Store, config: DetectorConfig, now: datetime | None = None) -> None:
        self.store = store
        self.config = config
        now = now or datetime.now(UTC)
        with store.connection() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS evaluation_progress (
                    dataset TEXT PRIMARY KEY, next_start TEXT NOT NULL,
                    clock TEXT NOT NULL, steps INTEGER NOT NULL DEFAULT 0,
                    last_success TEXT
                );
                CREATE TABLE IF NOT EXISTS incidents (
                    id INTEGER PRIMARY KEY, dataset TEXT NOT NULL, service TEXT NOT NULL,
                    state TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
                    recovery_streak INTEGER NOT NULL DEFAULT 0, recovered_at TEXT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS one_open_incident
                    ON incidents(dataset,service) WHERE state='open';
                CREATE TABLE IF NOT EXISTS evaluations (
                    id INTEGER PRIMARY KEY, dataset TEXT NOT NULL, service TEXT NOT NULL,
                    start TEXT NOT NULL, end TEXT NOT NULL, total INTEGER NOT NULL,
                    errors INTEGER NOT NULL, rate REAL, expected REAL, threshold REAL,
                    baseline_total INTEGER NOT NULL, baseline_errors INTEGER NOT NULL,
                    baseline_count INTEGER NOT NULL, baseline_member INTEGER NOT NULL,
                    status TEXT NOT NULL, incident_id INTEGER, watermark INTEGER NOT NULL,
                    config TEXT NOT NULL, evaluated_at TEXT NOT NULL,
                    UNIQUE(dataset,service,start)
                );
                CREATE INDEX IF NOT EXISTS evaluation_history
                    ON evaluations(dataset,service,start DESC);
            """)
            db.execute("BEGIN IMMEDIATE")
            seed = db.execute("SELECT value FROM settings WHERE key='demo_seeded'").fetchone()
            end = datetime.fromisoformat(seed[0]) if seed else datetime(2026, 1, 1, 12, tzinfo=UTC)
            for dataset, start, clock in (
                ("demo", end - 30 * MINUTE, end + timedelta(seconds=config.grace_seconds)),
                ("live", minute(now), now),
            ):
                db.execute(
                    "INSERT OR IGNORE INTO evaluation_progress(dataset,next_start,clock) "
                    "VALUES (?,?,?)",
                    (dataset, utc_text(start), utc_text(clock)),
                )
        self.evaluate("demo", self.clock())

    def clock(self) -> datetime:
        with self.store.connection() as db:
            return datetime.fromisoformat(
                db.execute("SELECT clock FROM evaluation_progress WHERE dataset='demo'").fetchone()[
                    0
                ]
            )

    def evaluate(self, dataset: DetectionDataset, now: datetime) -> int:
        if dataset not in ("demo", "live"):
            raise ValueError("Historical data is not eligible for detection")
        with self.store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            return self._evaluate(db, dataset, now)

    def _evaluate(self, db: sqlite3.Connection, dataset: DetectionDataset, now: datetime) -> int:
        progress = db.execute(
            "SELECT * FROM evaluation_progress WHERE dataset=?", (dataset,)
        ).fetchone()
        start = datetime.fromisoformat(progress["next_start"])
        cutoff = minute(now - timedelta(seconds=self.config.grace_seconds))
        processed = 0
        # Bound restart catch-up per transaction. The worker continues on its next tick.
        while start < cutoff and processed < 240:
            end = start + MINUTE
            services = db.execute(
                "SELECT DISTINCT service FROM events WHERE dataset=? AND timestamp<? "
                "UNION SELECT DISTINCT service FROM evaluations WHERE dataset=?",
                (dataset, utc_text(end), dataset),
            ).fetchall()
            watermark = db.execute("SELECT COALESCE(MAX(sequence),0) FROM events").fetchone()[0]
            for row in services:
                self._window(db, dataset, row[0], start, end, watermark, now)
            start = end
            processed += 1
        db.execute(
            "UPDATE evaluation_progress SET next_start=?,last_success=? WHERE dataset=?",
            (utc_text(start), utc_text(now), dataset),
        )
        return processed

    def _window(
        self,
        db: sqlite3.Connection,
        dataset: str,
        service: str,
        start: datetime,
        end: datetime,
        watermark: int,
        now: datetime,
    ) -> None:
        c = self.config
        total, errors = db.execute(
            "SELECT COUNT(*),COALESCE(SUM(severity IN ('ERROR','FATAL')),0) FROM events "
            "WHERE dataset=? AND service=? AND timestamp>=? AND timestamp<? AND sequence<=?",
            (dataset, service, utc_text(start), utc_text(end), watermark),
        ).fetchone()
        history = db.execute(
            "SELECT total,errors FROM evaluations WHERE dataset=? AND service=? "
            "AND baseline_member=1 ORDER BY start DESC LIMIT ?",
            (dataset, service, c.baseline_windows),
        ).fetchall()
        baseline_total = sum(row[0] for row in history)
        baseline_errors = sum(row[1] for row in history)
        incident = db.execute(
            "SELECT * FROM incidents WHERE dataset=? AND service=? AND state='open'",
            (dataset, service),
        ).fetchone()
        expected = threshold = None
        status = "insufficient traffic"
        if total >= c.minimum_events:
            status = "learning baseline"
            if len(history) >= c.minimum_baseline_windows:
                expected, threshold = comparison(baseline_errors, baseline_total, total, c)
                status = "spike detected" if errors / total > threshold else "no spike detected"
        member = incident is None and status in ("learning baseline", "no spike detected")
        incident_id = incident["id"] if incident else None
        if status == "spike detected" and incident is None:
            incident_id = db.execute(
                "INSERT INTO incidents(dataset,service,state,start,end) VALUES (?,?,'open',?,?)",
                (dataset, service, utc_text(start), utc_text(end)),
            ).lastrowid
        elif incident:
            streak = incident["recovery_streak"] + 1 if status == "no spike detected" else 0
            recovered = streak >= c.recovery_windows
            db.execute(
                "UPDATE incidents SET end=?,recovery_streak=?,state=?,recovered_at=? WHERE id=?",
                (
                    utc_text(end),
                    streak,
                    "recovered" if recovered else "open",
                    utc_text(end) if recovered else None,
                    incident_id,
                ),
            )
        db.execute(
            "INSERT INTO evaluations(dataset,service,start,end,total,errors,rate,"
            "expected,threshold,"
            "baseline_total,baseline_errors,baseline_count,baseline_member,status,incident_id,"
            "watermark,config,evaluated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                dataset,
                service,
                utc_text(start),
                utc_text(end),
                total,
                errors,
                errors / total if total else None,
                expected,
                threshold,
                baseline_total,
                baseline_errors,
                len(history),
                int(member),
                status,
                incident_id,
                watermark,
                c.model_dump_json(),
                utc_text(now),
            ),
        )

    def advance(self) -> dict[str, Any]:
        with self.store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            progress = db.execute(
                "SELECT * FROM evaluation_progress WHERE dataset='demo'"
            ).fetchone()
            clock = datetime.fromisoformat(progress["clock"])
            start = datetime.fromisoformat(progress["next_start"])
            step = progress["steps"] + 1
            events = [
                EventInput(
                    event_id=f"simulation-{step}-{service}-{index}",
                    timestamp=start + timedelta(seconds=index),
                    service=service,
                    severity="ERROR"
                    if service == "checkout" and step <= 2 and index < 16
                    else "INFO",
                    message="Downstream timeout"
                    if service == "checkout" and step <= 2 and index < 16
                    else f"{service}: operation completed",
                    metadata={"synthetic": True},
                )
                for service in ("api-gateway", "checkout", "worker")
                for index in range(40)
            ]
            self.store._ingest(db, "demo", events)
            clock = start + MINUTE + timedelta(seconds=self.config.grace_seconds)
            db.execute(
                "UPDATE evaluation_progress SET clock=?,steps=? WHERE dataset='demo'",
                (utc_text(clock), step),
            )
            self._evaluate(db, "demo", clock)
        return self.overview("demo")

    def overview(self, dataset: DetectionDataset) -> dict[str, Any]:
        with self.store.connection() as db:
            db.execute("BEGIN")
            progress = dict(
                db.execute(
                    "SELECT * FROM evaluation_progress WHERE dataset=?", (dataset,)
                ).fetchone()
            )
            services = [
                dict(row)
                for row in db.execute(
                    "SELECT e.* FROM evaluations e WHERE dataset=? AND id=(SELECT MAX(id) "
                    "FROM evaluations WHERE dataset=e.dataset AND service=e.service) "
                    "ORDER BY service",
                    (dataset,),
                )
            ]
            incidents = [
                dict(row)
                for row in db.execute(
                    "SELECT * FROM incidents WHERE dataset=? ORDER BY (state='open') DESC,id DESC",
                    (dataset,),
                )
            ]
            for incident in incidents:
                incident["measurement"] = dict(
                    db.execute(
                        "SELECT * FROM evaluations WHERE incident_id=? AND status='spike detected' "
                        "ORDER BY id DESC LIMIT 1",
                        (incident["id"],),
                    ).fetchone()
                )
            trends = [
                dict(row)
                for row in db.execute(
                    "SELECT * FROM evaluations WHERE dataset=? AND start>=? ORDER BY start,service",
                    (
                        dataset,
                        utc_text(datetime.fromisoformat(progress["next_start"]) - 30 * MINUTE),
                    ),
                )
            ]
        for entry in [*services, *trends, *(i["measurement"] for i in incidents)]:
            entry["config"] = json.loads(entry["config"])
        now = datetime.now(UTC)
        delayed = dataset == "live" and now >= datetime.fromisoformat(
            progress["next_start"]
        ) + 2 * MINUTE + timedelta(seconds=self.config.grace_seconds)
        return {
            "dataset": dataset,
            "progress": progress,
            "services": services,
            "incidents": incidents,
            "trends": trends,
            "config": self.config.model_dump(),
            "delayed": delayed,
            "server_time": utc_text(now),
        }
