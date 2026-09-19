from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from log_watchdog.app import create_app
from log_watchdog.detector import Detector, DetectorConfig, comparison
from log_watchdog.models import EventInput
from log_watchdog.store import EventConflict, Store

START = datetime(2026, 1, 1, 12, tzinfo=UTC)


def make(tmp_path, **overrides):
    store = Store(tmp_path / "events.sqlite")
    store.seed_demo()
    return store, Detector(store, DetectorConfig(**overrides), now=START)


def ingest_window(store, offset, errors=0, count=40, dataset="live", service="checkout"):
    store.ingest(
        dataset,
        [
            EventInput(
                timestamp=START + timedelta(minutes=offset, seconds=i),
                service=service,
                severity="FATAL" if i < errors else "INFO",
                message="test",
            )
            for i in range(count)
        ],
    )


def tick(detector, offset):
    detector.evaluate("live", START + timedelta(minutes=offset + 1, seconds=10))
    return detector.overview("live")


def test_numerical_zero_history_and_small_sample():
    c = DetectorConfig()
    expected, threshold = comparison(0, 1200, 40, c)
    assert expected == pytest.approx(0.00041631973355537054)
    assert threshold == pytest.approx(0.05041631973355537)
    assert comparison(0, 200, 20, c) == pytest.approx((0.0024875621890547263, 0.05248756218905473))
    assert comparison(20, 200, 20, c)[1] > comparison(20, 200, 200, c)[1]
    assert comparison(0, 0, 1, c) == (0.5, 1)


def test_demo_group_recover_restart_and_frozen_baseline(tmp_path):
    store, detector = make(tmp_path)
    initial = detector.overview("demo")
    assert len(initial["services"]) == 3
    assert all(s["status"] == "no spike detected" for s in initial["services"])
    first = detector.advance()["incidents"][0]
    assert first["measurement"]["errors"] == 16
    assert first["measurement"]["total"] == 40
    assert first["measurement"]["baseline_count"] == 30
    second = detector.advance()["incidents"][0]
    assert second["id"] == first["id"]
    assert second["measurement"]["baseline_total"] == first["measurement"]["baseline_total"]
    assert detector.advance()["incidents"][0]["recovery_streak"] == 1
    restarted = Detector(Store(store.path), DetectorConfig(), now=START)
    assert restarted.overview("demo")["incidents"][0]["recovery_streak"] == 1
    assert restarted.advance()["incidents"][0]["state"] == "open"
    recovered = restarted.advance()["incidents"][0]
    assert recovered["state"] == "recovered" and recovered["recovery_streak"] == 3
    with store.connection() as db:
        assert (
            db.execute(
                "SELECT COUNT(*) FROM evaluations WHERE incident_id=? AND baseline_member=1",
                (first["id"],),
            ).fetchone()[0]
            == 0
        )
    assert detector.overview("live")["incidents"] == []


def test_warmup_grace_own_baseline_sparse_and_gap_recovery(tmp_path):
    store, detector = make(tmp_path, minimum_baseline_windows=2)
    ingest_window(store, 0)
    assert detector.evaluate("live", START + timedelta(minutes=1, seconds=9)) == 0
    first = tick(detector, 0)["services"][0]
    assert first["status"] == "learning baseline" and first["baseline_count"] == 0
    ingest_window(store, 1)
    assert tick(detector, 1)["services"][0]["baseline_count"] == 1
    ingest_window(store, 2, errors=20)
    assert tick(detector, 2)["incidents"][0]["state"] == "open"
    ingest_window(store, 3)
    assert tick(detector, 3)["incidents"][0]["recovery_streak"] == 1
    gap = tick(detector, 4)
    assert gap["services"][0]["status"] == "insufficient traffic"
    assert gap["services"][0]["rate"] is None
    assert gap["incidents"][0]["recovery_streak"] == 0
    ingest_window(store, 5, count=19)
    assert tick(detector, 5)["incidents"][0]["state"] == "open"
    ingest_window(store, 6)
    assert tick(detector, 6)["incidents"][0]["recovery_streak"] == 1
    ingest_window(store, 7, errors=20)
    assert tick(detector, 7)["incidents"][0]["recovery_streak"] == 0
    for offset in (8, 9, 10):
        ingest_window(store, offset)
        state = tick(detector, offset)
    assert state["incidents"][0]["state"] == "recovered"


def test_late_arrivals_provenance_idempotence_isolation(tmp_path):
    store, detector = make(tmp_path)
    original = detector.advance()["incidents"][0]["measurement"]
    ingest_window(store, 0, errors=40, dataset="demo")
    ingest_window(store, 0, errors=40, dataset="historical")
    detector.evaluate("demo", detector.clock())
    unchanged = detector.overview("demo")["incidents"][0]["measurement"]
    assert original == unchanged
    with store.connection() as db:
        membership = db.execute(
            "SELECT COUNT(*) FROM events WHERE dataset='demo' AND service=? "
            "AND timestamp>=? AND timestamp<? AND sequence<=?",
            (original["service"], original["start"], original["end"], original["watermark"]),
        ).fetchone()[0]
        assert membership == original["total"]
    assert store.browse("demo", service="checkout", start=START)["total"] == 80
    assert detector.overview("live")["services"] == []
    with pytest.raises(ValueError, match="Historical"):
        detector.evaluate("historical", START)


