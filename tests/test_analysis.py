import json
import sqlite3
import time
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from log_watchdog import analysis as module
from log_watchdog.analysis import MAX_PACKET_BYTES, MAX_PREVIEWS, Analysis, AnalysisError, Settings
from log_watchdog.app import create_app
from log_watchdog.store import Store


def setup(tmp_path, monkeypatch, *, paid=False):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-never-real")
    monkeypatch.setenv("GEMINI_PAID_SERVICE", str(paid).lower())
    app = create_app(tmp_path / "analysis.sqlite")
    client = TestClient(app)
    overview = client.post("/api/demo/advance").json()
    incident = overview["incidents"][0]
    url = f"/api/datasets/demo/incidents/{incident['id']}/analysis/preview"
    body = {"evaluation": incident["measurement"]["id"], "run": overview["run"]}
    return app, client, url, body


def result(ref="window"):
    claim = {"text": "A downstream timeout may explain the observed logs.", "references": [ref]}
    return {"summary": claim, "possible_causes": [claim], "next_checks": [claim]}


def send(client, preview):
    return client.post(
        "/api/analysis/send", json={"preview_id": preview["preview_id"], "confirm_send": True}
    )


def test_exact_preview_send_references_late_arrivals_and_cached_success(tmp_path, monkeypatch):
    app, client, url, body = setup(tmp_path, monkeypatch)
    provider = Mock(return_value=result("sample-1"))
    monkeypatch.setattr(module, "generate", provider)
    preview = client.post(url, json=body).json()
    provider.assert_not_called()
    assert len(preview["packet"].encode()) <= MAX_PACKET_BYTES
    assert "test-key" not in json.dumps(preview)
    assert "event_id" not in preview["packet"] and "metadata" not in json.loads(preview["packet"])
    assert preview["synthetic_only"]
    client.post(
        "/api/datasets/demo/events",
        json={
            "events": [
                {
                    "event_id": "late",
                    "timestamp": "2026-01-01T12:00:00Z",
                    "service": "checkout",
                    "severity": "ERROR",
                    "message": "NEW SECRET",
                }
            ]
        },
    )
    client.post("/api/demo/advance")
    response = send(client, preview)
    assert response.status_code == 200
    assert provider.call_args.args[1] == preview["packet"]
    assert "NEW SECRET" not in provider.call_args.args[1]
    ref = response.json()["references"]["sample-1"]
    evidence = client.get(
        f"/api/datasets/demo/incidents/{ref['incident']}/evidence",
        params={k: v for k, v in ref.items() if k in ("evaluation", "run", "event_id")},
    ).json()
    assert evidence["total"] == 1
    assert send(client, preview).json() == response.json()
    assert provider.call_count == 1
    assert app.state.store.browse("live")["total"] == 0


def test_configuration_and_unpaid_provenance_cannot_be_forged(tmp_path, monkeypatch):
    app, client, url, body = setup(tmp_path, monkeypatch)
    app.state.analysis.settings = Settings("")
    assert client.post(url, json=body).status_code == 503
    app.state.analysis.settings = Settings("key", "../bad")
    assert client.post(url, json=body).status_code == 503
    app.state.analysis.settings = Settings("key")
    assert client.post(url, json={"evaluation": body["evaluation"]}).status_code == 422
    assert client.post(url, json=body | {"paid_service": True}).status_code == 422
    # Mark an included event as public-ingest provenance, even with synthetic metadata.
    with app.state.store.connection() as db:
        db.execute("UPDATE events SET trusted_synthetic=0 WHERE event_id='simulation-1-checkout-0'")
    assert client.post(url, json=body).status_code == 403
    app.state.analysis.settings = Settings("key", paid=True)
    preview = client.post(url, json=body)
    assert preview.status_code == 200 and not preview.json()["synthetic_only"]
    # No historical analysis route: imports never create incidents.
    assert client.post(url.replace("demo", "historical"), json=body).status_code == 422
    assert client.post(url.replace("demo", "live"), json=body).status_code == 404


