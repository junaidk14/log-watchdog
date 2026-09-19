import json
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from log_watchdog.app import create_app
from log_watchdog.detector import Detector, DetectorConfig
from log_watchdog.historical import MAX_UPLOAD_BYTES
from log_watchdog.store import Store


def event(**changes):
    return (
        dict(
            timestamp="2026-01-01T12:00:00Z",
            service="checkout",
            severity="INFO",
            message="Synthetic import",
            event_id="import-1",
        )
        | changes
    )


@pytest.fixture
def client(tmp_path):
    # No background clock: imported evidence is exercised with deterministic evaluation below.
    return TestClient(create_app(tmp_path / "history.sqlite3"))


def upload(client, events):
    return client.post(
        "/api/historical/upload",
        content=json.dumps(events).encode(),
        headers={"Content-Type": "application/json"},
    )


@pytest.mark.parametrize(
    "media_type",
    [None, "text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "text/json"],
)
def test_upload_rejects_unsupported_media_types_without_inserting(client, media_type):
    headers = {"Origin": "https://untrusted.example"}
    if media_type is not None:
        headers["Content-Type"] = media_type
    result = client.post(
        "/api/historical/upload", content=json.dumps([event()]).encode(), headers=headers
    )
    assert result.status_code == 415
    assert client.get("/api/datasets/historical/events").json()["total"] == 0


@pytest.mark.parametrize("media_type", ["application/json", "Application/JSON; charset=utf-8"])
def test_dashboard_json_upload_succeeds(client, media_type):
    result = client.post(
        "/api/historical/upload",
        content=json.dumps([event()]).encode(),
        headers={"Content-Type": media_type, "Origin": "http://testserver"},
    )
    assert result.status_code == 200
    assert result.json()["inserted"] == 1


@pytest.mark.parametrize("stored", [False, True])
@pytest.mark.parametrize("new_prefix", [False, True])
def test_conflicting_duplicate_reports_offending_row_and_rolls_back(client, stored, new_prefix):
    if stored:
        assert upload(client, [event()]).json()["inserted"] == 1
    before = client.get("/api/datasets/historical/events").json()
    prefix = [event(event_id="before")] if new_prefix else []
    result = upload(client, prefix + [event(), event(message="changed"), event(event_id="after")])
    assert result.status_code == 409
    assert result.json()["detail"] == (
        f"Row {len(prefix) + 2}: event_id conflicts with different content. No events imported."
    )
    assert client.get("/api/datasets/historical/events").json() == before


def test_upload_limits_are_inclusive_and_atomic(client):
    body = json.dumps([event()]).encode()
    exact = body + b" " * (MAX_UPLOAD_BYTES - len(body))
    headers = {"Content-Type": "application/json"}
    assert (
        client.post("/api/historical/upload", content=exact, headers=headers).json()["inserted"]
        == 1
    )
    assert (
        client.post("/api/historical/upload", content=exact + b" ", headers=headers).status_code
        == 413
    )
    assert upload(client, [event()] * 5000).json()["duplicates"] == 5000
    assert upload(client, [event(event_id="new")] * 5001).status_code == 422
    assert client.get("/api/datasets/historical/events").json()["total"] == 1


@pytest.mark.parametrize(
    "payload",
    [b"", b"{", b"\xff", b"[" * 2000, b"{}", b"[]", b"[" + b"9" * 5000 + b"]"],
    ids=["empty", "syntax", "encoding", "nesting", "object", "no-events", "large-integer"],
)
def test_malformed_empty_or_wrong_shape(client, payload):
    result = client.post(
        "/api/historical/upload", content=payload, headers={"Content-Type": "application/json"}
    )
    assert result.status_code == 422
    assert client.get("/api/datasets/historical/events").json()["total"] == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"timestamp": "yesterday"},
        {"timestamp": "2026-01-01T12:00:00"},
        {"severity": "WARN"},
        {"service": " "},
        {"message": ""},
        {"event_id": ""},
        {"metadata": []},
        {"metadata": {"x": float("nan")}},
        {"surprise": "secret-test-value"},
    ],
)
def test_shared_schema_row_field_feedback_without_log_reflection(client, changes):
    result = upload(client, [event(), event(**changes)])
    assert result.status_code == 422
    assert result.json()["detail"][0]["loc"][:2] == ["events", 1]
    assert "input" not in result.json()["detail"][0]
    assert "secret-test-value" not in result.text
    assert client.get("/api/datasets/historical/events").json()["total"] == 0


