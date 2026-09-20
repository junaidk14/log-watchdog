from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from log_watchdog.app import create_app


def event(**changes):
    return {
        "timestamp": "2026-01-01T12:00:00Z",
        "service": "checkout",
        "severity": "INFO",
        "message": "Order accepted",
        "metadata": {"order": 17},
        **changes,
    }


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "events.sqlite3")) as client:
        yield client


def post(client, events, dataset="live"):
    return client.post(f"/api/datasets/{dataset}/events", json={"events": events})


def get(client, dataset="live", **params):
    return client.get(f"/api/datasets/{dataset}/events", params=params)


def test_generated_ids_and_restart(tmp_path):
    path = tmp_path / "events.sqlite3"
    with TestClient(create_app(path)) as first:
        recent = event(timestamp=datetime.now(UTC).isoformat())
        result = post(first, [recent, recent]).json()
        assert result["inserted"] == 2
        assert len(set(result["event_ids"])) == 2
        assert get(first).json()["total"] == 2
        demo_count = get(first, "demo").json()["total"]
        assert demo_count == 3600
    with TestClient(create_app(path)) as restarted:
        assert get(restarted).json()["total"] == 2
        assert get(restarted, "demo").json()["total"] == demo_count
        assert set(get(restarted).json()["events"][0]) >= {"event_id", "metadata", "ingested_at"}


def test_deduplicate_canonical_content_and_dataset_isolation(client):
    supplied = event(event_id="same", metadata={"a": 1, "b": 2})
    assert post(client, [supplied]).json()["inserted"] == 1
    equivalent = {
        **supplied,
        "timestamp": "2026-01-01T17:30:00+05:30",
        "metadata": {"b": 2, "a": 1},
    }
    assert post(client, [equivalent, equivalent]).json()["duplicates"] == 2
    assert post(client, [event(event_id="same", message="demo only")], "demo").status_code == 200
    assert (
        post(client, [event(event_id="same", message="history only")], "historical").status_code
        == 200
    )
    assert get(client).json()["total"] == 1
    assert get(client).json()["events"][0]["timestamp"] == "2026-01-01T12:00:00.000000Z"
    assert get(client, "historical").json()["events"][0]["message"] == "history only"
    assert get(client, "demo", message="demo only").json()["total"] == 1
    assert get(client, "demo", message="Order accepted").json()["total"] == 0


def test_conflict_rolls_back_entire_batch(client):
    post(client, [event(event_id="existing")])
    response = post(client, [event(event_id="new"), event(event_id="existing", message="changed")])
    assert response.status_code == 409
    assert response.json()["detail"]["event_id"] == "existing"
    assert get(client).json()["total"] == 1
    response = post(client, [event(event_id="within"), event(event_id="within", severity="ERROR")])
    assert response.status_code == 409
    assert get(client).json()["total"] == 1


@pytest.mark.parametrize(
    "bad",
    [
        {"timestamp": "not a date"},
        {"timestamp": "2026-01-01T00:00:00"},
        {"timestamp": 123456},
        {"timestamp": "123456"},
        {"service": " "},
        {"service": 12},
        {"severity": "WARN"},
        {"message": ""},
        {"event_id": ""},
        {"metadata": []},
        {"metadata": {"x": "a" * 32769}},
        {"surprise": "not allowed"},
        {"message": "x" * 16385},
    ],
)
def test_invalid_event_rejects_whole_batch(client, bad):
    response = post(client, [event(), event(**bad)])
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][:3] == ["body", "events", 1]
    assert get(client).json()["total"] == 0


@pytest.mark.parametrize("missing", ["timestamp", "service", "severity", "message"])
def test_required_fields(client, missing):
    row = event()
    del row[missing]
    assert post(client, [row]).status_code == 422
    assert get(client).json()["total"] == 0


