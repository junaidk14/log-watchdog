import json
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from log_watchdog.app import create_app
from log_watchdog.delivery import Delivery
from log_watchdog.lifecycle import Lifecycle
from log_watchdog.models import EventInput, utc_text


def setup(tmp_path):
    app = create_app(tmp_path / "lifecycle.sqlite")
    return app, TestClient(app), Lifecycle(app.state.detector)


def event(timestamp, event_id="probe"):
    return EventInput(
        event_id=event_id, timestamp=timestamp, service="checkout", severity="INFO", message="probe"
    )


def snapshot(store, dataset):
    with store.connection() as db:
        result = {}
        for table in ("events", "evaluations", "incidents", "evaluation_progress", "deliveries"):
            result[table] = [
                tuple(row)
                for row in db.execute(
                    f"SELECT * FROM {table} WHERE dataset=? ORDER BY rowid", (dataset,)
                )
            ]
        for table in ("delivery_attempts", "receiver_receipts"):
            result[table] = [
                tuple(row)
                for row in db.execute(
                    f"SELECT * FROM {table} WHERE delivery_id IN "
                    "(SELECT id FROM deliveries WHERE dataset=?) ORDER BY rowid",
                    (dataset,),
                )
            ]
        return result


def test_retention_protects_open_and_pending_then_expires_completed(tmp_path):
    app, client, lifecycle = setup(tmp_path)
    store = app.state.store
    opened = client.post("/api/demo/advance").json()
    incident = opened["incidents"][0]
    path = f"/api/datasets/demo/incidents/{incident['id']}/evidence"
    original = client.get(path).json()
    future = datetime(2026, 1, 10, 12, tzinfo=UTC)
    with store.connection() as db:
        db.execute(
            "UPDATE evaluation_progress SET clock=? WHERE dataset='demo'", (utc_text(future),)
        )
    store.ingest(
        "historical",
        [event(future - timedelta(days=8), "old"), event(future - timedelta(days=7), "edge")],
    )
    store.ingest("live", [event(future - timedelta(days=8))])
    result = lifecycle.cleanup(future)
    assert result["events"] > 0
    assert store.browse("historical")["events"][0]["event_id"] == "edge"
    assert store.browse("live")["total"] == 0
    retained = client.get(path).json()
    assert retained["evaluated_total"] == retained["retained_total"] == 40
    assert retained["patterns"] == original["patterns"]
    assert client.get(path, params={"message": "not present"}).json()["evidence_missing"] is False
    # Restore the scenario clock to advance recovery deterministically.
    with store.connection() as db:
        db.execute(
            "UPDATE evaluation_progress SET clock=? WHERE dataset='demo'",
            (opened["progress"]["clock"],),
        )
    for _ in range(4):
        recovered = client.post("/api/demo/advance").json()
    assert recovered["incidents"][0]["state"] == "recovered"
    with store.connection() as db:
        db.execute(
            "UPDATE evaluation_progress SET clock=? WHERE dataset='demo'", (utc_text(future),)
        )
    lifecycle.cleanup(future)
    assert client.get(path).status_code == 200  # pending notifications protect recovered evidence
    restarted = TestClient(create_app(store.path))
    assert restarted.get(path).json()["retained_total"] == 40
    deliveries = restarted.get("/api/datasets/demo/deliveries").json()["deliveries"]
    assert len(deliveries) == 2 and all(d["state"] == "pending" for d in deliveries)
    delivery = Delivery(store)
    for item in deliveries:
        status, _ = delivery.receive(
            item["id"], json.dumps(item["payload"], sort_keys=True).encode()
        )
        assert status == 200
    with store.connection() as db:
        db.execute("UPDATE deliveries SET state='delivered'")
    assert lifecycle.cleanup(future)["incidents"] == 1
    unavailable = client.get(path)
    assert unavailable.status_code == 404 and "no longer retained" in unavailable.text
    with store.connection() as db:
        for table in ("incidents", "deliveries", "delivery_attempts", "receiver_receipts"):
            assert db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] == 0
        assert (
            db.execute("SELECT COUNT(*) FROM evaluations WHERE incident_id IS NOT NULL").fetchone()[
                0
            ]
            == 0
        )
        assert (
            db.execute(
                "SELECT COUNT(*) FROM evaluations WHERE dataset='demo' AND baseline_member=1"
            ).fetchone()[0]
            == 90
        )


