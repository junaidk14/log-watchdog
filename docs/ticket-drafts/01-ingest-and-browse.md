## What to build

Start Log Watchdog locally, send structured events to its API, and inspect persisted events in a usable React log explorer. This is the first complete path through ingestion, storage, API reads, and the interface.

## Acceptance criteria

- [ ] A documented startup command serves the built React dashboard and FastAPI API from one loopback-only application worker backed by SQLite; no login or external credentials are required.
- [ ] Structured ingestion requires timestamp, service, severity, and message; accepts optional metadata and event ID; normalizes timezone-aware timestamps to UTC; generates missing IDs and returns useful validation errors without silently dropping invalid events.
- [ ] Repeated supplied event IDs deduplicate within a dataset; conflicting content for a reused ID produces an explicit conflict. Retrying events without supplied IDs is documented as non-deduplicating.
- [ ] Demo, live, and historical dataset identity is represented from the start; demo and live events cannot leak into each other's results. A fresh application seeds normal history for three demo services through the shared ingestion logic.
- [ ] The React Logs destination supports service, severity, UTC time-range and message filters, paging, matching counts, expanded metadata, and clear loading/empty/error states. URL filters and Back preserve context.
- [ ] Apply the selected Incident workbench visual direction to the working shell and log explorer. Required keyboard controls, visible focus, narrow-screen overflow handling, and readable severity labels are demonstrated.
- [ ] API/integration tests cover persistence across restart, schema rejection, ID generation/deduplication/conflicts and dataset isolation. Record measured browsing/ingestion behavior around 100,000 events and 20 events/second as validation results, not guarantees.
- [ ] Update the prompt audit and tooling inventory, record any newly made material decisions, and document actual implemented design tokens as the UI takes shape.

## Blocked by

None (can start immediately).
