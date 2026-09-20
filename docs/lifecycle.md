# Retention and Demo reset

The application cleans up once during startup, before accepting requests, and hourly while running. A periodic cleanup failure is logged and retried after one minute. Startup cleanup failure prevents serving with an unverified lifecycle state.

Routine logs older than seven days expire by **event timestamp**, not ingestion time. Historical files containing old events can be imported and browsed, but those events expire at the next cleanup. Evaluations expire by window end. Recovered investigations expire seven days after recovery once all associated notifications are delivered or exhausted. Age exactly seven days is retained until the next cleanup moves the boundary past it.

Demo uses its persisted **simulation clock**. Live and Historical use real UTC time. A paused Demo therefore does not age out just because its fixed January 2026 timestamps are old in real time. Delivery attempts and retries always use real time.

Exceptions preserve investigations:

- Open incidents retain all their evaluated windows and the events included under each window's service, interval and sequence watermark.
- Recent recoveries retain their complete evaluated evidence, including windows older than seven days.
- Pending, retry-scheduled and in-flight notifications protect their incident, evaluations, included events, attempt history and receiver receipts, even for an old recovery. Delivered/exhausted history stays with the incident until the incident expires.
- The latest configured normal baseline members per service retain aggregate evaluation metadata, even when their routine logs expire. This preserves frozen baselines and recovery behavior. It does not keep all raw baseline logs.

Later arrivals are routine logs unless included in another protected evaluation. They can expire while recorded counts remain stable. Cleanup removes related completed records in one transaction. An expired incident/window reports unavailable/no longer retained, rather than zero matching logs. If retained metadata predates missing log evidence, existing evidence responses separately flag missing evidence; a filter with no matches is not missing evidence. Event, incident and evaluation identities never reuse a value deleted by this implementation.

This is **not a hard storage cap**. Open investigations, unfinished delivery work, recent long-running recoveries and baseline metadata are exceptions. SQLite reuses freed pages; cleanup does not VACUUM or promise the database file shrinks. Very large protected investigations and prolonged offline evaluation catch-up remain outside the measured 100k-event target.

## Reset walkthrough

1. Open Demo Overview. Select **Reset demo** and read the inline scope explanation.
2. **Cancel reset** leaves the run intact and restores focus to Reset demo. **Confirm reset Demo only** deletes Demo events, evaluations, incidents, notifications, attempts and receiver receipts. It cancels queued Demo work after any claimed HTTP attempt finishes.
3. Reset atomically restores 3,600 normal events across three services, baseline evaluations, zero scenario steps, the initial simulation clock, receiver success behavior and a new run UUID. Live and Historical records remain untouched. The UI shows completion, clears the selected incident, and returns focus to Reset demo.
4. To demonstrate retry again, choose **Fail first, then succeed** in Demo Deliveries, return to Overview and advance five times. The first two windows spike; three eligible normal windows recover. Simulation advances do not accelerate real retries.
5. An old Demo Overview/incident/log/delivery URL carrying the previous run explains that the run was reset and links to the current Demo. On stale Overview URLs, Advance and Reset stay disabled and the replacement workbench stays hidden until **Return to current demo** is followed. This also applies to browser Back after two resets, even without an incident selection. Numeric identities are not reused, so older untagged incident links cannot attach to a new incident either.

`POST /api/demo/reset` requires `{"run":"<current UUID>","confirm_demo_only":true}`. The confirmation binds to the run shown when opened; a changed run returns 409. Cancel, refresh, and open confirmation again. `POST /api/demo/advance?run=<UUID>` similarly rejects stale work; omitting the optional guard preserves the original API's current-run behavior.

After a connection error the reset outcome is unknown: refresh before retrying. Reusing an old confirmed UUID cannot reset a replacement run. Reset uses a process-local delivery lock under the documented single-worker launcher; multi-worker operation is unsupported.

Once an event expires, its supplied event ID no longer deduplicates against the deleted row. A later reuse receives a fresh monotonic sequence; it cannot become part of an older evaluation watermark.
