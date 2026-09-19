## What to build

Select an incident in a persistent workbench, understand its repeated error patterns, and drill into exactly the evidence used for detection. Complete the investigation without an LLM.

## Acceptance criteria

- [ ] Desktop incident selection updates an adjacent evidence pane while retaining the queue; selected incident identity lives in the URL. Refresh and recovery preserve selection, focus, and scroll position rather than silently choosing another incident.
- [ ] On narrow screens, detail is full-width with a visible Back action. Navigation between overview, incident, logs and the eventual Deliveries destination preserves dataset, incident, service, interval, and compatible filters.
- [ ] Incident detail shows observed/expected error-log rate, evaluated numerator and denominator, threshold, affected interval, repeated patterns, and representative supporting logs labeled as a sample.
- [ ] View evaluated logs defaults to events included in detection. Include later arrivals explicitly expands to broader matching logs and marks excluded additions without changing incident measurements; switching back restores evaluated scope.
- [ ] Query matching counts are distinguished from evaluated totals. Clearing query refinements preserves incident scope; leaving incident scope is explicit. Missing retained evidence and reset-demo URLs have specific explanations.
- [ ] A clearly labeled local evidence summary explains observed changes and possible next checks with working evidence links, without definitive root-cause claims or any external credentials.
- [ ] Implement named row actions, selected-versus-focused semantics, pane heading focus, return-focus restoration, accessible log expansion, chart text equivalents, and restrained announcements that do not fire for every log or refresh.
- [ ] Integration tests verify evidence membership and late-arrival behavior. A keyboard-only and narrow-screen walkthrough verifies selection stability, filtering, Back behavior, summary links, and recovery updates.

## Blocked by

- https://github.com/junaidk14/log-watchdog/issues/2