def test_empty_oversized_and_nonfinite_input(client):
    assert post(client, []).status_code == 422
    assert post(client, [event()] * 5001).status_code == 422
    response = client.post(
        "/api/datasets/live/events",
        content=(
            '{"events":[{"timestamp":"2026-01-01T12:00:00Z","service":"a",'
            '"severity":"INFO","message":"ok","metadata":{"v":NaN}}]}'
        ),
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422


def test_filters_literal_search_paging_and_order(client):
    rows = [
        event(
            event_id=str(i),
            timestamp=f"2026-01-01T12:00:{i:02}Z",
            severity="ERROR" if i % 2 else "INFO",
            service="checkout" if i < 8 else "worker",
            message="Literal 100% _complete" if i < 5 else "ordinary",
        )
        for i in range(12)
    ]
    assert post(client, rows).status_code == 200
    response = get(
        client,
        service="checkout",
        severity="ERROR",
        start="2026-01-01T12:00:01Z",
        end="2026-01-01T12:00:03Z",
    ).json()
    assert response["total"] == 2
    assert [e["event_id"] for e in response["events"]] == ["3", "1"]
    assert get(client, message="100% _COMPLETE").json()["total"] == 5
    assert get(client, message="' OR 1=1 --").json()["total"] == 0
    first = get(client, page_size=5).json()
    second = get(client, page_size=5, page=2).json()
    assert first["total"] == second["total"] == 12
    assert {e["event_id"] for e in first["events"]}.isdisjoint(
        e["event_id"] for e in second["events"]
    )
    assert get(client, page=30).json()["events"] == []
    assert get(client, "historical").json()["total"] == 0


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page_size": 101},
        {"page": "bad"},
        {"severity": "warn"},
        {"start": "2026-01-01"},
        {"start": "2026-01-02T00:00:00Z", "end": "2026-01-01T00:00:00Z"},
    ],
)
def test_bad_filters(client, params):
    assert get(client, **params).status_code == 422


def test_dataset_and_host_validation(client):
    assert get(client, "other").status_code == 422
    assert post(client, [event()], "other").status_code == 422
    assert client.get("/api/health", headers={"host": "evil.example"}).status_code == 400
    assert client.get("/api/missing").status_code == 404


def test_shared_seed_and_missing_build(tmp_path):
    with TestClient(create_app(tmp_path / "db.sqlite3", tmp_path / "missing")) as client:
        assert client.get("/").status_code == 503
        for service in ["api-gateway", "checkout", "worker"]:
            data = get(client, "demo", service=service).json()
            assert data["total"] == 1200
            assert all(row["metadata"]["synthetic"] for row in data["events"])
        assert get(client, "demo", severity="ERROR").json()["total"] == 0


def test_built_dashboard(tmp_path):
    build = Path(__file__).resolve().parent.parent / "frontend" / "dist"
    assert (build / "index.html").is_file(), "Run npm --prefix frontend run build before pytest"
    with TestClient(create_app(tmp_path / "db.sqlite3", build)) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert "Log Watchdog" in response.text
        asset = next((build / "assets").glob("*.js"))
        assert client.get(f"/assets/{asset.name}").status_code == 200


@pytest.mark.parametrize("timestamp", ["0001-01-01T00:00:00+01:00", "9999-12-31T23:59:59-01:00"])
def test_utc_overflow_rejects_entire_batch(client, timestamp):
    response = post(client, [event(), event(timestamp=timestamp)])
    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["body", "events", 1, "timestamp"]
    assert "representable in UTC" in error["msg"]
    assert get(client).json()["total"] == 0


@pytest.mark.parametrize("boundary", ["start", "end"])
@pytest.mark.parametrize("timestamp", ["0001-01-01T00:00:00+01:00", "9999-12-31T23:59:59-01:00"])
def test_utc_overflow_filter_is_field_specific(client, boundary, timestamp):
    response = get(client, **{boundary: timestamp})
    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["query", boundary]
    assert "representable in UTC" in error["msg"]


def test_offset_filter_normalization(client):
    assert post(client, [event()]).status_code == 200
    response = get(client, start="2026-01-01T17:30:00+05:30", end="2026-01-01T11:00:00-01:00")
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_favicon_is_a_real_icon_and_declared_in_dashboard(client):
    icon = client.get("/favicon.ico")
    assert icon.status_code == 200
    assert icon.headers["content-type"] == "image/x-icon"
    assert icon.content[:4] == b"\x00\x00\x01\x00"
    assert 'href="/favicon.ico"' in client.get("/").text


def test_service_choices_are_dataset_scoped_unfiltered_sorted_and_bounded(client):
    post(client, [event(service="zebra"), event(service="alpha"), event(service="alpha")])
    post(client, [event(service="historical-only")], "historical")
    data = get(client, service="missing").json()
    assert data["total"] == 0
    assert data["services"] == ["alpha", "zebra"]
    assert data["services_truncated"] is False
    assert get(client, "historical").json()["services"] == ["historical-only"]
    post(client, [event(service=f"service-{i:03}") for i in range(205)])
    data = get(client, page_size=1).json()
    assert len(data["services"]) == 200
    assert data["services_truncated"] is True
    assert data["services"] == sorted(data["services"])
