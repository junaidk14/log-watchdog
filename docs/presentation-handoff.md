# Presentation handoff

Source revision: `87eb461` on `cleanup-main-flows`; captured 20 September 2026. This package changes documentation/assets only and has not been submitted externally.

**Project:** Log Watchdog is a local, API-first observability MVP that turns structured logs into explainable incidents, inspectable evidence and traceable webhook notifications.

**Problem:** Developers need to connect an unusual error spike to the relevant logs and notification outcome without navigating disconnected tools or assuming an AI explanation is a proven root cause.

**Core journey:** Overview → Investigate → selected Incidents workspace → evaluated Logs → delivery history → optional Gemini evidence preview and explicit Send.

## Architecture and detection

FastAPI serves the React/TypeScript dashboard and JSON API; SQLite stores events, evaluations, incidents and durable delivery attempts. One local process runs evaluation, delivery and retention tasks. Notifications go only to the built-in loopback receiver. Gemini is an optional external REST integration.

Each completed minute compares a service's **error-log rate** (ERROR/FATAL logs divided by all its logs) with its own recent normal history. A configurable statistical heuristic accounts for sample size and a minimum increase; it is not failed-request rate or a probability of failure. Insufficient history/traffic is explicit. Consecutive spikes update one incident; three eligible normal windows recover it. Later logs do not rewrite evaluated evidence.

## Demo in five steps

1. On Demo Overview, follow **Try the Demo**: Reset demo and confirm.
2. In Deliveries, choose **Fail first, then succeed** and save.
3. Return to Overview and advance one minute: checkout produces repeated downstream timeouts and a 40% error-log-rate incident.
4. Investigate, open evaluated logs and inspect notification attempts. The retry uses real time, independently of the simulation clock.
5. Advance four more minutes: one continued spike, then three normal windows. Show recovery and its separate notification.

## Capabilities and development workflow

- Isolated Demo, Live and Historical datasets; structured API ingestion, deduplication and JSON import (5 MB / 5,000 events).
- Incident queue, observed/baseline measurements, patterns, supporting logs and credential-free local summary.
- Persisted notification attempts, three-attempt limit and restart recovery; seven-day retention with protected investigations/evidence.
- System-aware light/dark themes, accessible controls and focus/history restoration.
- Memory-only Gemini key override with environment fallback; preview/redaction and explicit send. No chat, autonomous remediation or external actions.

Codex shaped the bounded spec, recorded ADRs, created GitHub tickets/blockers and used the reusable AFK runner: **fresh implementation → PR → independent read-only review → fixes/re-review → merge**. All seven MVP issues passed those gates. Later user-directed cleanup is on the cleanup branch and is not automatically covered by the earlier independent reviews. Prompts, tooling and verification records preserve the audit trail.

## Validation and limits

Latest frontend/scroll pass: **97 tests**, TypeScript, ESLint, build and formatting passed; both palettes have **23 contrast checks**. Playwriter checked desktop/narrow flows, keyboard and Back/Forward. Latest backend changes passed 78 targeted API/analysis tests; the earlier full pass had 132 backend tests plus real-HTTP runtime checks. These are scoped historical results, not a newly rerun full suite for this package. The 100k-event/~20-events-per-second exercises were synthetic targets, not production guarantees.

Local single-user, localhost-only, no authentication or external platform connectors. Detection is heuristic; redaction cannot guarantee secret removal. Physical devices, other browser engines and a full screen-reader/zoom audit remain unverified. No live Gemini access/output-quality claim is supported by the repository validation record. **Tagle:** no result found in current repository documentation; omit a result unless independently confirmed.

**Infrastructure:** No cloud compute, hosted database/storage or hosted application environment was provisioned or used. GitHub and AI development services were used; optional Gemini is an external API, so do not describe the entire development process or optional analysis as cloud-free.

## Screenshot manifest

Playwriter local headless Chrome, dark mode, consistent **1600 × 1200 CSS-pixel desktop viewport**, without browser chrome. Full-page images retain content below the fold; Gemini uses a focused section capture from the same viewport. No screenshot contains a real key or Gemini analysis output.

| Asset | Content / suggested caption |
| --- | --- |
| [overview.png](screenshots/overview.png) | Try the Demo, recovered checkout incident and all three service trends; full page |
| [incidents.png](screenshots/incidents.png) | Selected recovered incident with its abnormal window, baseline, patterns and local summary |
| [evaluated-logs.png](screenshots/evaluated-logs.png) | Opened through View evaluated logs, then filtered to ERROR: 16 matching logs from 40 evaluated events |
| [deliveries.png](screenshots/deliveries.png) | Opening notification delivered with recorded HTTP 200 attempt expanded; recovery notification separately exhausted after three attempts; full page |
| [historical.png](screenshots/historical.png) | Real UI import of 60 synthetic events; four ERROR rows shown, trends use all 60; full page |
| [gemini-setup.png](screenshots/gemini-setup.png) | Not configured, empty key field, memory-only guidance, Clear key and Preview controls; setup section only |

Capture provenance: a separate copy of the earlier synthetic browser-verification database supplied the recovered incident and genuine recorded delivery outcomes. Workers were disabled during capture; no new delivery or Gemini call occurred. Historical events were generated solely for this package and imported into that copy. The running user app/data was untouched. No screenshots were skipped. Delivery images do **not** show a 503→200 retry success sequence; do not caption them as one.

Before assembling the final deck: review crops/text size at slide scale, add the user's separate Gemini response screenshot and confirm its provenance/privacy before claiming live-provider success, and confirm any Tagle result. Verify branch/merge status before describing the cleanup as released.

## Repository references

[README](../README.md) · [Documentation index](README.md) · [MVP spec](mvp-spec.md) · [ADR decisions](adr/decisions.md) · [Tooling](tooling.md) · [Prompt audit](../prompts.md) · [Final validation](final-validation.md) · [Presentation source](presentation.md).