def test_reset_atomic_isolated_stale_run_and_reproducible(tmp_path):
    app, client, lifecycle = setup(tmp_path)
    store = app.state.store
    opened = client.post("/api/demo/advance").json()
    old = opened["incidents"][0]
    # Mirror detector-produced records to exercise every dataset-scoped reset boundary.
    with store.connection() as db:
        db.execute("DELETE FROM evaluation_progress WHERE dataset='live'")
        for table in ("events", "evaluations", "incidents", "evaluation_progress", "deliveries"):
            db.execute(f"UPDATE {table} SET dataset='live' WHERE dataset='demo'")
        db.execute("DELETE FROM settings WHERE key='demo_seeded'")
    store.seed_demo()
    from log_watchdog.detector import Detector

    Detector(store, app.state.detector.config)
    client.post("/api/demo/advance")
    store.ingest("historical", [event(datetime.now(UTC))])
    before = {dataset: snapshot(store, dataset) for dataset in ("live", "historical")}
    run = client.get("/api/datasets/demo/overview").json()["run"]
    assert client.post("/api/demo/reset", json={"run": run}).status_code == 422
    assert (
        client.post("/api/demo/reset", json={"run": run, "confirm_demo_only": False}).status_code
        == 422
    )
    reset = client.post("/api/demo/reset", json={"run": run, "confirm_demo_only": True})
    assert reset.status_code == 200
    fresh = reset.json()
    assert fresh["run"] != run and fresh["progress"]["steps"] == 0
    assert fresh["incidents"] == [] and all(
        s["status"] == "no spike detected" for s in fresh["services"]
    )
    assert store.browse("demo")["total"] == 3600
    assert {dataset: snapshot(store, dataset) for dataset in before} == before
    assert (
        client.post("/api/demo/reset", json={"run": run, "confirm_demo_only": True}).status_code
        == 409
    )
    stale = client.get(f"/api/datasets/demo/incidents/{old['id']}/evidence", params={"run": run})
    assert stale.status_code == 410 and "reset" in stale.text
    assert client.get("/api/datasets/demo/deliveries", params={"run": run}).status_code == 410
    again = client.post("/api/demo/advance").json()["incidents"][0]
    assert again["id"] > old["id"] and again["measurement"]["rate"] == 0.4
    for _ in range(4):
        final = client.post("/api/demo/advance").json()
    assert final["incidents"][0]["state"] == "recovered"


def test_reset_waits_for_claimed_http_and_rejects_old_receipt(tmp_path, monkeypatch):
    app, client, lifecycle = setup(tmp_path)
    overview = client.post("/api/demo/advance").json()
    delivery = Delivery(app.state.store)
    old = delivery.read("demo")["deliveries"][0]
    entered, release, resetting = threading.Event(), threading.Event(), threading.Event()

    class Connection:
        def __init__(self, *args, **kwargs):
            pass

        def request(self, *args):
            entered.set()
            assert release.wait(5)
            status, _ = delivery.receive(
                old["id"], json.dumps(old["payload"], sort_keys=True).encode()
            )
            assert status == 200

        def getresponse(self):
            return self

        status = 200

        def getheader(self, name):
            return None

        def read(self, size):
            return b"{}"

        def close(self):
            pass

    monkeypatch.setattr("log_watchdog.delivery.http.client.HTTPConnection", Connection)

    def reset():
        resetting.set()
        return lifecycle.reset_demo(overview["run"])

    with ThreadPoolExecutor(max_workers=2) as executor:
        sent = executor.submit(delivery.tick)
        assert entered.wait(5)
        result = executor.submit(reset)
        assert resetting.wait(5)
        assert not result.done()
        release.set()
        assert sent.result(timeout=5)
        assert result.result(timeout=5)["progress"]["steps"] == 0
    assert delivery.read("demo")["deliveries"] == []
    assert (
        delivery.receive(old["id"], json.dumps(old["payload"], sort_keys=True).encode())[0] == 400
    )
    with app.state.store.connection() as db:
        assert db.execute("SELECT COUNT(*) FROM delivery_attempts").fetchone()[0] == 0
        assert db.execute("SELECT COUNT(*) FROM receiver_receipts").fetchone()[0] == 0


