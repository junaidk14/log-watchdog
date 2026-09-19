"""Real loopback HTTP, restart persistence, and bounded performance measurements.

Run from the repository root after building the frontend. Port 8000 must be free.
Only a temporary SQLite database is used. This does not edit application data.
"""

import json
import os
import platform
import socket
import statistics
import subprocess
import sys
import tempfile
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx


def main() -> None:
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind(("127.0.0.1", 8000))  # Refuse to run against an existing application.
    with tempfile.TemporaryDirectory(prefix="watchdog-validation-") as temporary:
        env = os.environ | {"LOG_WATCHDOG_DB": str(Path(temporary) / "validation.sqlite3")}
        log = Path(temporary) / "server.log"
        process = None
        with (
            log.open("w+") as output,
            httpx.Client(base_url="http://127.0.0.1:8000", timeout=30) as client,
        ):

            def start() -> subprocess.Popen[bytes]:
                child = subprocess.Popen(
                    [sys.executable, "-m", "log_watchdog"],
                    env=env,
                    stdout=output,
                    stderr=subprocess.STDOUT,
                )
                for _ in range(100):
                    if child.poll() is not None:
                        raise RuntimeError(log.read_text())
                    try:
                        if client.get("/api/health").status_code == 200:
                            return child
                    except httpx.ConnectError:
                        pass
                    time.sleep(0.05)
                child.terminate()
                child.wait(timeout=10)
                raise RuntimeError("Server did not become ready")

            try:
                process = start()
                assert client.get("/").status_code == 200
                index = client.get("/").text
                import re

                asset = re.search(r'src="(/assets/[^\"]+\.js)"', index)
                assert asset is not None
                assert client.get(asset.group(1)).status_code == 200
                assert client.get("/api/datasets/demo/events").json()["total"] == 3600

                started = time.perf_counter()
                for batch in range(100):
                    events = [
                        {
                            "event_id": f"bench-{batch}-{i}",
                            "timestamp": f"2026-01-01T12:{batch % 60:02}:{i % 60:02}Z",
                            "service": ("api-gateway", "checkout", "worker")[i % 3],
                            "severity": "ERROR" if i % 20 == 0 else "INFO",
                            "message": "Downstream timeout"
                            if i % 20 == 0
                            else "Operation completed",
                            "metadata": {"synthetic": True, "index": i},
                        }
                        for i in range(1000)
                    ]
                    response = client.post("/api/datasets/live/events", json={"events": events})
                    assert response.status_code == 200, response.text
                    assert response.json()["inserted"] == 1000
                bulk_seconds = time.perf_counter() - started
                assert client.get("/api/datasets/live/events").json()["total"] == 100000

                browse = {}
                for name, query in {
                    "first_page": {},
                    "deep_page_2000": {"page": 2000},
                    "service_severity_message": {
                        "service": "checkout",
                        "severity": "ERROR",
                        "message": "timeout",
                    },
                }.items():
                    durations = []
                    for _ in range(10):
                        started = time.perf_counter()
                        response = client.get("/api/datasets/live/events", params=query)
                        durations.append((time.perf_counter() - started) * 1000)
                        assert response.status_code == 200
                        assert response.json()["events"]
                    browse[name] = {
                        "median_ms": round(statistics.median(durations), 2),
                        "max_ms": round(max(durations), 2),
                    }

                ingestion = []
                started = time.perf_counter()
                for i in range(100):
                    time.sleep(max(0, started + i / 20 - time.perf_counter()))
                    sent = time.perf_counter()
                    response = client.post(
                        "/api/datasets/live/events",
                        json={
                            "events": [
                                {
                                    "timestamp": "2026-01-01T13:00:00Z",
                                    "service": "checkout",
                                    "severity": "INFO",
                                    "message": "Paced synthetic event",
                                }
                            ]
                        },
                    )
                    ingestion.append((time.perf_counter() - sent) * 1000)
                    assert response.status_code == 200
                    assert response.json()["inserted"] == 1
                paced_seconds = time.perf_counter() - started
                assert client.get("/api/datasets/live/events").json()["total"] == 100100
                process.terminate()
                process.wait(timeout=10)
                process = start()
                assert client.get("/api/datasets/live/events").json()["total"] == 100100
                assert client.get("/api/datasets/demo/events").json()["total"] == 3600
                assert client.get("/api/datasets/historical/events").json()["total"] == 0
                assert (
                    client.put(
                        "/api/demo/receiver", json={"behavior": "fail-first-then-succeed"}
                    ).status_code
                    == 200
                )
                states = []
                for step in range(5):
                    response = client.post("/api/demo/advance")
                    assert response.status_code == 200, response.text
                    incidents = response.json()["incidents"]
                    assert len(incidents) == 1
                    states.append((incidents[0]["state"], incidents[0]["recovery_streak"]))
                    if step == 0:
                        deadline = time.monotonic() + 5
                        while time.monotonic() < deadline:
                            pending = client.get("/api/datasets/demo/deliveries").json()[
                                "deliveries"
                            ][0]
                            if pending["state"] == "retry scheduled":
                                break
                            time.sleep(0.05)
                        assert pending["state"] == "retry scheduled"
                        assert pending["attempts"][0]["status"] == 503
                        process.terminate()
                        process.wait(timeout=10)
                        process = start()
                        deadline = time.monotonic() + 5
                        while time.monotonic() < deadline:
                            resumed = client.get("/api/datasets/demo/deliveries").json()[
                                "deliveries"
                            ][0]
                            if resumed["state"] == "delivered":
                                break
                            time.sleep(0.05)
                        assert resumed["id"] == pending["id"]
                        assert resumed["state"] == "delivered"
                        assert [a["status"] for a in resumed["attempts"]] == [503, 200]
                assert states == [
                    ("open", 0),
                    ("open", 0),
                    ("open", 1),
                    ("open", 2),
                    ("recovered", 3),
                ]
                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    notifications = client.get("/api/datasets/demo/deliveries").json()["deliveries"]
                    if all(d["state"] == "delivered" for d in notifications):
                        break
                    time.sleep(0.05)
                assert len(notifications) == 2
                assert {d["kind"] for d in notifications} == {"opened", "recovered"}
                assert all(d["state"] == "delivered" for d in notifications)
                assert client.get("/api/datasets/live/deliveries").json()["deliveries"] == []
                assert client.get("/api/datasets/historical/deliveries").json()["deliveries"] == []
                recorded = incidents[0]["measurement"]
                late = client.post(
                    "/api/datasets/demo/events",
                    json={
                        "events": [
                            {
                                "timestamp": recorded["start"],
                                "service": "checkout",
                                "severity": "ERROR",
                                "message": "Late synthetic timeout",
                                "event_id": "late-http-evidence",
                            }
                        ]
                    },
                )
                assert late.status_code == 200
                assert (
                    client.get("/api/datasets/demo/overview").json()["incidents"][0]["measurement"]
                    == recorded
                )
                evidence_url = f"/api/datasets/demo/incidents/{incidents[0]['id']}/evidence"
                evidence_params = {"evaluation": recorded["id"]}
                evaluated = client.get(evidence_url, params=evidence_params).json()
                assert evaluated["total"] == evaluated["evaluated_total"] == 40
                assert evaluated["measurement"] == recorded
                assert evaluated["patterns"] == [{"message": "Downstream timeout", "count": 16}]
                broader = client.get(evidence_url, params=evidence_params | {"scope": "all"}).json()
                assert broader["total"] == 41
                assert [e["event_id"] for e in broader["events"] if not e["included"]] == [
                    "late-http-evidence"
                ]
                assert (
                    client.get(evidence_url, params=evidence_params | {"severity": "ERROR"}).json()[
                        "total"
                    ]
                    == 16
                )
                assert (
                    client.get(
                        evidence_url,
                        params=evidence_params | {"event_id": evaluated["sample"][0]["event_id"]},
                    ).json()["total"]
                    == 1
                )
                process.terminate()
                process.wait(timeout=10)
                process = start()
                assert (
                    client.get("/api/datasets/demo/overview").json()["incidents"][0]["state"]
                    == "recovered"
                )
                assert client.get(evidence_url, params=evidence_params).json() == evaluated
                # Exercise the real background loop across one actual minute boundary.
                window = datetime.now(UTC).replace(second=0, microsecond=0)
                response = client.post(
                    "/api/datasets/live/events",
                    json={
                        "events": [
                            {
                                "timestamp": window.isoformat(),
                                "service": "http-worker-probe",
                                "severity": "INFO",
                                "message": "Synthetic real-clock worker check",
                                "event_id": f"worker-probe-{i}",
                            }
                            for i in range(40)
                        ]
                    },
                )
                assert response.status_code == 200
                deadline = time.monotonic() + 75
                worker_measurement = None
                while time.monotonic() < deadline:
                    overview = client.get("/api/datasets/live/overview").json()
                    worker_measurement = next(
                        (
                            row
                            for row in overview["services"]
                            if row["service"] == "http-worker-probe"
                        ),
                        None,
                    )
                    if worker_measurement:
                        break
                    time.sleep(0.5)
                assert worker_measurement is not None, "Real-clock worker did not evaluate"
                assert worker_measurement["total"] == 40
                assert worker_measurement["status"] == "learning baseline"
                assert datetime.fromisoformat(worker_measurement["end"]) == window + timedelta(
                    minutes=1
                )
                print(
                    json.dumps(
                        {
                            "delivery_http_restart": (
                                "503 then process restart then 200, same ID; "
                                "opening and recovery delivered"
                            ),
                            "demo_transitions": states,
                            "late_evidence_unchanged": True,
                            "evidence_navigation_http": (
                                "40 evaluated / 41 broader; filters, sample, restart passed"
                            ),
                            "incident_restart": "recovered",
                            "real_clock_worker": worker_measurement["status"],
                            "python": platform.python_version(),
                            "platform": platform.platform(),
                            "bulk_events": 100000,
                            "bulk_seconds": round(bulk_seconds, 3),
                            "browse_10_requests_each": browse,
                            "paced_events": 100,
                            "target_events_per_second": 20,
                            "paced_seconds": round(paced_seconds, 3),
                            "paced_ingest_median_ms": round(statistics.median(ingestion), 2),
                            "paced_ingest_max_ms": round(max(ingestion), 2),
                            "restart_live_events": 100100,
                            "demo_events": 3600,
                            "historical_events": 0,
                            "dashboard_and_asset_http": "passed",
                        },
                        indent=2,
                    )
                )
            finally:
                if process is not None and process.poll() is None:
                    process.terminate()
                    process.wait(timeout=10)


if __name__ == "__main__":
    main()
