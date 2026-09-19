import json
import socket
import threading
import time
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
import uvicorn

from log_watchdog.app import create_app
from log_watchdog.delivery import Delivery
from log_watchdog.detector import Detector, DetectorConfig
from log_watchdog.store import Store


@pytest.fixture
def local(tmp_path: Path):
    app = create_app(tmp_path / "http.sqlite3")
    # Exercise the actual FastAPI receiver over TCP, with deterministic worker ticks.
    sock = socket.socket()
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("127.0.0.1", 8000))
    server = uvicorn.Server(uvicorn.Config(app, lifespan="off", log_level="error"))
    thread = threading.Thread(target=server.run, kwargs={"sockets": [sock]}, daemon=True)
    thread.start()
    deadline = time.monotonic() + 5
    while not server.started and time.monotonic() < deadline:
        time.sleep(0.01)
    assert server.started
    try:
        yield app.state.store, app.state.detector, Delivery(app.state.store)
    finally:
        server.should_exit = True
        thread.join(timeout=5)
        sock.close()
        assert not thread.is_alive()


def test_atomic_transitions_no_update_duplicates_and_isolation(tmp_path):
    store = Store(tmp_path / "test.sqlite3")
    store.seed_demo()
    detector = Detector(store, DetectorConfig())
    delivery = Delivery(store)
    with patch("log_watchdog.detector.enqueue", side_effect=RuntimeError("crash")):
        with pytest.raises(RuntimeError):
            detector.advance()
    assert detector.overview("demo")["incidents"] == []
    assert delivery.read("demo")["deliveries"] == []
    for _ in range(5):
        detector.advance()
    rows = delivery.read("demo")["deliveries"]
    assert {r["kind"] for r in rows} == {"opened", "recovered"}
    assert len(rows) == 2
    assert all(r["incident_state"] == "recovered" for r in rows)
    assert delivery.read("live")["deliveries"] == []
    assert delivery.read("historical")["deliveries"] == []
    with pytest.raises(ValueError):
        detector.evaluate("historical", datetime.now(UTC))
    Detector(Store(store.path), DetectorConfig())
    assert delivery.read("demo")["deliveries"] == rows
    from log_watchdog.evidence import EvidenceUnavailable

    with pytest.raises(EvidenceUnavailable, match="reset"):
        delivery.read("demo", run="old-run")
    with pytest.raises(EvidenceUnavailable, match="unavailable"):
        delivery.read("live", incident=rows[0]["incident_id"])


def test_actual_http_retry_schedule_does_not_follow_simulation(local):
    store, detector, delivery = local
    delivery.configure("fail-first-then-succeed")
    detector.advance()
    assert delivery.tick()
    first = delivery.read("demo")["deliveries"][0]
    assert first["state"] == "retry scheduled"
    assert first["attempts"][0]["status"] == 503
    assert first["attempts"][0]["duration_ms"] >= 0
    detector.advance()
    assert delivery.read("demo")["deliveries"][0]["next_retry"] == first["next_retry"]
    assert not delivery.tick()
    # Configuration is frozen per notification, including across restart.
    delivery.configure("always-fail")
    restarted = Delivery(Store(store.path))
    restarted.recover_interrupted()
    time.sleep(2.05)
    assert restarted.tick()
    row = restarted.read("demo")["deliveries"][0]
    assert row["state"] == "delivered"
    assert [a["status"] for a in row["attempts"]] == [503, 200]
    assert row["next_retry"] is None
    with store.connection() as db:
        payload = db.execute("SELECT payload FROM deliveries WHERE id=?", (row["id"],)).fetchone()[
            0
        ]
    # Same durable ID and bytes are recognized, even after reopening storage.
    response = httpx.post(
        "http://127.0.0.1:8000/api/receiver",
        content=payload,
        headers={"X-Delivery-ID": row["id"]},
        trust_env=False,
    )
    assert response.status_code == 200
    assert response.json()["duplicate"] is True
    assert (
        httpx.post(
            "http://127.0.0.1:8000/api/receiver",
            content="{}",
            headers={"X-Delivery-ID": row["id"]},
            trust_env=False,
        ).status_code
        == 400
    )


