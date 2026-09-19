# Observability and Event Watchdog

A local tool for investigating application and platform logs, detecting unusual behavior, and inspecting simulated alert delivery.

## Language

**Anomaly detection**:
Local statistical or ML analysis that identifies unusual behavior in ingested logs without external credentials. Fixed rules alone do not satisfy this capability.

**Seeded scenario**:
A reproducible demonstration in which repeated downstream timeouts cause a service's error-log rate to spike.

**AI-assisted analysis**:
Optional LLM-generated incident summaries, possible causes, and suggested next checks linked to evidence. This analysis does not decide whether alerts fire or establish a definitive root cause.

**Simulated webhook flow**:
Actual HTTP delivery to a local test receiver, including visible payloads, results, and a bounded retry demonstration.

**Baseline**:
A service's recent normal behavior used to evaluate whether its error-log rate is unusual.

**Learning baseline**:
A state indicating insufficient history or traffic to evaluate a service for anomalies. It does not establish that the service is healthy.

**Incident**:
A grouped investigation of consecutive abnormal windows for a service, with observed and expected behavior and supporting log evidence.

**Recovered**:
An incident state reached after sustained normal behavior.

**Historical upload**:
Imported JSON events available for browsing and trends that do not trigger alerts.

**Error-log rate**:
The number of ERROR/FATAL events divided by all events for one service in a time window. It is not a failed-request rate.
_Avoid_: Request failure rate, unqualified error rate

**Event ID**:
An event identifier supplied by a producer or generated when absent. Reusing a supplied ID enables ingestion deduplication.

**Delivery attempt**:
One HTTP attempt to deliver an incident opening or recovery notification to the local receiver, with an inspectable outcome.

**Simulation clock**:
The demo's logical time, advanced one minute at a time to exercise the normal detector quickly. Webhook attempts still follow real time.

**Local evidence summary**:
A non-LLM summary of observed behavior, repeated patterns, and supporting logs available without external credentials.