def test_config_and_new_service_isolation(tmp_path):
    for value in (
        {"smoothing": 0},
        {"sigma": float("nan")},
        {"minimum_baseline_windows": 31},
        {"minimum_events": 0},
    ):
        with pytest.raises(ValidationError):
            DetectorConfig(**value)
    store, detector = make(tmp_path, minimum_baseline_windows=1, recovery_windows=2)
    ingest_window(store, 0)
    tick(detector, 0)
    ingest_window(store, 1, errors=40, service="new-service")
    state = tick(detector, 1)
    assert state["incidents"] == []
    assert (
        next(s for s in state["services"] if s["service"] == "new-service")["status"]
        == "learning baseline"
    )


def test_atomic_advance_and_concurrent_requests(tmp_path):
    store, detector = make(tmp_path)
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: detector.advance(), range(2)))
    assert detector.overview("demo")["progress"]["steps"] == 2
    assert len(detector.overview("demo")["incidents"]) == 1
    store.ingest(
        "demo",
        [
            EventInput(
                event_id="simulation-3-checkout-0",
                timestamp=START,
                service="checkout",
                severity="INFO",
                message="conflict",
            )
        ],
    )
    before = detector.overview("demo")
    with pytest.raises(EventConflict):
        detector.advance()
    assert detector.overview("demo")["progress"] == before["progress"]
    with store.connection() as db:
        assert (
            db.execute(
                "SELECT COUNT(*) FROM events WHERE event_id LIKE 'simulation-3-api-gateway-%'"
            ).fetchone()[0]
            == 0
        )


def test_api_full_demo_path_and_historical_exclusion(tmp_path):
    app = create_app(tmp_path / "http.sqlite")
    with TestClient(app) as client:
        assert client.get("/api/datasets/historical/overview").status_code == 422
        assert client.get("/api/datasets/demo/overview").json()["incidents"] == []
        for _ in range(5):
            response = client.post("/api/demo/advance")
            assert response.status_code == 200
        assert response.json()["incidents"][0]["state"] == "recovered"
        assert client.get("/api/datasets/live/overview").json()["incidents"] == []
    restarted = create_app(tmp_path / "http.sqlite")
    with TestClient(restarted) as client:
        assert (
            client.get("/api/datasets/demo/overview").json()["incidents"][0]["state"] == "recovered"
        )


def test_nonzero_stable_history_and_restart_catchup(tmp_path):
    store, detector = make(tmp_path, minimum_baseline_windows=2)
    for offset in range(4):
        ingest_window(store, offset, errors=4)
        state = tick(detector, offset)
    assert state["incidents"] == []
    assert state["services"][0]["status"] == "no spike detected"
    ingest_window(store, 4, errors=30)
    restarted = Detector(Store(store.path), detector.config, now=START + timedelta(minutes=7))
    state = tick(restarted, 6)
    assert len(state["incidents"]) == 1
    assert state["incidents"][0]["state"] == "open"
    assert state["incidents"][0]["recovery_streak"] == 0
    assert state["services"][0]["status"] == "insufficient traffic"
    assert restarted.evaluate("live", START + timedelta(minutes=7, seconds=10)) == 0


def test_restart_higher_minimum_history_preserves_open_incident_recovery(tmp_path):
    store, detector = make(tmp_path, minimum_baseline_windows=1)
    ingest_window(store, 0)
    tick(detector, 0)
    ingest_window(store, 1, errors=20)
    opened = tick(detector, 1)["incidents"][0]
    assert opened["state"] == "open"
    assert opened["measurement"]["baseline_count"] == 1
    with store.connection() as db:
        original = [tuple(row) for row in db.execute("SELECT * FROM evaluations ORDER BY id")]

    store = Store(store.path)
    restarted = Detector(store, DetectorConfig(minimum_baseline_windows=2), now=START)
    for offset in (2, 3, 4):
        ingest_window(store, offset)
        state = tick(restarted, offset)
        current = state["services"][0]
        assert current["status"] == "no spike detected"
        assert current["baseline_count"] == 1
        assert current["baseline_member"] == 0
        assert current["config"]["minimum_baseline_windows"] == 2
        assert state["incidents"][0]["recovery_streak"] == offset - 1
    assert state["incidents"][0]["state"] == "recovered"
    assert state["incidents"][0]["measurement"] == opened["measurement"]
    with store.connection() as db:
        assert [
            tuple(row)
            for row in db.execute(
                "SELECT * FROM evaluations WHERE id<=? ORDER BY id", (original[-1][0],)
            )
        ] == original

    # The increased history requirement applies again after recovery.
    ingest_window(store, 5)
    assert tick(restarted, 5)["services"][0]["status"] == "learning baseline"
    ingest_window(store, 6)
    assert tick(restarted, 6)["services"][0]["status"] == "no spike detected"
