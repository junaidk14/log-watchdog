# Rendered UX cleanup — 2026-09-20

Scope: one focused refinement of page responsibilities, next-action hierarchy, alignment and Gemini copy on top of `3975f1b`. No backend, detector, storage, provider or architectural changes.

## Rendered findings and response

| Finding before edits | Response |
| --- | --- |
| Investigate already navigated correctly. Overview could still mount full investigation when its URL retained an incident. | Preserve the working navigation; mount the evidence pane only in Incidents. Overview never marks a retained incident as selected. |
| Two table columns squeezed measurements and their action into the narrow incident queue. | Use full-width semantic list rows with a clear Investigate action. Keep observed/expected, measurement interval and incident interval distinct. |
| Repeated measurements and lifecycle metadata pushed the primary log action below the first desktop viewport. | Lead evaluated evidence with a primary log action, delivery action and Gemini jump. Keep the selected-window comparison visible; disclose full timeline/baseline detail separately. |
| Gemini setup followed every sample event. | Put optional analysis after the local summary, before samples, with a focusable jump from the action row. Keep sample links mounted for focus restoration. |
| Historical import was reachable and rendered correctly; the native file control was visually inconsistent. | Preserve its existing direct link/selector flow; align the file control and shared input/button geometry. |
| Receiver configuration took priority over actual delivery results, especially on narrow screens. | Show notification history before secondary receiver settings. Preserve payload/attempt disclosure and receiver behavior. |
| Checkbox labels stacked unnecessarily; controls inherited inconsistent typography/margins; mobile navigation wasted vertical space. | Inline the evidence-scope checkbox, use common control geometry and panel spacing, regular-weight input text, and compact wrapping navigation. Cap the shared main content width. |
| Key lifetime copy was lengthy and the official key-acquisition path was missing. | Concise server-memory/fallback copy, persistent checked configuration state outside the disclosure, and **Get Gemini API key** linking to [Google AI Studio](https://aistudio.google.com/apikey). Destination verified against [Google's key documentation](https://ai.google.dev/gemini-api/docs/api-key). |

The memory-only key implementation is unchanged. No key is fetched back, persisted or displayed. Saving is separate from preview; preview is separate from explicit Send for analysis. No real credential or Gemini call was used.

## Browser verification

Used the requested Playwriter CLI. The extension did not connect even after the user enabled it; Playwriter's supported **local headless Chrome** mode did work. This is actual browser rendering and interaction, not jsdom. Chrome DevTools MCP was not needed. The app used `/tmp/log-watchdog-rendered-ux.sqlite3`, separate from user data.

- Inspected the running UI before editing; captured Overview, Incidents, Logs, Historical, Gemini and delivery states.
- After changes, inspected desktop **1440 × 1000** and narrow **390 × 844** layouts. Main content showed no horizontal overflow in the inspected narrow incident, Logs, Historical and delivery states. Log tables retain intentional contained horizontal scrolling.
- Overview → Investigate opened Incidents with the correct incident and evaluated window; title was `Incidents · Log Watchdog`. Keyboard activation focused `incident-heading`; Tab continued to Back to incidents.
- Keyboard-opened evaluated Logs focused `logs-heading`. Browser Back restored `evaluated-logs`; Forward restored Logs. Explicit return from delivery history restored `incident-deliveries`.
- Delivery payload/attempt expansion showed the actual local HTTP 200 acceptance. Receiver configuration remained available below history.
- Historical file chooser → import inserted one synthetic event with zero duplicates. Browse file interval displayed that event. No detector or delivery work was created by import.
- Gemini setup accepted only a synthetic test string, emptied the password input and showed Configured. Local evidence preview exposed the distinct Send button, which was **not activated**. Clear key restored Not configured and removed the preview/Send control.
- Demo advance opened the seeded incident. Reset confirmation described its Demo-only effect; cancel restored focus to `reset-demo`.
- Console logs were empty and failed-response/request collection was `[]` during the checked flows. Only URLs/statuses were captured, never request bodies/keys. Occasional Playwriter snapshot/navigation timing errors were resolved by waiting for the observed destination control and taking a fresh snapshot; these were tooling errors, not app console errors.

Screenshots are retained under `/tmp/watchdog-before-*.png` and `/tmp/watchdog-after-*.png`, including `watchdog-after-incidents.png`, `watchdog-after-overview-desktop.png`, `watchdog-after-gemini-desktop.png`, `watchdog-after-gemini-narrow.png`, `watchdog-after-historical-narrow.png` and `watchdog-after-deliveries-narrow.png`. These are local verification artifacts, not externally published assets.

## Automated verification

- 87 frontend tests passed, including unchanged Back/Forward/failure restoration cases, summary-only Overview with a retained incident URL, Gemini jump focus and official key link.
- 132 backend tests passed, including actual HTTP tests. The coordinator stopped only its own temporary server first. Existing two Starlette/AnyIO deprecation warnings remain.
- Production build, TypeScript, ESLint, Prettier, Ruff lint/format, mypy and static text/focus contrast passed. Impeccable source detector returned `[]`.
- A queued animation-frame focus callback could steal focus from an immediately selected next control; it now checks whether focus has already moved, while allowing restoration after a removed control. Existing regressions and real-browser keyboard checks passed.
- Full real-HTTP runtime validation passed: 100k events, paced ingestion, assets/favicon, historical upload/restart, 40 evaluated versus 41 broader events, opening/recovery delivery, HTTP 503 → process restart → 200 with the same delivery ID, Demo reset isolation and real-clock worker evaluation. Synthetic key save/status/clear and preview checks made no provider call.

Logs: `/tmp/watchdog-ux-tests-final.log`, `/tmp/watchdog-rendered-ux-backend.log`, `/tmp/watchdog-rendered-ux-runtime.log`.

## Remaining UX assessment

- **P0/P1: none found** in the inspected flows.
- **P2: none found** in this bounded pass.
- **P3:** Full UTC timestamps and representative log samples remain verbose on narrow screens. Precision and direct evidence links were retained deliberately; further density tuning is optional.

Coverage limits: local headless Chrome only, not the user's extension-connected tab, physical mobile devices, other browser engines or a complete assistive-technology audit. Live Gemini success remains unverified and requires user approval before any provider call. No external submission or deployment.
