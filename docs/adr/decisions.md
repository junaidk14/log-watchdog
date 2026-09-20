# Architectural decisions

Record material architectural decisions here once made. Each entry states the decision, rationale, and status. Accepted means decided, not necessarily implemented. When a decision changes, mark the earlier entry superseded and link to its replacement.

## ADR-001 — Python application language

- **Decision:** Build the application in Python.
- **Rationale:** Python is an explicit requirement in the project's founding brief.
- **Status:** Accepted.

## ADR-002 — API-first architecture

- **Decision:** Build the observability and event watchdog as an API-first application with a dashboard.
- **Rationale:** The founding brief requires both an API-first system and a dashboard.
- **Status:** Accepted.

## ADR-003 — Local single-user scope

- **Decision:** Deliver a local, single-user MVP with a seeded scenario.
- **Rationale:** Demonstrate the complete investigation workflow within the MVP time budget without hosted multi-user infrastructure.
- **Status:** Accepted.

## ADR-004 — Structured ingestion boundary

- **Decision:** Ingest structured JSON through the API and a built-in simulator for a few services. Include simple JSON file upload if it remains lightweight; defer arbitrary text parsing and external platform connectors.
- **Rationale:** Support a usable ingestion path while keeping integration and parsing work bounded.
- **Status:** Accepted; file upload is conditional on a lightweight implementation.

## ADR-005 — Local anomaly detection, optional LLM explanation

- **Decision:** Detect anomalies locally without external credentials using a simple statistical or ML approach. An optional LLM may summarize incident evidence, suggest possible causes, and propose next checks; it does not trigger alerts or assert a definitive root cause.
- **Rationale:** Core detection must work independently of external AI services and go beyond fixed rules, while explanations stay grounded in evidence.
- **Status:** Accepted; refined by ADR-014 and ADR-021.

## ADR-006 — Real local webhook simulation

- **Decision:** Send actual HTTP requests to a local test receiver and expose payloads, delivery results, and a bounded retry scenario in the dashboard.
- **Rationale:** Demonstrate observable alert delivery and failure handling without requiring an external integration.
- **Status:** Accepted.

## ADR-007 — Per-service baseline and one detector

- **Decision:** Limit detection to error-rate spikes against each service's recent baseline. Show learning baseline when history or traffic is insufficient; seed enough normal history for immediate demo detection. Display volume as a trend only.
- **Rationale:** Deliver an explainable local detector within MVP scope and distinguish missing evidence from normal behavior.
- **Status:** Accepted; metric and detector behavior refined by ADR-012 and ADR-014.

## ADR-008 — Incident grouping and recovery

- **Decision:** Consecutive abnormal windows update the same incident; sustained normal behavior marks it recovered. Support Overview → incident → filtered logs → delivery history, with observed versus expected rate, service, time window, repeated patterns, and supporting logs. Defer acknowledgment, assignment, and escalation.
- **Rationale:** Provide one coherent investigation without duplicate incidents or incident-management scope.
- **Status:** Accepted; window and recovery defaults refined by ADR-014.

## ADR-009 — Historical uploads do not alert

- **Decision:** JSON uploads share the API event schema and support browsing and trends without triggering alerts. Use the simulator as the primary detection and webhook demonstration path.
- **Rationale:** Importing historical failures must not cause unexpected deliveries.
- **Status:** Accepted.

## ADR-010 — Bounded local data lifecycle

- **Decision:** Provide seven-day retention and a demo reset. Target three services, approximately 100,000 stored events, and roughly 20 events/second for design and validation.
- **Rationale:** Keep local storage and validation effort bounded for the MVP.
- **Status:** Accepted as design/test targets, not measured performance guarantees.

## ADR-011 — Opt-in external analysis

- **Decision:** External LLM analysis is opt-in, previews the evidence to be sent, and applies basic redaction with an explicit limitation that arbitrary messages may still contain secrets. Detection and investigation remain fully usable without external AI.
- **Rationale:** Preserve user control over log disclosure and keep the core workflow independent of external services.
- **Status:** Accepted; provider selected in ADR-021.

## ADR-012 — Error-log rate metric

- **Decision:** Measure ERROR/FATAL events divided by all events per service and label the metric "error-log rate" throughout the product.
- **Rationale:** Log severity counts do not establish failed-request rates; one request can emit multiple logs.
- **Status:** Accepted.

## ADR-013 — Local FastAPI, SQLite, and React application

- **Decision:** Use FastAPI and SQLite for the backend and a lightweight React dashboard, running as one local application with a single worker and background evaluation/delivery loop.
- **Rationale:** Keep local operation simple while supporting a richer investigation experience in React.
- **Status:** Accepted; frontend build tooling remains an implementation choice.

