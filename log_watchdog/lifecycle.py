"""Seven-day cleanup and atomic Demo reset; real delivery work is serialized with reset."""

import sqlite3
from datetime import UTC, datetime, timedelta
from typing import Any

from .detector import Detector
from .evidence import EvidenceUnavailable
from .models import utc_text


class Lifecycle:
    def __init__(self, detector: Detector) -> None:
        self.detector = detector
        self.store = detector.store

    @staticmethod
    def _delete_deliveries(db: sqlite3.Connection, predicate: str, params: tuple[Any, ...]) -> None:
        for table in ("delivery_attempts", "receiver_receipts"):
            db.execute(
                f"DELETE FROM {table} WHERE delivery_id IN "
                f"(SELECT id FROM deliveries WHERE {predicate})",
                params,
            )
        db.execute(f"DELETE FROM deliveries WHERE {predicate}", params)

    def cleanup(self, now: datetime | None = None) -> dict[str, int]:
        now = now or datetime.now(UTC)
        counts = {"events": 0, "incidents": 0, "evaluations": 0}
        with self.store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            # Capture existing maxima on upgrade, before any deletes.
            for table, column in (
                ("events", "sequence"),
                ("incidents", "id"),
                ("evaluations", "id"),
            ):
                self.store.reserve_ids(db, table, column, 0)
            demo_clock = db.execute(
                "SELECT clock FROM evaluation_progress WHERE dataset='demo'"
            ).fetchone()[0]
            for dataset in ("demo", "live", "historical"):
                clock = datetime.fromisoformat(demo_clock) if dataset == "demo" else now
                cutoff = utc_text(clock - timedelta(days=7))
                expired = (
                    "dataset=? AND state='recovered' AND recovered_at<? AND NOT EXISTS "
                    "(SELECT 1 FROM deliveries d WHERE d.incident_id=incidents.id "
                    "AND d.dataset=incidents.dataset AND d.state NOT IN ('delivered','exhausted'))"
                )
                self._delete_deliveries(
                    db,
                    f"incident_id IN (SELECT id FROM incidents WHERE {expired})",
                    (dataset, cutoff),
                )
                counts["incidents"] += db.execute(
                    f"DELETE FROM incidents WHERE {expired}", (dataset, cutoff)
                ).rowcount
                # Keep all windows belonging to retained investigations, plus the most recent
                # configured normal baseline members per service (metadata, not raw logs).
                counts["evaluations"] += db.execute(
                    "DELETE FROM evaluations WHERE dataset=? AND end<? "
                    "AND NOT EXISTS (SELECT 1 FROM incidents i WHERE i.id=evaluations.incident_id) "
                    "AND NOT (baseline_member=1 AND id IN (SELECT e.id FROM evaluations e "
                    "WHERE e.dataset=evaluations.dataset AND e.service=evaluations.service "
                    "AND e.baseline_member=1 ORDER BY e.start DESC LIMIT ?))",
                    (dataset, cutoff, self.detector.config.baseline_windows),
                ).rowcount
                counts["events"] += db.execute(
                    "DELETE FROM events WHERE dataset=? AND timestamp<? AND NOT EXISTS "
                    "(SELECT 1 FROM evaluations e JOIN incidents i ON i.id=e.incident_id "
                    "WHERE e.dataset=events.dataset AND e.service=events.service "
                    "AND events.timestamp>=e.start AND events.timestamp<e.end "
                    "AND events.sequence<=e.watermark)",
                    (dataset, cutoff),
                ).rowcount
        return counts

    def reset_demo(self, expected_run: str) -> dict[str, Any]:
        # Hold no SQLite transaction while waiting for an in-flight HTTP attempt.
        # The receiver uses only the DB lock, avoiding a worker -> receiver lock cycle.
        with self.store.delivery_lock, self.store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            run = db.execute("SELECT value FROM settings WHERE key='demo_run'").fetchone()[0]
            if run != expected_run:
                raise EvidenceUnavailable(
                    409, "This demo run was reset. Return to the current demo."
                )
            for table, column in (
                ("events", "sequence"),
                ("incidents", "id"),
                ("evaluations", "id"),
            ):
                self.store.reserve_ids(db, table, column, 0)
            self._delete_deliveries(db, "dataset='demo'", ())
            for table in ("events", "evaluations", "incidents", "evaluation_progress"):
                db.execute(f"DELETE FROM {table} WHERE dataset='demo'")
            db.execute("DELETE FROM settings WHERE key IN ('demo_seeded','demo_run')")
            db.execute("UPDATE settings SET value='success' WHERE key='receiver_behavior'")
            self.store._seed_demo(db)
            end = datetime.fromisoformat(
                db.execute("SELECT value FROM settings WHERE key='demo_seeded'").fetchone()[0]
            )
            clock = end + timedelta(seconds=self.detector.config.grace_seconds)
            db.execute(
                "INSERT INTO evaluation_progress(dataset,next_start,clock) VALUES ('demo',?,?)",
                (utc_text(end - timedelta(minutes=30)), utc_text(clock)),
            )
            self.detector._evaluate(db, "demo", clock)
        return self.detector.overview("demo")
