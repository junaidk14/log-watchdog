# Local webhook deliveries

New incident opening and recovery transitions create one notification each, atomically with the transition and evaluated measurement. Repeated abnormal windows do not notify again. Existing incidents from before this feature are not backfilled; an existing open incident can still produce its future recovery notification.

The background worker posts actual HTTP to `http://127.0.0.1:8000/api/receiver`. Use the documented single-worker launcher on port 8000. The destination cannot be edited; proxies and redirects are not used. Three total attempts are allowed, with a two-second socket timeout and real-time delays of two then five seconds after failed attempts. These constants are not environment-configurable in this slice. Advancing Demo changes event/evaluation time only.

A delivery stores its UUID, dataset, Demo run identity, incident ID, kind, real creation time and frozen payload (incident transition plus bounded evaluated counts/rate/baseline/threshold/provenance). It moves through pending, sending, retry scheduled, delivered or exhausted. Each attempt stores start/finish UTC, HTTP status or network error, duration and duplicate acknowledgment. The UI distinguishes incident state from notification state.

Each claim commits before network I/O. On restart, unfinished claims retain their used attempt and gain an explicit unknown-outcome interruption error; remaining attempts resume on the real clock. An interrupted final attempt is exhausted. The receiver persists accepted IDs and recognizes repeated payloads. This does not promise exactly-once network delivery: a receiver might accept a request whose response the worker never records. The three-attempt budget remains bounded in that case. Interrupted duration is unknown rather than fabricated.

## Walk through retry and recovery

1. Start with a fresh temporary database using the regular launcher:

   ```sh
   demo_directory=$(mktemp -d)
   LOG_WATCHDOG_DB="$demo_directory/watchdog.sqlite3" .venv/bin/python -m log_watchdog
   ```

2. Open Deliveries → Demo receiver behavior, choose **Fail first, then succeed**, and **Save behavior**.
3. Open Overview → **Advance one minute** → **Investigate checkout incident** → **View delivery history**.
4. Expand **View payload and attempts**. The first actual response is HTTP 503, a real-time retry is scheduled, and the second response is HTTP 200. The exact payload and stable ID remain unchanged. **Back to incident** restores the originating action and evaluated window.
5. Advance four more times to observe incident recovery and a separate recovery notification. Both notifications capture the selected behavior when created; changing the setting later never changes pending work.
6. To demonstrate exhaustion, start another fresh temporary database, save **Always fail**, then repeat. After three HTTP 503 responses, the delivery shows no further retry and the final error. No resend is offered. **Success** accepts on the first request.

Receiver settings affect new synthetic Demo notifications only; Live always captures success. Actual network problems can still fail a Live attempt. Historical data never creates notifications. Settings and receipt recognition survive restart. The receiver behavior label is a simulation control; attempt outcomes are actual HTTP results.

The database path above is isolated from your regular data. Demo reset and retention remain separate issue #6 work. This feature does not delete data or introduce a reset control.

## APIs and evidence

- `GET /api/datasets/{demo|live|historical}/deliveries`, optional `incident` and Demo `run`: dataset-scoped notifications, exact payloads and chronological attempts. A stale run reports reset; an unavailable incident reports unavailable rather than an empty match.
- `GET /api/demo/receiver` and `PUT /api/demo/receiver` with `{"behavior":"success"}`, `fail-first-then-succeed`, or `always-fail`.
- `POST /api/receiver`: built-in receiver validates an existing stable `X-Delivery-ID` and exact frozen payload bytes, bounded to 64 KiB. Repeated accepted deliveries return `X-Delivery-Duplicate: true`.
- Incident evidence includes current opening/recovery notification statuses, while measurements stay pinned.

See [issue #4 verification](verification-issue-4.md) for completed automated and real-HTTP evidence and the pending browser checklist.