def test_public_ingestion_never_grants_synthetic_trust(tmp_path, monkeypatch):
    app, client, _, _ = setup(tmp_path, monkeypatch)
    event = {
        "event_id": "public",
        "timestamp": "2026-01-01T12:01:00Z",
        "service": "checkout",
        "severity": "ERROR",
        "message": "secret",
        "metadata": {"synthetic": True},
    }
    assert (
        client.post(
            "/api/datasets/demo/events", json={"events": [event | {"trusted_synthetic": True}]}
        ).status_code
        == 422
    )
    assert client.post("/api/datasets/demo/events", json={"events": [event]}).status_code == 200
    overview = client.post("/api/demo/advance").json()
    incident = overview["incidents"][0]
    response = client.post(
        f"/api/datasets/demo/incidents/{incident['id']}/analysis/preview",
        json={"evaluation": incident["measurement"]["id"], "run": overview["run"]},
    )
    assert response.status_code == 403
    with app.state.store.connection() as db:
        assert (
            db.execute("SELECT trusted_synthetic FROM events WHERE event_id='public'").fetchone()[0]
            == 0
        )


def test_live_requires_paid_configuration(tmp_path, monkeypatch):
    app, client, url, body = setup(tmp_path, monkeypatch)
    with app.state.store.connection() as db:
        # Deterministic live fixture; no need to wait for a worker minute.
        db.execute("UPDATE events SET dataset='live' WHERE service='checkout'")
        db.execute("UPDATE evaluations SET dataset='live' WHERE service='checkout'")
        db.execute("UPDATE incidents SET dataset='live'")
    url = url.replace("demo", "live")
    assert client.post(url, json=body).status_code == 403
    app.state.analysis.settings = Settings("key", paid=True)
    assert client.post(url, json=body).status_code == 200


def test_redaction_bounds_omission_and_immutable_packet(tmp_path, monkeypatch):
    app, client, url, body = setup(tmp_path, monkeypatch, paid=True)
    with app.state.store.connection() as db:
        db.execute(
            "UPDATE events SET message=?, metadata=? WHERE event_id='simulation-1-checkout-0'",
            (
                'password="pass word" token=secret Bearer abc user@example.com '
                "https://private/path?q=secret " + "x" * 2000,
                '{"secret":"metadata-secret"}',
            ),
        )
    preview = client.post(url, json=body).json()
    for secret in (
        "pass word",
        "token=secret",
        "Bearer abc",
        "user@example.com",
        "https://private",
        "metadata-secret",
    ):
        assert secret not in preview["packet"]
    assert "[REDACTED" in preview["packet"] and "[truncated]" in preview["packet"]
    assert len(json.loads(preview["packet"])["sample"]) == 5
    # Worst-case unicode is rejected rather than silently exceeding the byte budget.
    with app.state.store.connection() as db:
        db.execute(
            "UPDATE events SET message=? WHERE event_id LIKE 'simulation-1-checkout-%'",
            ("\U0001f600" * 900,),
        )
    assert client.post(url, json=body).status_code == 413


def test_expiry_capacity_restart_reset_and_concurrency(tmp_path, monkeypatch):
    app, client, url, body = setup(tmp_path, monkeypatch)
    provider = Mock(return_value=result())
    monkeypatch.setattr(module, "generate", provider)
    first = client.post(url, json=body).json()
    for _ in range(MAX_PREVIEWS):
        latest = client.post(url, json=body).json()
    assert len(app.state.analysis.previews) == MAX_PREVIEWS
    assert send(client, first).status_code == 410
    token = latest["preview_id"]
    app.state.analysis.previews[token].expires = time.monotonic() - 1
    assert send(client, latest).status_code == 410
    latest = client.post(url, json=body).json()
    app.state.analysis.sending.acquire()
    try:
        assert send(client, latest).status_code == 409
    finally:
        app.state.analysis.sending.release()
    restarted = TestClient(create_app(app.state.store.path))
    assert send(restarted, latest).status_code == 410
    assert (
        client.post(
            "/api/demo/reset", json={"run": body["run"], "confirm_demo_only": True}
        ).status_code
        == 200
    )
    assert send(client, latest).status_code == 410
    provider.assert_not_called()


