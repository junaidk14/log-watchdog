# Error-log rate detection

Detection is per-service and dataset-isolated. It is a heuristic for unusual log severity proportions, not a probability of failure or a failed-request metric. ERROR and FATAL are the numerator; every severity contributes to the denominator.

## Run the scenario

Start the application as documented in the README. Overview opens by default. Demo starts paused at simulation time `2026-01-01 12:00:10Z` with 30 normal minutes for three services. The Demo-only **Try the Demo** guide links to reset, receiver setup and the existing controls. With a fresh run, select **Advance one minute**:

1. `checkout` has 16 ERROR events out of 40 (40.00%) and opens an incident. Investigate shows the recorded baseline and threshold.
2. The second advance produces another 40.00% window and updates the same incident.
3. The third and fourth advances show one and two eligible normal recovery windows.
4. The fifth advance recovers the incident. Its selection and recorded abnormal measurement remain visible. Further advances generate normal traffic.

`api-gateway` and `worker` remain normal. The simulation clock moves only on an advance; each minute includes completion of the configured lateness grace. Advance atomically ingests through the existing event validator/store and commits evaluation, incident changes and clock. Concurrent requests serialize. An uncertain network outcome requires refreshing the clock before trying again; POST advancement is not an idempotent retry operation.

Overview polls every five seconds. Refresh errors retain the last successful result and fetch timestamp. Live evaluation delayed by an additional minute beyond window completion plus grace is explicitly labeled. A paused demo is never labeled delayed. Rate and volume have separate charts with expandable exact-value tables.

## Windows, baseline, and threshold

Windows are UTC minutes `[start, end)`. Evaluate only after `end + grace_seconds`. The evaluated window never enters its own baseline. Eligible warm-up windows train the initial baseline because normality cannot be assessed before enough history exists; warm-up data is assumed representative. After warm-up, only eligible non-spiking windows outside an incident enter normal history. Sparse windows never enter it. History is the most recent configured number of eligible normal windows, not a wall-clock expiration horizon.

Given baseline errors `E`, baseline total `N`, current total `n`, smoothing `a`, multiplier `z`, and minimum increase `d`:

```text
p = (E + a) / (N + 2a)
SE = sqrt(p (1-p) (1/n + 1/(N + 2a)))
threshold = min(1, max(p + z*SE, p + d))
spike = current_errors / n > threshold
```

The smoothed baseline `p` is displayed as expected error-log rate. The increase guard `d` is an absolute proportion (default 0.05 means five percentage points). Strict exceedance avoids flagging equality. The uncertainty term incorporates both the current sample size and prior sample size. This is a documented heuristic; the multiplier is not a calibrated confidence guarantee.

Numerical zero-error examples with default parameters:

| Baseline E/N | Current n | Expected | Threshold |
| --- | --- | --- | --- |
| 0/1200 | 40 | 0.04163197% | 5.04163197% |
| 0/200 | 20 | 0.24875622% | 5.24875622% |

With fewer than the minimum current events, state is **insufficient traffic**, even if a baseline exists. With sufficient current events but insufficient baseline windows, state is **learning baseline**. No traffic yields a null rate, not a healthy zero. During an open incident the baseline remains frozen, including its final recovery window. Three consecutive eligible non-spiking windows recover by default. Sparse, missing, learning, or abnormal windows reset the recovery streak. All further spikes before recovery update the same open incident.

## Configuration

Set `LOG_WATCHDOG_DETECTOR` to a JSON object before starting. Invalid/unknown configuration fails startup. Restart applies new configuration to future evaluations; recorded evaluations preserve their original parameter snapshot and measurements. Existing normal history is retained, and increasing the minimum history can return a service without an open incident to learning. Open incidents retain established baseline eligibility until recovery, even if the new minimum exceeds their frozen history count; current traffic requirements still apply and incident windows never train the baseline. The new minimum history requirement applies again after recovery. Other configuration values, including the maximum history size and comparison parameters, apply to future evaluations as usual. A changed recovery target applies to subsequent windows.

| Key | Default | Meaning |
| --- | --- | --- |
| `baseline_windows` | 30 | Maximum prior normal windows, 1–1440 |
| `minimum_baseline_windows` | 10 | Minimum prior windows; cannot exceed maximum |
| `minimum_events` | 20 | Minimum events for a current or training window |
| `recovery_windows` | 3 | Consecutive eligible normal windows needed |
| `smoothing` | 0.5 | Positive pseudo-count for each outcome |
| `sigma` | 3 | Positive uncertainty multiplier |
| `minimum_increase` | 0.05 | Absolute proportion guard, 0–1 |
| `grace_seconds` | 10 | Lateness grace, 0–3600 seconds |
| `poll_seconds` | 1 | Real worker tick, greater than 0 and at most 60 seconds |

```sh
LOG_WATCHDOG_DETECTOR='{"minimum_increase":0.08,"grace_seconds":15}' .venv/bin/python -m log_watchdog
```

Window length stays one minute. Demo's fixed 30-minute seed demonstrates the spike immediately with defaults; raising history or traffic requirements can leave it learning. No configuration endpoint or configuration UI is introduced.

## Persistence, time, and evidence

Each evaluation persists start/end, observed counts/rate, baseline counts/size, expected rate, threshold, status, baseline membership, incident identity, parameters, and a maximum event insertion sequence. Included events are precisely those matching the recorded dataset, service, `[start,end)` and `sequence <= watermark`. Counts and watermark are read in the same SQLite write transaction; later ingestion cannot interleave with that decision. Existing event rows are immutable. Late arrivals remain searchable but cannot change recorded evaluations or incidents. Implemented retention/reset preserves protected provenance and does not reuse retained sequence identities; see [lifecycle](lifecycle.md).

Live detection starts at the current UTC minute on its first installation. Previously stored live events before that cursor remain browsable and do not retroactively alert or train history. New services learn only from windows evaluated after the dataset cursor; sending old timestamps does not rewind it. On restart, a persisted cursor catches up chronologically, including empty gaps that break recovery. Each transaction processes at most 240 minutes; subsequent worker ticks continue until current. The worker runs in a thread through the FastAPI lifespan, so the event loop remains responsive; failed evaluation rolls back and logs an error before retrying. Overview's cursor exposes lag.

Demo uses a separate persisted cursor and clock. Historical is not accepted by the detection API or evaluator. No historical event trains a live/demo baseline. Real ingestion timestamps remain available in Logs.

API:

- `GET /api/datasets/{demo|live}/overview`: progress, current config, latest per-service evaluations, recent 30-minute trends, incidents with their latest abnormal measurement, real server time and delayed flag.
- `POST /api/demo/advance`: commits one synthetic minute and returns the demo overview.

Opening/recovery transitions enqueue notification work atomically with detection; the separate [delivery worker](deliveries.md) performs HTTP outside the transaction. [Lifecycle](lifecycle.md) governs retention/reset and [UI flow](ui-flow.md) describes evaluated-evidence navigation.