def test_actual_http_exhaustion_and_recovery_independence(local):
    _, detector, delivery = local
    delivery.configure("always-fail")
    detector.advance()
    assert delivery.tick()
    time.sleep(2.05)
    assert delivery.tick()
    second = delivery.read("demo")["deliveries"][0]
    delay = datetime.fromisoformat(second["next_retry"]) - datetime.fromisoformat(
        second["attempts"][-1]["finished_at"]
    )
    assert delay.total_seconds() == 5
    time.sleep(5.05)
    assert delivery.tick()
    row = delivery.read("demo")["deliveries"][0]
    assert row["state"] == "exhausted"
    assert row["attempts_used"] == 3 and row["next_retry"] is None
    assert [a["status"] for a in row["attempts"]] == [503, 503, 503]
    assert not delivery.tick()
    for _ in range(4):
        detector.advance()
    assert detector.overview("demo")["incidents"][0]["state"] == "recovered"
    assert len(delivery.read("demo")["deliveries"]) == 2


def test_crash_during_claim_consumes_attempt_and_resumes(local):
    store, detector, delivery = local
    detector.advance()
    # Simulate process termination after the claim commits and before HTTP finishes.
    with patch("http.client.HTTPConnection.request", side_effect=KeyboardInterrupt):
        with pytest.raises(KeyboardInterrupt):
            delivery.tick()
    restarted = Delivery(Store(store.path))
    restarted.recover_interrupted()
    row = restarted.read("demo")["deliveries"][0]
    assert row["state"] == "retry scheduled" and row["attempts_used"] == 1
    assert "outcome unknown" in row["attempts"][0]["error"]
    time.sleep(2.05)
    assert restarted.tick()
    row = restarted.read("demo")["deliveries"][0]
    assert row["state"] == "delivered" and row["attempts_used"] == 2
    assert len(row["attempts"]) == 2


def test_network_error_timeout_and_pending_restart(tmp_path):
    store = Store(tmp_path / "test.sqlite3")
    store.seed_demo()
    detector = Detector(store, DetectorConfig())
    detector.advance()
    restarted = Delivery(Store(store.path))
    restarted.recover_interrupted()
    with patch("http.client.HTTPConnection.request", side_effect=TimeoutError("bounded timeout")):
        assert restarted.tick()
    row = restarted.read("demo")["deliveries"][0]
    assert row["state"] == "retry scheduled"
    assert "TimeoutError" in row["attempts"][0]["error"]
    assert row["attempts"][0]["status"] is None
    # A claimed final attempt is exhausted on restart, never granted a fourth.
    with store.connection() as db:
        db.execute("UPDATE deliveries SET state='sending',attempts_used=3")
        db.execute(
            "INSERT INTO delivery_attempts(delivery_id,number,started_at) VALUES (?,3,?)",
            (row["id"], row["created_at"]),
        )
    restarted.recover_interrupted()
    assert restarted.read("demo")["deliveries"][0]["state"] == "exhausted"
    assert not restarted.tick()


def test_receiver_settings_validation_and_http_bounds(local):
    _, detector, delivery = local
    with httpx.Client(base_url="http://127.0.0.1:8000", trust_env=False) as client:
        assert (
            client.put(
                "/api/demo/receiver", json={"behavior": "external", "url": "https://example.com"}
            ).status_code
            == 422
        )
        assert client.post("/api/receiver", content="x" * 65537).status_code == 413
        assert client.put("/api/demo/receiver", json={"behavior": "success"}).status_code == 200
        detector.advance()
        row = delivery.read("demo")["deliveries"][0]
        assert json.dumps(row["payload"])
        assert client.get("/api/datasets/demo/deliveries?run=stale").status_code == 410
        assert client.get("/api/datasets/live/deliveries?incident=1").status_code == 404
        assert delivery.tick()
        assert (
            client.get("/api/datasets/demo/deliveries").json()["deliveries"][0]["state"]
            == "delivered"
        )
