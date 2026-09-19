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
