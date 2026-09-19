## What to build

Advance an isolated seeded scenario and watch an error-log spike create an incident in the overview, update across abnormal windows, and recover after sustained eligible normal behavior. The same detector also evaluates live ingestion with the real clock.

## Acceptance criteria

- [ ] Demo uses a labeled simulation clock and Advance one minute control. Preloaded normal history makes the first spike demonstrable immediately; advancing uses the same ingestion and detector logic as live operation.
- [ ] Detect per-service ERROR/FATAL events divided by all events and label the metric error-log rate. Evaluate completed one-minute windows after configurable lateness grace; compare only with prior normal history.
- [ ] Use an explainable sample-size-aware proportion threshold with smoothing and an increase guard; document the formula and expose all thresholds/sample sizes as configuration. Defaults are 30 prior normal windows, 10 minimum baseline windows, 20 events per evaluated window, and 3 consecutive eligible normal recovery windows.
- [ ] Show learning baseline or insufficient traffic explicitly. Keep a tested numerical result for zero-error history and small samples; no evaluation window enters its own baseline, and baseline updates freeze during an incident.
- [ ] Consecutive abnormal windows update one incident. Normal eligible windows display recovery progress; abnormal or ineligible gaps break the consecutive normal run. Missing traffic never indicates recovery or health.
- [ ] Persist evaluation progress, counts, baseline, threshold, incident interval/state, and event-inclusion provenance so late arrivals cannot rewrite evaluated results and later investigation can identify evaluated events.
- [ ] An incident-first overview and minimal incident detail display observed versus expected error-log rate, affected service, time window and state; charts show error-log rate and volume as separate concepts.
- [ ] Show simulation time separately from live event time, distinguish paused demo from delayed evaluation, and preserve last results with an actionable refresh error. Deterministic tests cover spike/no-spike, warm-up, zero variance/history, grouping, recovery, late events, restart, and demo/live isolation.

## Blocked by

- https://github.com/junaidk14/log-watchdog/issues/1
