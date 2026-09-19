"""Read incident evidence from the detector's immutable evaluation provenance."""

import json
import sqlite3
from typing import Any

from .store import Store


class EvidenceUnavailable(Exception):
    def __init__(self, status: int, message: str) -> None:
        self.status = status
        self.message = message


class Evidence:
    def __init__(self, store: Store) -> None:
        self.store = store

    def read(
        self,
        dataset: str,
        incident_id: int,
        *,
        evaluation: int | None = None,
        run: str | None = None,
        scope: str = "evaluated",
        severity: str | None = None,
        message: str = "",
        event_id: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        with self.store.connection() as db:
            db.execute("BEGIN")
            run_id = db.execute("SELECT value FROM settings WHERE key='demo_run'").fetchone()[0]
            if dataset == "demo" and run is not None and run != run_id:
                raise EvidenceUnavailable(
                    410, "This demo run was reset. Return to the current demo."
                )
            incident = db.execute(
                "SELECT * FROM incidents WHERE dataset=? AND id=?", (dataset, incident_id)
            ).fetchone()
            if incident is None:
                raise EvidenceUnavailable(
                    404, "Incident unavailable in this dataset or no longer retained."
                )
            windows = db.execute(
                "SELECT * FROM evaluations WHERE dataset=? AND incident_id=? ORDER BY start",
                (dataset, incident_id),
            ).fetchall()
            selected = next((w for w in windows if w["id"] == evaluation), None)
            if evaluation is None:
                selected = next(
                    (w for w in reversed(windows) if w["status"] == "spike detected"), None
                )
            if selected is None:
                raise EvidenceUnavailable(404, "Evaluated window unavailable for this incident.")
            base = "dataset=? AND service=? AND timestamp>=? AND timestamp<?"
            params = [dataset, incident["service"], selected["start"], selected["end"]]
            evaluated = base + " AND sequence<=?"
            included = [*params, selected["watermark"]]
            retained = db.execute(
                f"SELECT COUNT(*) FROM events WHERE {evaluated}", included
            ).fetchone()[0]
            clauses = [base if scope == "all" else evaluated]
            filtered = list(params if scope == "all" else included)
            for field, value in (("severity", severity), ("event_id", event_id)):
                if value:
                    clauses.append(f"{field}=?")
                    filtered.append(value)
            if message:
                clauses.append("instr(lower(message),lower(?))>0")
                filtered.append(message)
            where = " AND ".join(clauses)
            count = db.execute(f"SELECT COUNT(*) FROM events WHERE {where}", filtered).fetchone()[0]
            rows = db.execute(
                f"SELECT * FROM events WHERE {where} "
                "ORDER BY timestamp DESC,sequence DESC LIMIT ? OFFSET ?",
                (*filtered, page_size, (page - 1) * page_size),
            ).fetchall()
            patterns = db.execute(
                f"SELECT message,COUNT(*) AS count FROM events WHERE {evaluated} "
                "AND severity IN ('ERROR','FATAL') GROUP BY message "
                "ORDER BY count DESC,message LIMIT 10",
                included,
            ).fetchall()
            sample = db.execute(
                f"SELECT * FROM events WHERE {evaluated} ORDER BY "
                "(severity IN ('ERROR','FATAL')) DESC,timestamp,sequence LIMIT 5",
                included,
            ).fetchall()
            return {
                "deliveries": [
                    dict(row)
                    for row in db.execute(
                        "SELECT kind,state FROM deliveries WHERE dataset=? AND incident_id=? "
                        "ORDER BY created_at",
                        (dataset, incident_id),
                    )
                ],
                "dataset": dataset,
                "run": run_id if dataset == "demo" else None,
                "incident": dict(incident),
                "measurement": self.measurement(selected),
                "windows": [self.measurement(w) for w in windows],
                "scope": scope,
                "evaluated_total": selected["total"],
                "retained_total": retained,
                "evidence_missing": retained < selected["total"],
                "total": count,
                "page": page,
                "page_size": page_size,
                "events": [self.event(row, selected["watermark"]) for row in rows],
                "patterns": [dict(row) for row in patterns],
                "sample": [self.event(row, selected["watermark"]) for row in sample],
            }

    @staticmethod
    def event(row: sqlite3.Row, watermark: int) -> dict[str, Any]:
        return dict(row) | {
            "metadata": json.loads(row["metadata"]),
            "included": row["sequence"] <= watermark,
        }

    @staticmethod
    def measurement(row: sqlite3.Row) -> dict[str, Any]:
        return dict(row) | {"config": json.loads(row["config"])}