def test_feedback_is_bounded(client):
    result = upload(client, [event(severity="bad")] * 5000)
    assert len(result.json()["detail"]) == 100


def test_ids_conflict_rollback_and_restart(tmp_path):
    path = tmp_path / "restart.sqlite3"
    client = TestClient(create_app(path))
    assert upload(client, [event(), event()]).json()["duplicates"] == 1
    equivalent = event(timestamp="2026-01-01T17:30:00+05:30")
    assert upload(client, [equivalent]).json()["duplicates"] == 1
    conflict = upload(client, [event(event_id="new"), event(message="changed")])
    assert conflict.status_code == 409
    assert "Row 2" in conflict.json()["detail"]
    generated = upload(client, [event(event_id=None), event(event_id=None)]).json()
    assert len(set(generated["event_ids"])) == 2
    assert upload(client, [event(event_id=None)]).json()["inserted"] == 1
    # Identical IDs in a different dataset do not conflict or overwrite.
    assert (
        client.post(
            "/api/datasets/live/events", json={"events": [event(message="live")]}
        ).status_code
        == 200
    )
    restarted = TestClient(create_app(path))
    assert restarted.get("/api/datasets/historical/events").json()["total"] == 4
    assert restarted.get("/api/datasets/live/events").json()["events"][0]["message"] == "live"
    assert restarted.get("/api/historical/trends").json()["total"] == 4


def test_trends_filters_denominator_gaps_precision_and_dataset_isolation(client):
    assert client.get("/api/historical/trends").json()["buckets"] == []
    upload(
        client,
        [
            event(),
            event(event_id="2", severity="ERROR"),
            event(event_id="3", severity="FATAL", timestamp="2026-01-01T12:02:59.999999Z"),
            event(event_id="4", service="worker"),
        ],
    )
    client.post("/api/datasets/live/events", json={"events": [event(severity="ERROR")]})
    data = client.get("/api/historical/trends", params={"service": "checkout"}).json()
    assert data["bucket_seconds"] == 60
    assert data["total"] == 3
    assert [row["rate"] for row in data["buckets"]] == [0.5, None, 1]
    assert [row["total"] for row in data["buckets"]] == [2, 0, 1]
    assert client.get("/api/historical/trends").json()["total"] == 4
    filtered = client.get(
        "/api/historical/trends",
        params={
            "service": "checkout",
            "start": "2026-01-01T12:02:59.999999Z",
            "end": "2026-01-01T12:02:59.999999Z",
        },
    ).json()
    assert filtered["total"] == 1
    assert client.get("/api/historical/trends", params={"service": "absent"}).json()["total"] == 0
    assert client.get("/api/historical/trends", params={"start": "wrong"}).status_code == 422
    assert (
        client.get(
            "/api/historical/trends",
            params={"start": "2027-01-01T00:00:00Z", "end": "2026-01-01T00:00:00Z"},
        ).status_code
        == 422
    )


def test_trends_long_intervals_stay_bounded(client):
    upload(
        client,
        [
            event(timestamp="0001-01-01T00:00:00Z"),
            event(event_id="last", timestamp="9999-12-31T23:59:59.999999Z"),
        ],
    )
    result = client.get("/api/historical/trends")
    assert result.status_code == 200
    data = result.json()
    assert len(data["buckets"]) <= 30
    assert data["total"] == 2


def test_upload_does_not_train_detect_or_notify(client):
    store = client.app.state.store
    detector = Detector(store, DetectorConfig())
    start = datetime(2026, 1, 1, 12, tzinfo=UTC)
    with store.connection() as db:
        db.execute(
            "UPDATE evaluation_progress SET next_start=? WHERE dataset='live'",
            ("2026-01-01T12:00:00.000000Z",),
        )
    with store.connection() as db:
        before = {
            table: [tuple(row) for row in db.execute(f"SELECT * FROM {table}")]
            for table in ("evaluations", "incidents", "deliveries")
        }
    upload(client, [event(event_id=f"error-{i}", severity="ERROR") for i in range(40)])
    assert detector.evaluate("live", start + timedelta(minutes=1, seconds=10)) == 1
    with store.connection() as db:
        after = {
            table: [tuple(row) for row in db.execute(f"SELECT * FROM {table}")] for table in before
        }
    assert before == after
    assert client.get("/api/datasets/historical/overview").status_code == 422
    with pytest.raises(ValueError):
        detector.evaluate("historical", start)
    assert Store(store.path).browse("historical")["total"] == 40
