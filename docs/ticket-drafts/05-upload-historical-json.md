## What to build

Import a small JSON log file from the dashboard, see validation feedback, and browse its events and trends in a clearly historical context without affecting live detection.

## Acceptance criteria

- [ ] The dashboard provides a lightweight JSON-array upload with limits of 5 MB and 5,000 events and communicates both limits before submission.
- [ ] Upload uses the same event schema, validation and optional-ID semantics as API ingestion; invalid data gets specific row/field feedback and no misleading success state.
- [ ] Imported events persist in historical scope and are searchable through the existing explorer with clear dataset/time context; show error-log rate and volume trends without calling historical imports live incidents.
- [ ] Historical imports are excluded from live detector baselines and alert generation by the shared dataset eligibility rules. Do not block delivery of this ticket on the detector: prove eligibility exclusion locally, then cover the integrated behavior when that path exists.
- [ ] Show progress, completion counts, duplicate counts, and actionable malformed/oversized/file-read errors; retain usable input context after failure.
- [ ] Tests cover boundary limits, invalid rows, deduplication and isolation; an end-to-end upload-to-filtered-log walkthrough demonstrates the complete feature with keyboard-accessible controls.

## Blocked by

- https://github.com/junaidk14/log-watchdog/issues/1
