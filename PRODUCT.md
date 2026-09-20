# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

User-selected: Python with FastAPI and SQLite, plus a lightweight React dashboard. FastAPI serves the built frontend as one localhost application with a single worker and background evaluation/delivery loop. Frontend build tooling remains an implementation choice.

## Users

A single developer investigating application or platform logs locally. The MVP also supports evaluating the complete workflow through a reproducible seeded scenario, without external credentials.

## Product Purpose

Ingest structured logs, detect unusual increases in a service's error-log rate, surface log trends, and help the user investigate what changed using supporting evidence. Success is a complete investigation from anomaly detection through log inspection, actual local webhook delivery, retry, and recovery.

## Positioning

An explainable local observability MVP with a reproducible incident demonstration. Statistical detection works without external AI; optional LLM analysis helps interpret evidence. No claim of unique market position, production readiness, or comprehensive platform health has been established.

## Operating Context

- Runs on localhost for one user, without authentication or hosted infrastructure.
- Primary flow: overview → incident → filtered logs → delivery history.
- The overview is incident-first: active problems and investigation take priority over service trends. The UI should feel like a lightweight SRE operations console with scanable information, clear severity states, and useful trends.
- The selected Incident workbench keeps the incident queue beside its evidence pane on desktop. Incident log links open evaluated evidence first, with an explicit option to include later arrivals that did not change the recorded measurement.
- The seeded scenario covers three services and a spike caused by repeated downstream timeouts.
- Isolated demo data uses a simulation clock with an "Advance one minute" control. Live operation uses real time; both exercise the same ingestion and detector logic. Webhook delivery and retries stay real-time.
- Structured JSON arrives through the API, simulator, or bounded file upload. Historical imports support browsing and trends without triggering alerts or training live baselines.
- The user delegates implementation and fixes to the agent; manual code edits are not part of the workflow.

## Capabilities and Constraints

- Label the metric **error-log rate**: ERROR/FATAL events divided by all events for a service. It is not failed-request rate. Volume is a trend, not an additional anomaly detector.
- Compare completed one-minute windows with recent service-specific normal history using configurable statistical thresholds. Describe detection as a heuristic, not a probability of failure.
- Show **learning baseline** when history or traffic is insufficient. Missing data must not imply health or incident recovery.
- Group consecutive abnormal windows into one incident and recover after sustained eligible normal behavior. Preserve observed versus expected rate, service, time window, repeated patterns, and supporting logs.
- Require timestamp, service, severity, and message; allow optional metadata and event ID. Generate missing IDs; supplied IDs enable deduplication. Use UTC timestamps. Late arrivals do not rewrite evaluated incidents.
- Uploads accept JSON arrays bounded to 5 MB and 5,000 events.
- Send actual HTTP notifications on opening and recovery to the built-in local receiver only. Persist delivery state and attempt history; allow three attempts and resume pending work after restart.
- Always provide a clearly labeled local evidence summary. Optional LLM output supplies evidence-linked summaries, possible causes, and next checks, never alert decisions or definitive root causes.
- External analysis requires preview and an explicit "Send for analysis" action. Credentials and provider settings come only from environment variables. Basic redaction does not guarantee removal of secrets in arbitrary messages.
- Gemini is the delegated provider selection, conditional on lightweight integration. Unpaid processing is limited to synthetic demo evidence; real-log analysis needs appropriate paid-service configuration. The REST integration is implemented and tested with controlled responses; live account access remains unverified.
- Apply seven-day retention to logs and completed investigations while preserving open incidents, their evidence, and pending deliveries. Demo reset clears and reseeds only demo data.
- Three services, approximately 100,000 stored events, and roughly 20 events/second are design/test targets, not performance guarantees.
- Defer arbitrary text parsing, external platform connectors, arbitrary webhook destinations, multi-user hosting, acknowledgment, assignment, and escalation.
- Target a 4–6-hour MVP within the user's maximum 16-hour project window. The start timestamp and wall-clock reporting convention live in `prompts.md`.

## Evidence on Hand

- [Architectural decisions](docs/adr/decisions.md): confirmed choices and rationale.
- [MVP specification](docs/mvp-spec.md): approved workflow and acceptance criteria, implemented across issues #1–#7.
- [Domain glossary](CONTEXT.md): agreed terminology.
- [Tooling inventory](docs/tooling.md): used and planned tools.
- The repository contains the implemented local application, seeded demonstration and measured synthetic validation. The UI distinguishes simulated evidence from real operational data; these measurements are not performance guarantees. See docs/final-validation.md for current verification limits.

## Product Principles

1. Make the complete investigation useful without external credentials.
2. Keep conclusions traceable to evidence and clearly express uncertainty.
3. Preserve the distinction between demo, historical, and live data.
4. Make delivery failures and recovery inspectable and reproducible.
5. Favor a bounded local workflow over integration and infrastructure breadth.

## Open Product Details

- "Intelligent Observability & Event Watchdog" is the working project description; no final brand identity or assets have been established.
- No product-specific accessibility standard or additional device audience has been specified. This does not waive ordinary accessible interface implementation.
- All seven approved issues have merged. Final refinement and handoff are authorized separately; no external submission or deployment is authorized.