def test_reset_rolls_back_on_seed_failure(tmp_path, monkeypatch):
    app, client, lifecycle = setup(tmp_path)
    overview = client.post("/api/demo/advance").json()
    before = snapshot(app.state.store, "demo")

    def fail(db):
        raise RuntimeError("seed failed")

    monkeypatch.setattr(app.state.store, "_seed_demo", fail)
    with pytest.raises(RuntimeError, match="seed failed"):
        lifecycle.reset_demo(overview["run"])
    assert snapshot(app.state.store, "demo") == before
    assert client.get("/api/datasets/demo/overview").json()["run"] == overview["run"]


def test_cleanup_does_not_reuse_watermarks_or_ids(tmp_path):
    app, client, lifecycle = setup(tmp_path)
    opened = client.post("/api/demo/advance").json()
    old = opened["incidents"][0]
    watermark = old["measurement"]["watermark"]
    with app.state.store.connection() as db:
        # Emulate an upgraded DB without persistent counters, then remove its largest events.
        db.execute("DELETE FROM settings WHERE key LIKE 'identity_%'")
        db.execute(
            "UPDATE evaluation_progress SET clock='2026-01-10T12:00:00.000000Z' "
            "WHERE dataset='demo'"
        )
    lifecycle.cleanup()
    app.state.store.ingest("demo", [event(datetime.fromisoformat(old["start"]), "late")])
    with app.state.store.connection() as db:
        assert (
            db.execute("SELECT sequence FROM events WHERE event_id='late'").fetchone()[0]
            > watermark
        )
    path = f"/api/datasets/demo/incidents/{old['id']}/evidence"
    assert client.get(path).json()["total"] == 40
    assert client.get(path, params={"scope": "all"}).json()["total"] == 41


def test_reset_serializes_with_demo_evaluation_and_stale_advance(tmp_path, monkeypatch):
    app, client, lifecycle = setup(tmp_path)
    detector = app.state.detector
    run = client.get("/api/datasets/demo/overview").json()["run"]
    entered, release, resetting = threading.Event(), threading.Event(), threading.Event()
    evaluate = detector._evaluate

    def paused(db, dataset, now):
        if (
            db.execute("SELECT steps FROM evaluation_progress WHERE dataset='demo'").fetchone()[0]
            == 1
        ):
            entered.set()
            assert release.wait(5)
        return evaluate(db, dataset, now)

    def reset():
        resetting.set()
        return lifecycle.reset_demo(run)

    monkeypatch.setattr(detector, "_evaluate", paused)
    with ThreadPoolExecutor(max_workers=2) as executor:
        advance = executor.submit(detector.advance, run)
        assert entered.wait(5)
        result = executor.submit(reset)
        assert resetting.wait(5)
        assert not result.done()
        release.set()
        advance.result(timeout=5)
        fresh = result.result(timeout=5)
    assert fresh["incidents"] == [] and fresh["progress"]["steps"] == 0
    assert client.post("/api/demo/advance", params={"run": run}).status_code == 409
    assert client.get("/api/datasets/demo/deliveries").json()["deliveries"] == []


def test_startup_cleanup_uses_real_clock_and_preserves_demo(tmp_path):
    app, client, _ = setup(tmp_path)
    old = datetime.now(UTC) - timedelta(days=8)
    recent = datetime.now(UTC) - timedelta(days=6)
    for dataset in ("live", "historical"):
        app.state.store.ingest(dataset, [event(old, "old"), event(recent, "recent")])
    with TestClient(create_app(app.state.store.path)) as restarted:
        for dataset in ("live", "historical"):
            result = restarted.get(f"/api/datasets/{dataset}/events").json()
            assert [row["event_id"] for row in result["events"]] == ["recent"]
        assert restarted.get("/api/datasets/demo/events").json()["total"] == 3600
