# Log Watchdog

A local, single-user structured log explorer built with FastAPI, SQLite, and React. Ingest events, filter them by dataset, service, severity, UTC interval or message, and inspect their metadata. No login or external credentials are needed.

This implementation delivers structured ingestion and browsing, error-log rate detection, incident investigation, and actual local webhook delivery with persisted retries (issues #1–#4). Overview opens first; Incidents, Logs and Deliveries preserve investigation context. File upload, retention/reset, and optional LLM analysis are later approved slices. See [delivery behavior and the retry walkthrough](docs/deliveries.md). See [detector behavior and configuration](docs/detection.md) for the complete five-advance demonstration, formula, and persistence boundaries.

## Start locally

Prerequisites: Python 3.11+ and Node.js 22+ with npm. Run from this checkout's root. Verified with Python 3.14.5, Node 26.0.0 and npm 12.0.2 on macOS arm64.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.lock
npm --prefix frontend ci
npm --prefix frontend run build
.venv/bin/python -m log_watchdog
```

Alternatively, with `uv` installed, use `uv venv` and `uv pip install -r requirements-dev.lock` for the first two commands. Open **http://127.0.0.1:8000/**. The same server serves the compiled frontend and API; the supported launcher binds only to loopback and uses one worker. Stop with Ctrl+C. The editable package expects this checkout's `frontend/dist/`; it is not a standalone frontend-bundled wheel.

The database defaults to `.data/watchdog.sqlite3` relative to the working directory. To use another database, set `LOG_WATCHDOG_DB=/absolute/path/watchdog.sqlite3` before starting. Restarting preserves events and does not repeat the seed. A new database receives 3,600 synthetic normal events across `api-gateway`, `checkout`, and `worker`, covering 30 minutes ending at 2026-01-01 12:00 UTC. These are labeled simulation timestamps, not current live activity. Historical and Live start empty.

For frontend development, keep the API running and use `npm --prefix frontend run dev`. Vite binds to loopback and proxies `/api` to port 8000. Rebuild to update the dashboard served by FastAPI.

## Ingest and browse

```sh
curl -sS http://127.0.0.1:8000/api/datasets/live/events \
  -H 'Content-Type: application/json' \
  -d '{"events":[{"event_id":"example-1","timestamp":"2026-01-01T12:00:00Z","service":"checkout","severity":"ERROR","message":"Downstream timeout","metadata":{"duration_ms":1500}}]}'
```

Choose **Live** in the dashboard, enter `checkout` in Service and `timeout` in Message contains, then Apply filters. Expand the event to read its ID, full message, ingestion time, and metadata. Filters and page are in the URL; browser Back restores prior context and scroll after loading. Clear filters keeps the selected dataset. Refresh reloads the current query; a failed refresh keeps previous same-query results with a timestamp.

- `POST /api/datasets/{dataset}/events`: accepts `{"events": [...]}` with 1–5,000 events. Dataset is `demo`, `live`, or `historical`. This is structured API ingestion, not the later file-upload feature.
- Required fields: timezone-aware ISO timestamp, nonblank service (up to 120 characters), uppercase severity (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `FATAL`), nonblank message (up to 16,384 characters). Extra fields are rejected.
- Optional fields: `event_id` (nonblank, up to 200 characters) and `metadata` (finite JSON object, serialized size up to 32 KiB). Timestamps normalize to UTC with microsecond precision. Validation errors identify the event index and field without echoing log content.
- A batch is atomic: any validation error (422) or conflicting ID (409) rejects the entire batch. The response gives `event_ids`, `inserted`, and `duplicates`.
- Reusing a supplied ID with identical normalized content deduplicates **within that dataset**, including duplicates inside a batch. Different content conflicts; nothing is overwritten. Metadata key ordering and equivalent timezone offsets do not cause conflicts.
- Omitted or null IDs generate a new UUID every time. **Retrying without a supplied ID does not deduplicate.** Producer retries should supply stable IDs.
- `GET /api/datasets/{dataset}/events`: `service`, `severity`, `start`, `end`, `message`, `page` (default 1), `page_size` (default 50, max 100). Service and severity match exactly; message is literal case-insensitive substring matching using SQLite's built-in lowercasing (ASCII, not full Unicode case folding). Time bounds are inclusive and require a timezone; dashboard inputs use `Z` explicitly.
- Results include total matching count and newest-first events. Timestamp ties use insertion sequence. Count and page share one database snapshot. Pages are offset-based: new ingestion can move rows between pages across separate requests.
- `GET /api/health` and API schema at `/docs`. Unknown API paths return 404.

Demo, live and historical queries always carry a dataset predicate. Historical events are stored separately and excluded from detection. Demo and live have separate persisted evaluation cursors and baselines. No automatic retention is implemented yet.

## Verify

Run after installing dependencies; build precedes backend tests because they verify compiled assets are actually served.

```sh
npm --prefix frontend run build
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run format:check
npm --prefix frontend test
.venv/bin/ruff check log_watchdog tests scripts
.venv/bin/ruff format --check log_watchdog tests scripts
.venv/bin/mypy
.venv/bin/python scripts/check_contrast.py
.venv/bin/pytest -q
.venv/bin/python scripts/validate_runtime.py
```

`validate_runtime.py` requires port 8000 free and starts the documented launcher with a temporary database. It uses real HTTP to check dashboard/assets, ingest 100,000 synthetic live events, time browsing, post 100 individual events at 20/second, and restart to verify persistence and isolation. It also exercises the five-step demo, late evidence, incident restart, pending webhook process restart (HTTP 503 → 200), opening/recovery notification delivery, and one actual live worker minute (up to 75 seconds waiting for the real clock). It stops its server and removes only its temporary files. It never uses your default database.

Backend tests cover schema failures, complete-batch rollback, ID generation/deduplication/conflicts, normalization, literal filters, paging, dataset isolation, seed idempotence, and SQLite restart. Frontend tests cover query/Back restoration (including response timing), same-query actions, dataset races, expansion/focus, loading/empty/error/retry, literal rendering of untrusted messages, and available axe DOM accessibility rules. jsdom cannot establish rendered layout, contrast, or real-browser keyboard behavior. ESLint explicitly permits focusable named `region` elements to make the overflowing table keyboard-scrollable; other accessibility rules remain active.

See [issue #1 evidence](docs/verification-issue-1.md), [issue #2 evidence](docs/verification-issue-2.md), [issue #3 evidence](docs/verification-issue-3.md), and [issue #4 evidence](docs/verification-issue-4.md) for measured results and pending manual UI checks.

## Investigate evaluated evidence

Advance Demo once and activate **Investigate checkout incident**. The queue stays beside the evidence pane on desktop; at narrow widths the pane has **Back to incidents**. Selection and the evaluated window are in the URL and remain pinned during refresh and recovery. Choose **Evaluated window** to inspect another recorded minute, including recovery windows.

The pane shows counts, rate, baseline/threshold, exact-message error patterns, a labeled five-event sample, and a non-LLM local summary with evidence links. **View evaluated logs** opens the full paginated window, initially restricted to the detector's watermark. **Include later arrivals** explicitly expands that same half-open interval and labels excluded additions. Recorded totals and query matching counts stay separate. **Clear filters** removes severity/message/event-ID refinements while keeping incident scope; **Leave incident scope** explicitly enables general service/time exploration. Sample links pin an exact event ID.

`GET /api/datasets/{demo|live}/incidents/{id}/evidence` accepts optional `evaluation` (default latest abnormal window), `run` (Demo UUID), `scope=evaluated|all`, `severity`, literal `message`, exact `event_id`, `page`, and `page_size` (1–100). Service and UTC bounds come from evaluation provenance, never caller-supplied overrides. Patterns show up to ten exact ERROR/FATAL message groups; samples prefer errors and contain at most five events. Basic pattern matching is not root-cause analysis. All evidence reads share one snapshot.

Demo links carry a durable run identity. A mismatched run returns a specific reset explanation; an unavailable incident/window returns 404. If recorded metadata outlives logs, the response flags missing evidence independently of filters. Reset/retention execution remains a later slice; these boundaries are tested with controlled SQLite fixtures, not a claim that reset or cleanup is already implemented. Older links without a run ID retain compatibility but cannot identify a prior reset.
