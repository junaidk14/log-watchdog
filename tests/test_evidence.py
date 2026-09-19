from fastapi.testclient import TestClient

from log_watchdog.app import create_app


def setup(tmp_path):
    app = create_app(tmp_path / "evidence.sqlite")
    client = TestClient(app)
    overview = client.post("/api/demo/advance").json()
    incident = overview["incidents"][0]
    url = f"/api/datasets/demo/incidents/{incident['id']}/evidence"
    return app, client, incident, url, overview["run"]


def test_evidence_membership_late_arrival_filters_paging_and_restart(tmp_path):
    app, client, incident, url, run = setup(tmp_path)
    original = client.get(url).json()
    assert original["total"] == original["evaluated_total"] == 40
    assert original["measurement"] == incident["measurement"]
    assert original["patterns"] == [{"message": "Downstream timeout", "count": 16}]
    assert len(original["sample"]) == 5
    assert all(e["severity"] == "ERROR" for e in original["sample"])
    event = {
        "event_id": "late",
        "timestamp": incident["start"],
        "service": "checkout",
        "severity": "ERROR",
        "message": "Late timeout",
        "metadata": {"test": True},
    }
    for dataset in ("demo", "live", "historical"):
        assert (
            client.post(f"/api/datasets/{dataset}/events", json={"events": [event]}).status_code
            == 200
        )
    # The end is exclusive, even for an event ingested before the next evaluation.
    client.post(
        "/api/datasets/demo/events",
        json={"events": [event | {"event_id": "edge", "timestamp": incident["end"]}]},
    )
    assert client.get(url).json() == original
    expanded = client.get(url, params={"scope": "all"}).json()
    assert expanded["total"] == 41
    assert [e["event_id"] for e in expanded["events"] if not e["included"]] == ["late"]
    assert expanded["measurement"] == original["measurement"]
    assert expanded["patterns"] == original["patterns"]
    assert client.get(url, params={"severity": "ERROR"}).json()["total"] == 16
    assert client.get(url, params={"message": "late"}).json()["total"] == 0
    assert client.get(url, params={"scope": "all", "message": "late"}).json()["total"] == 1
    assert client.get(url, params={"message": "%"}).json()["total"] == 0
    ids = []
    for page in range(1, 5):
        result = client.get(url, params={"page": page, "page_size": 10}).json()
        ids.extend(e["event_id"] for e in result["events"])
    assert len(set(ids)) == 40
    sample_id = original["sample"][0]["event_id"]
    assert client.get(url, params={"event_id": sample_id}).json()["total"] == 1
    assert client.get(url, params={"run": run}).status_code == 200
    for _ in range(4):
        client.post("/api/demo/advance")
    pinned = {"evaluation": original["measurement"]["id"], "run": run}
    recovered = client.get(url, params=pinned).json()
    assert recovered["incident"]["state"] == "recovered"
    assert recovered["measurement"] == original["measurement"]
    restarted = TestClient(create_app(app.state.store.path))
    assert restarted.get(url, params=pinned).json() == recovered


def test_unavailable_evidence_is_distinct_from_filtered_empty(tmp_path):
    app, client, incident, url, run = setup(tmp_path)
    empty = client.get(url, params={"message": "not present"}).json()
    assert empty["total"] == 0 and not empty["evidence_missing"]
    with app.state.store.connection() as db:
        db.execute(
            "DELETE FROM events WHERE dataset='demo' AND service='checkout' AND timestamp>=?",
            (incident["start"],),
        )
    missing = client.get(url).json()
    assert missing["evidence_missing"] and missing["retained_total"] == 0
    assert missing["evaluated_total"] == 40
    assert missing["measurement"]["errors"] == 16
    # Simulate the future reset slice rotating run identity, without implementing reset here.
    with app.state.store.connection() as db:
        db.execute("UPDATE settings SET value='new-run' WHERE key='demo_run'")
    response = client.get(url, params={"run": run})
    assert response.status_code == 410 and "demo run was reset" in response.json()["detail"]


def test_invalid_and_cross_dataset_window_references(tmp_path):
    _, client, incident, url, _ = setup(tmp_path)
    for params in ({"scope": "unknown"}, {"page": 0}, {"evaluation": 0}, {"severity": "BAD"}):
        assert client.get(url, params=params).status_code == 422
    assert client.get(url, params={"evaluation": 1}).status_code == 404
    assert client.get(url.replace("/demo/", "/live/")).status_code == 404
    assert client.get(url.replace("/demo/", "/historical/")).status_code == 422
    assert client.get(url.replace(str(incident["id"]), "9999")).status_code == 404