@pytest.mark.parametrize(
    "bad",
    [
        result("invented"),
        {},
        result() | {"actions": ["execute"]},
        result() | {"summary": {"text": "x" * 801, "references": ["window"]}},
        result() | {"summary": {"text": " ", "references": []}},
    ],
)
def test_invalid_output_never_accepted(tmp_path, monkeypatch, bad):
    _, client, url, body = setup(tmp_path, monkeypatch)
    preview = client.post(url, json=body).json()
    monkeypatch.setattr(module, "generate", Mock(return_value=bad))
    assert send(client, preview).status_code == 502
    monkeypatch.setattr(module, "generate", Mock(return_value=result()))
    assert send(client, preview).status_code == 200


@pytest.mark.parametrize(
    "status,raw,expected",
    [
        (429, b"secret-error", 429),
        (403, b"secret-error", 502),
        (302, b"", 502),
        (200, b"x" * 32769, 502),
        (200, b"not json", 502),
        (200, b'{"candidates":[]}', 502),
    ],
)
def test_rest_errors_are_bounded_and_do_not_echo_secrets(monkeypatch, status, raw, expected):
    connection = Mock()
    connection.getresponse.return_value.status = status
    connection.getresponse.return_value.read.return_value = raw
    factory = Mock(return_value=connection)
    monkeypatch.setattr(module.http.client, "HTTPSConnection", factory)
    with pytest.raises(AnalysisError) as exc:
        module.generate(Settings("private-key"), "{}")
    assert exc.value.status == expected and "secret-error" not in exc.value.message
    connection.close.assert_called_once()


def test_rest_contract_timeout_and_invalid_finish(monkeypatch):
    connection = Mock()
    response = connection.getresponse.return_value
    response.status = 200
    response.read.return_value = json.dumps(
        {
            "candidates": [
                {"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(result())}]}}
            ]
        }
    ).encode()
    factory = Mock(return_value=connection)
    monkeypatch.setattr(module.http.client, "HTTPSConnection", factory)
    assert (
        module.generate(Settings("key", "gemini-3.5-flash-lite"), '{"exact":"packet"}') == result()
    )
    factory.assert_called_with("generativelanguage.googleapis.com", timeout=20)
    args = connection.request.call_args.args
    assert args[1] == "/v1beta/models/gemini-3.5-flash-lite:generateContent"
    assert args[3]["x-goog-api-key"] == "key"
    assert json.loads(args[2])["contents"][0]["parts"][0]["text"] == '{"exact":"packet"}'
    response.read.assert_called_with(32769)
    connection.getresponse.side_effect = TimeoutError()
    with pytest.raises(AnalysisError) as exc:
        module.generate(Settings("key"), "{}")
    assert exc.value.status == 504


def test_existing_database_migrates_without_trusting_old_metadata(tmp_path):
    path = tmp_path / "legacy.sqlite"
    db = sqlite3.connect(path)
    db.execute(
        "CREATE TABLE events(sequence INTEGER PRIMARY KEY, dataset TEXT, "
        "event_id TEXT, timestamp TEXT, service TEXT, severity TEXT, message "
        "TEXT, metadata TEXT, ingested_at TEXT, UNIQUE(dataset,event_id))"
    )
    db.execute(
        "INSERT INTO events VALUES "
        "(1,'demo','old','2026-01-01','checkout','ERROR','old','{\"synthetic\":true}','2026-01-01')"
    )
    db.commit()
    db.close()
    store = Store(path)
    with store.connection() as db:
        assert db.execute("SELECT trusted_synthetic FROM events").fetchone()[0] == 0
    assert len(Analysis(store).previews) == 0
