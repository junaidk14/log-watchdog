# Local webhook deliveries

New incident opening and recovery transitions create one notification each, atomically with the transition and evaluated measurement. Repeated abnormal windows do not notify again. Existing incidents from before this feature are not backfilled; an existing open incident can still produce its future recovery notification.

The background worker posts actual HTTP to `http://127.0.0.1:8000/api/receiver`. Use the documented single-worker launcher on port 8000. The destination cannot be edited; proxies and redirects are not used. Three total attempts are allowed, with a two-second socket timeout and real-time delays of two then five seconds after failed attempts. These constants are not environment-configurable in the MVP. Advancing Demo changes event/evaluation time only.

A delivery stores its UUID, dataset, Demo run identity, incident ID, kind, real creation time and frozen payload (incident transition plus bounded evaluated counts/rate/baseline/threshold/provenance). It moves through pending, sending, retry scheduled, delivered or exhausted. Each attempt stores start/finish UTC, HTTP status or network error, duration and duplicate acknowledgment. The UI distinguishes incident state from notification state.

Each claim commits before network I/O. On restart, unfinished claims retain their used attempt and gain an explicit unknown-outcome interruption error; remaining attempts resume on the real clock. An interrupted final attempt is exhausted. The receiver persists accepted IDs and recognizes repeated payloads. This does not promise exactly-once network delivery: a receiver might accept a request whose response the worker never records. The three-attempt budget remains bounded in that case. Interrupted duration is unknown rather than fabricated.

## Walk through retry and recovery

1. Start the application with the [regular launcher](../README.md#start-locally). Open **Demo Overview** → **Reset demo** → **Confirm reset Demo only**. This clears Demo investigation and delivery history and restores seeded normal history; Live and Historical remain unchanged.
2. Reset restores receiver behavior to **Success**. After resetting, open **Deliveries → Demo receiver behavior**, choose **Fail first, then succeed**, and **Save behavior** before advancing.
3. Open Overview → **Advance one minute** → **Investigate checkout incident** → **View delivery history**.
4. Expand **View payload and attempts**. The first actual response is HTTP 503, a real-time retry is scheduled, and the second response is HTTP 200. The exact payload and stable ID remain unchanged. **Back to incident** restores the originating action and evaluated window.
5. Advance four more times to observe incident recovery and a separate recovery notification. Both notifications capture the selected behavior when created; changing the setting later never changes pending work.
6. To demonstrate exhaustion, return to **Demo Overview** → **Reset demo** → **Confirm reset Demo only**. After reset completes, open Demo Deliveries, choose **Always fail**, and **Save behavior**, then return to Overview and **Advance one minute**. After three HTTP 503 responses, the delivery shows no further retry and the final error. No resend is offered. To repeat, use the same reset → configure and save receiver behavior → advance sequence. **Success** accepts on the first request.

Receiver settings affect new synthetic Demo notifications only; Live always captures success. Actual network problems can still fail a Live attempt. Historical data never creates notifications. Settings and receipt recognition survive restart. The receiver behavior label is a simulation control; attempt outcomes are actual HTTP results.

Seven-day retention and Demo-only reset are implemented. Retention preserves active investigations and pending deliveries and is not a hard storage cap. See [retention exceptions and the reset walkthrough](lifecycle.md) for clocks, scope, and stale-run behavior.

## APIs and evidence

- `GET /api/datasets/{demo|live|historical}/deliveries`, optional `incident` and Demo `run`: dataset-scoped notifications, exact payloads and chronological attempts. A stale run reports reset; an unavailable incident reports unavailable rather than an empty match.
- `GET /api/demo/receiver` and `PUT /api/demo/receiver` with `{"behavior":"success"}`, `fail-first-then-succeed`, or `always-fail`.
- `POST /api/receiver`: built-in receiver validates an existing stable `X-Delivery-ID` and exact frozen payload bytes, bounded to 64 KiB. Repeated accepted deliveries return `X-Delivery-Duplicate: true`.
- Incident evidence includes current opening/recovery notification statuses, while measurements stay pinned.

The **Try the Demo** guide on Overview links to receiver settings. Deliveries repeats the reset → choose behavior → advance sequence; it does not run those actions automatically. Desktop places settings beside history; narrow screens place them below.

See [issue #4 verification](verification-issue-4.md) for historical HTTP evidence and [current validation](final-validation.md) for later browser coverage and limits.