## ADR-014 — Configurable statistical detector

- **Decision:** Evaluate completed one-minute windows against recent per-service normal history with a sample-size-aware proportion threshold, smoothing, and a minimum increase guard. Keep thresholds and minimum sample sizes configurable. Default to 30 prior normal windows, at least 10 baseline windows, and 20 events per evaluated window. Freeze baseline updates during incidents; recover after three consecutive eligible normal windows. Missing traffic is insufficient evidence, not recovery.
- **Rationale:** Provide simple, explainable statistical detection that handles sparse traffic and zero-error history without presenting its result as a probability of failure.
- **Status:** Accepted; exact smoothing and increase parameters will be documented and validated during implementation.

## ADR-015 — Event identity and evaluation boundary

- **Decision:** Require timestamp, service, severity, and message; allow optional metadata and event ID. Generate an ID when absent; deduplicate supplied IDs. Use UTC timestamps. Late events remain searchable without rewriting evaluated incidents, and historical uploads stay outside the live detector baseline.
- **Rationale:** Make ingestion convenient while permitting producer retries and preserving stable incident evidence.
- **Status:** Accepted; deduplication requires producers to reuse a supplied ID.

## ADR-016 — Durable transition notifications

- **Decision:** Send webhook deliveries when incidents open and recover, not on every update. Allow three total attempts with short retry delays (defaults: 2 and 5 seconds). Persist delivery state and attempt history and resume pending delivery work after restart.
- **Rationale:** Demonstrate bounded failure handling, avoid repeated update notifications, and make delivery behavior inspectable across restarts.
- **Status:** Accepted.

## ADR-017 — Isolated accelerated demo

- **Decision:** Isolate demo data and baselines from live operation. Preload normal history and provide a simulation clock with an "Advance one minute" control, using the same ingestion and detector logic as live operation. Deliver webhooks and run retries in real time.
- **Rationale:** Demonstrate a complete incident quickly without changing detector semantics or contaminating live baselines.
- **Status:** Accepted.

## ADR-018 — Retention exceptions and scoped reset

- **Decision:** Apply seven-day retention to logs and completed investigations, preserving open incidents, their supporting evidence, and pending deliveries. Demo reset clears and reseeds only demo data; imported and live data remain untouched.
- **Rationale:** Bound routine storage without erasing active investigations or unrelated user data.
- **Status:** Accepted.

## ADR-019 — Loopback-only application and bounded inputs

- **Decision:** Bind to localhost without authentication, serve the built React dashboard from FastAPI, restrict webhook delivery to the built-in local receiver, and limit JSON uploads to 5 MB and 5,000 events.
- **Rationale:** Keep the local MVP operationally simple with bounded ingestion and no arbitrary outbound webhook destination support.
- **Status:** Accepted; hosted or network-accessible deployment is outside this decision's scope.

## ADR-020 — Optional lightweight LLM integration

- **Decision:** Include one LLM integration if lightweight, configured only through environment variables. Send evidence only after preview and an explicit "Send for analysis" action. Provide a clearly labeled local evidence summary without credentials; lack of credentials must not block MVP operation. Delegate provider choice to the implementing agent based on simplicity and free/low-cost availability.
- **Rationale:** Add useful assisted investigation without making external AI a dependency of the core product.
- **Status:** Accepted; provider selected in ADR-021.

## ADR-021 — Gemini for optional evidence analysis

