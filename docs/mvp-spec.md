# Intelligent Observability & Event Watchdog MVP

Status: Implemented MVP with the user-authorized bounded product cleanup. Accepted decisions are recorded in [decisions.md](adr/decisions.md).

## Outcome

A developer can run one local application, see an error-log rate spike, inspect the evidence, and observe an actual webhook delivery including retry and recovery. The complete flow works without external credentials.

## User flow

1. Open the dashboard in demo mode with normal history already seeded for three services.
2. Advance the simulation one minute. Repeated downstream timeouts produce a detectable error-log rate spike in one service.
3. Open the incident from the overview. Compare observed and expected error-log rate, inspect the affected interval and repeated message patterns, and follow supporting logs.
4. Filter logs by service, severity, time range, and message text. Clearly distinguish demo, live, and historical data.
   Incident links start with evaluated evidence; users can explicitly include later arrivals, which remain labeled as excluded from the recorded measurement.
5. Inspect the local evidence summary. Optionally preview redacted evidence and explicitly send it for LLM analysis if configured.
6. Inspect the opening webhook's payload and attempts. A controlled first-attempt failure demonstrates a successful retry.
7. Advance through continued abnormal and then normal windows. Abnormal windows update the same incident; three eligible normal windows recover it and enqueue a recovery notification.
8. Reset the demo without affecting live or imported data.

## Architecture

- FastAPI provides the API, serves the built React dashboard, and hosts the local test receiver.
- One application worker runs background evaluation and delivery processing. SQLite persists events, aggregates/evaluation progress, incidents, delivery work, and attempts.
- The React dashboard consumes the API. A separate frontend development server may be used during development; the delivered application runs from one local server.
- Ingestion, evaluation, incident transitions, delivery, and evidence analysis are separate modules within the same application.
- Demo and live data use explicit dataset boundaries and separate evaluation clocks/baselines. Historical imports do not enter live detection.
- Incident transitions and their pending notifications are persisted atomically. Stable delivery IDs let the receiver recognize retries after uncertain HTTP outcomes; transport does not promise exactly-once delivery.
- Use short database transactions; perform HTTP calls outside transactions. The worker resumes persisted pending delivery work after restart.
- Bind to loopback with no login. External webhook destinations, distributed workers, brokers, and hosted deployment are outside scope.

## Ingestion and data lifecycle

- Require timestamp, service, severity, and message; allow metadata and optional event ID. Normalize timezone-aware timestamps to UTC.
- Generate missing IDs. Reused supplied IDs deduplicate within the dataset; conflicting content for the same ID should produce a clear conflict rather than silently overwrite data.
- Share event validation between API ingestion, simulator, and JSON-array upload. Report malformed input without silently dropping events.
- Limit each upload to 5 MB and 5,000 events. Imported data is searchable and chartable, but cannot trigger alerts or train the live detector.
- Evaluate after a configurable late-arrival grace period. Later arrivals stay searchable but do not rewrite evaluated windows or incidents.
- Keep seven days of logs and completed investigations, preserving open-incident evidence and pending delivery work. Exceptions can exceed the routine retention horizon.
- Demo reset affects only demo data and reseeds its baseline. Serialize reset with demo evaluation/delivery so old work cannot attach to the new scenario.
- Validate around three services, 100,000 events, and 20 events/second. These are test targets, not performance claims or hard storage caps.

## Detector and incident behavior

- Metric: ERROR/FATAL events divided by all events, labeled **error-log rate**. This does not measure request failure rate.
- Evaluate completed one-minute windows per service using recent normal history.
- Defaults: 30 prior normal windows, at least 10 baseline windows, at least 20 events in the evaluated window, and three eligible consecutive normal windows for recovery.
- Use a sample-size-aware proportion threshold with smoothing and a minimum increase guard. Document the formula and all parameters; expose configuration rather than burying constants.
- Keep the evaluated window out of its own baseline. Freeze baseline updates during incidents.
- Show learning baseline when history or traffic is insufficient. Missing traffic must not imply health or recover an incident.
- Consecutive abnormal windows belong to one incident. Preserve the evaluated counts, expected rate, threshold, and representative evidence for inspection.
- Volume is a trend, not an additional anomaly detector. Health presentation describes observed log behavior rather than claiming comprehensive platform health.

## Delivery and analysis

- Notify on incident opening and recovery only. Use actual HTTP to the built-in local receiver.
- Allow three total attempts, with default retry delays of 2 and 5 seconds. Display pending, successful, and exhausted delivery states with each attempt's outcome.
- Provide a receiver mode that deliberately fails the first attempt. Persist receiver/delivery identifiers to make retries inspectable.
- Always provide a labeled local evidence summary. Optional LLM analysis adds evidence-linked summaries, possible causes, and next checks.
- Preview the actual redacted payload before explicit send; bind the send to that preview so new logs are not silently added afterward.
- Permit a password-field Gemini key submission to the local backend without restart. Keep the submitted key only in server memory; never persist it, log it, or return it in API responses/errors. Show only configured/not-configured state and provide Clear key. GEMINI_API_KEY remains the environment fallback; model/paid-service settings remain environment-controlled. Preserve preview followed by explicit Send for analysis. Provider failure leaves investigation and local summaries usable.
- Selected provider: Gemini REST API, default model `gemini-3.5-flash-lite`, with `GEMINI_API_KEY` and optional `GEMINI_MODEL`. Restrict unpaid processing to synthetic demo evidence; live/imported evidence needs appropriate paid-service configuration. Document the distinction in the preview and setup guidance; see ADR-021 for official sources.
- Treat log content as untrusted data, validate evidence references in generated analysis, and never present generated causes as proven.
- Explain that basic redaction may miss secrets embedded in arbitrary messages.

## Acceptance criteria

- A documented local startup command serves the API and built dashboard; a fresh run provides seeded demo data.
- Advancing the demo detects a spike, groups repeated abnormal windows, and recovers only after the configured normal-window requirement.
- Sparse traffic and zero-error baseline cases yield finite, documented behavior; absent traffic cannot falsely recover incidents.
- Required-field validation, generated IDs, supplied-ID deduplication, upload limits, and late-event behavior are verified.
- Historical imports and demo activity do not affect live baselines or cause historical alert deliveries.
- Incident details show observed/expected error-log rate and traceable supporting logs; filtering and paging remain usable at the validation dataset size.
- Evaluated-evidence scope excludes later arrivals, and switching to all matching logs identifies those additions without changing incident measurements. Verify the interaction cases in [UI flow](ui-flow.md).
- A real webhook fails once, retries, and succeeds; an always-failing receiver exhausts the configured attempts. Restart resumes pending work without creating duplicate transition records.
- Retention preserves protected investigation evidence and pending work; reset preserves live/imported data.
- With no LLM credentials, the full investigation works and the local summary is labeled. With configured credentials, explicit-send analysis uses exactly the previewed redacted evidence; failures are handled visibly.
- Record whether an actual provider call was tested. Mocked integration tests do not establish live provider success.

## Implementation order

1. API, persistence, event validation, simulator, and deterministic detector tests.
2. Incident transitions, local HTTP receiver, durable delivery, restart and isolation checks.
3. React overview, incident investigation, log explorer, upload, demo controls, and delivery history.
4. Local summaries, optional LLM adapter, retention, end-to-end checks, and run documentation.

Target remains a 4–6-hour MVP from the recorded project start, within the user's 16-hour maximum window. Reassess against measured progress; optional LLM integration is conditional on remaining lightweight.