- **Decision:** Use the Gemini API through a small server-side REST adapter, with `GEMINI_API_KEY` and optional `GEMINI_MODEL` environment configuration; default to `gemini-3.5-flash-lite`. Restrict unpaid access to synthetic demo evidence; require appropriate paid-service configuration before enabling external analysis of live/imported evidence.
- **Rationale:** The documented stable model offers free-tier and low-cost paid access without an orchestration framework. Unpaid-service data-use terms make synthetic demo evidence the suitable default; basic redaction does not establish that real logs are suitable for unpaid processing.
- **Status:** Accepted under delegated provider selection; integration planned, no live provider call verified. Model availability and account quotas must be checked during implementation.
- **Sources:** [Models](https://ai.google.dev/gemini-api/docs/models), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [terms](https://ai.google.dev/gemini-api/terms), [REST API](https://ai.google.dev/api/generate-content). Checked 2026-09-20 IST.

## ADR-022 — Evaluated evidence as the incident log default

- **Decision:** Incident log links initially show events included in detection, with an explicit option to include later arrivals. Preserve the distinction between evaluated evidence and broader matching logs; later arrivals do not alter recorded incident measurements.
- **Rationale:** Keep the investigation consistent with the detector's recorded numerator and denominator while allowing users to inspect additional context.
- **Status:** Accepted by the user after the UI critique; implementation must retain enough evaluation provenance to distinguish these scopes.

## ADR-023 — Atomic dataset-scoped ingestion

- **Decision:** Commit each validated API batch as one transaction. Event identity is `(dataset, event_id)`; identical normalized content deduplicates, conflicting content rejects the whole batch. Missing/null IDs generate new UUIDs and do not make retries idempotent. Demo seeding shares this ingestion path and commits its marker in the same transaction.
- **Rationale:** Partial acceptance would make producer retries and error recovery ambiguous. Dataset-scoped IDs preserve independent demo/live/historical data even when producers reuse identifiers. Atomic seeding prevents duplicate or incomplete initial history after restart.
- **Status:** Accepted and implemented in issue #1.

## ADR-024 — Direct SQLite storage and bounded offset browsing

- **Decision:** Use Python's SQLite module with short transactions, WAL mode, parameterized queries and dataset/time plus dataset/service/time indexes. Read a page and its matching count from one snapshot; order by timestamp and insertion sequence. Use bounded offset pagination for this first local slice.
- **Rationale:** The small schema and single-process scope do not need an ORM or migration framework yet. Explicit SQL keeps dataset boundaries inspectable. Offset paging supports numbered pages simply at the measured 100k-event target; separate requests can shift under new ingestion, which is documented rather than promising a stable live snapshot.
- **Status:** Accepted and implemented in issue #1; later schema changes must preserve existing data.

## ADR-025 — Smoothed proportion threshold and durable evaluation cursor

- **Decision:** Implement ADR-014 with `p=(E+0.5)/(N+1)` and threshold `min(1,max(p+3*sqrt(p*(1-p)*(1/n+1/(N+1))),p+0.05))`, with all parameters configurable. Persist each per-service evaluation and the dataset cursor in one SQLite transaction. Store the event sequence watermark with dataset, service and half-open interval as exact inclusion provenance. Start newly installed live evaluation at the current UTC minute; catch up a persisted cursor chronologically on restart. Warm-up eligible windows are assumed representative; established baselines admit only non-spiking eligible windows outside incidents.
- **Rationale:** Smoothing gives finite zero-error behavior, sample-size uncertainty avoids a fixed-only rule, and the increase guard bounds trivial changes. Transactional provenance keeps late events from rewriting decisions without copying every event. A live start boundary avoids unexpected retroactive incidents from preexisting data. Bounded catch-up transactions preserve gap/recovery semantics without one unbounded restart write.
- **Status:** Accepted and implemented in issue #2. Formula examples, parameter semantics and limits are in `docs/detection.md`. Later retention must preserve protected event identities and provenance.

## ADR-026 — Preserve open-incident baseline eligibility across configuration changes

- **Decision:** An open incident retains established baseline eligibility until recovery when configuration changes on restart, including an increased minimum history requirement. Continue freezing baseline membership and enforcing current traffic requirements. Apply the new minimum again after recovery; other configured parameters continue to govern future evaluations.
- **Rationale:** An incident cannot collect additional baseline members while open. Requiring more history would permanently prevent recovery. Preserving eligibility keeps recovery possible without rewriting recorded evaluations or admitting incident traffic into normal history.
- **Status:** Accepted and implemented for issue #2 / PR #9 review finding R1; refines ADR-025.

## ADR-027 — Pin investigation windows and identify demo runs

- **Decision:** Incident evidence URLs carry the evaluation ID and, for Demo, a persisted run UUID. Read evidence using the recorded dataset/service/half-open interval/watermark in one SQLite snapshot; query refinements and later-arrival inclusion never change recorded measurements. Keep a window pinned while the incident progresses. Persist the demo UUID in the existing settings table, including on upgrades; the reset slice must rotate it atomically with reset.
- **Rationale:** An incident's latest abnormal window can change during investigation, and numeric IDs can be reused after reset. Explicit window/run identity prevents links from silently changing meaning. Retained unfiltered evidence counts are compared with recorded totals to distinguish missing evidence from an empty refinement. This reuses ADR-025 provenance without copying log content.
- **Status:** Accepted and implemented in issue #3. Demo reset/retention execution remains issue #6; tests simulate their unavailable-data boundaries. Retention must continue protecting provenance and avoid reusing event sequences beneath retained watermarks.

## ADR-028 — Transactional outbox and bounded crash accounting

- **Decision:** Persist a UUID-keyed notification and its bounded measurement payload in the same transaction as each new opening/recovery transition. A single delivery worker claims an attempt durably, releases the database transaction, and posts through Python `http.client` to the fixed built-in receiver at `127.0.0.1:8000/api/receiver`. No proxies, redirects, or user-supplied destinations. Three attempts, two-second socket timeout, and real-time delays of two then five seconds are fixed for this slice.
- **Rationale:** Atomic transitions prevent lost/duplicate notifications. A claim consumes its attempt even if the process dies; restart records an unknown interrupted outcome and schedules only remaining attempts. Receiver acceptance is persisted under the stable ID, recognizing repeats after a response is lost. This is bounded at-least-once attempt delivery, not an exactly-once network claim. No retroactive notifications are created for pre-upgrade incidents.
- **Status:** Accepted and implemented for issue #4. Demo receiver behavior is captured when each notification is created, so changes affect future Demo notifications only; Live always uses success. Settings and receipts persist. Demo reset and retention remain issue #6, which must serialize against claimed delivery work and remove run-scoped records together.

## ADR-029 — Retention clocks, protected investigations and stable identities

- **Decision:** Clean up on startup before serving requests and hourly thereafter. Use event timestamps and evaluation window ends against a seven-day horizon; use the persisted simulation clock for Demo and real UTC time for Live/Historical. Expire recovered incidents by recovery time only after all deliveries are terminal. Retain every evaluation and its included events for retained incidents, including old windows of recent recoveries and pending deliveries. Also keep the configured latest normal baseline members per service as aggregate metadata. Delete expired incident deliveries, attempts and receipts transactionally. Persist monotonic event/evaluation/incident identity counters in settings, initialized from existing maxima before deletion.
- **Rationale:** Real-time cleanup would immediately erase the deliberately fixed-date Demo. Removing frozen baseline metadata would alter open-incident recovery; preserving only aggregate baseline members bounds that exception per service. An incident and its evidence form one inspectable investigation. Stable identities prevent a late event or old link from being mistaken for deleted evidence after SQLite reuses a row ID. Protected work and SQLite free pages mean this is a retention policy, not a hard storage cap.
- **Status:** Accepted and implemented for issue #6; refines ADR-018, ADR-025 and ADR-027. Expired imported events may disappear at the next cleanup regardless of import time; see `docs/lifecycle.md`.

## ADR-030 — Atomic, run-bound Demo reset

- **Decision:** Serialize reset with the single delivery worker through a process-local lock spanning claim, HTTP and result recording. Wait without holding a database transaction; the receiver uses only its normal database transaction. Then use one immediate SQLite transaction for Demo deletion, receipt/attempt removal, run UUID rotation, reseeding and normal-history evaluation. SQLite serializes evaluation/ingestion with reset. Require the confirmed run UUID and explicit Demo-only confirmation; the UI freezes that UUID when confirmation opens. Demo advance accepts a run guard, used by the UI. Reset receiver behavior to its initial success setting.
- **Rationale:** A claimed old-run HTTP operation must finish before reset removes its records, and queued old-run work must never attach to the replacement run. Atomic reseeding leaves either the complete old run or complete new run after a failure. Run guards prevent stale confirmations and advances from mutating a new run. This uses the existing single-worker boundary without a queue or distributed lock.
- **Status:** Accepted and implemented for issue #6; refines ADR-027/ADR-028. Unguarded legacy API advance calls intentionally address whichever run is current when their transaction starts.

## ADR-031 — Trusted synthetic provenance and immutable analysis previews

- **Decision:** Mark events as trusted synthetic only at the internal seed/simulator insertion boundary. Public ingestion and migrated rows default to unverified, irrespective of metadata or dataset labels. Unpaid Gemini analysis requires every retained event in the selected evaluated window to be trusted synthetic; other incident evidence requires the operator's `GEMINI_PAID_SERVICE=true` declaration for a key linked to an active paid-service billing project. Historical data has no incident-analysis endpoint. Store at most 32 immutable redacted previews in process memory for ten minutes, addressed by unpredictable IDs. Send the stored packet, never client-supplied evidence or a rebuilt query; validate bounded structured claims and all references. Successful repeats reuse the result, failures require explicit retry, restart invalidates previews.
- **Rationale:** A Demo label or caller-provided `synthetic` metadata cannot establish privacy eligibility. Conservative migration avoids inventing provenance for old logs. Short-lived server snapshots bind disclosure consent without storing extra durable copies of log text. A single fixed-host REST integration needs no provider framework. Paid configuration is an operator assertion; the application cannot verify account billing through generateContent. Navigation aborts rendering, not a provider request already sent.
- **Status:** Accepted and implemented for issue #7; refines ADR-011/020/021. Default `gemini-3.5-flash-lite` remains listed in Google's model catalog, checked 2026-09-20 UTC. No live provider call or account quota verified. Demo reset invalidates unsent previews; results are rechecked against run identity after a call. An already authorized in-flight call may finish externally after reset.
