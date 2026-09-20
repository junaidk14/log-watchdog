# Validation and limitations

Current documentation snapshot: 20 September 2026. Counts below identify the scope and revision of each pass; earlier reports are historical evidence, not claims that every suite was rerun after every CSS edit.

## Current state

All seven MVP issues completed the implementation → independent review → fix/re-review → merge gates (PRs #8–#14). PR #15 merged into `main` at `23118c6`. Subsequent user-authorized cleanup, rendered UX, key fixes, copy/layout, Demo guidance, motion and theme work is on `cleanup-main-flows`; do not infer that these later commits are already on `main` or independently reviewed. No runner is active and no external submission/deployment has been made.

## Verification ledger

| Scope | Recorded result | Evidence |
| --- | --- | --- |
| Current theme/frontend | 97 tests in 8 files; build/TypeScript, ESLint, Prettier passed | `/tmp/watchdog-theme-tests.log`; [UX record](verification-ux.md) |
| Light/dark palette | 23 text/control/focus pairs per theme pass their 4.5:1 text or 3:1 control/focus thresholds | `scripts/check_contrast.py`; source ratios, not WCAG certification |
| Latest backend changes | 78 API/analysis tests passed after key-shape and service-choice fixes; Ruff lint/format, mypy passed | `/tmp/watchdog-readability-backend.log`; [UX record](verification-ux.md) |
| Latest full backend/runtime pass | 132 backend tests and real-HTTP runtime validator passed at rendered UX cleanup, before the later key/filter additions | `/tmp/watchdog-rendered-ux-backend.log`, `/tmp/watchdog-rendered-ux-runtime.log` |
| Original handoff | 121 backend / 81 frontend tests plus full runtime passed before PR #15 | Historical logs under `/private/tmp/log-watchdog-final-checks/` |

Current theme work changes frontend presentation and the contrast script only. No full backend/runtime rerun is claimed for it. Known test-environment diagnostics include jsdom canvas support and Starlette/AnyIO deprecations; no checks were disabled. Temporary logs/screenshots may disappear when the OS cleans `/tmp`; the committed descriptions preserve their scope and outcome.

## Rendered browser evidence

Playwriter local headless Chrome became available after initial in-app browser discovery failed. Earlier “browser unavailable” reports remain accurate for those original runs, but are no longer the current validation status.

Recorded rendered checks cover desktop/narrow Overview, selected Incidents, evaluated Logs, Historical upload, Deliveries and Gemini setup; keyboard selection and expansion; Back/Forward restoration; Demo controls; synthetic key save/preview/clear; and a prior actual local HTTP 200 delivery. Later targeted passes covered old-Demo privacy guidance, fresh-synthetic preview, compact copy/layout, the four-step Demo walkthrough and reduced-motion micro-interactions. Theme validation adds system preference, persistence, accessible switching and both palettes on main pages at 1440px/390px. Details and scope boundaries are in [the dated UX record](verification-ux.md).

Later port-8001 fixtures disable delivery workers so they cannot post into the user's port-8000 app. Their pending notifications establish UI creation/navigation, not a new real-HTTP retry test. Gemini response animation was verified with a browser-intercepted mock, never a live provider request.

## Runtime and scale evidence

The full runtime script uses a temporary database and real loopback HTTP. Recorded checks include:

- Served dashboard/assets/favicon; persistence and dataset isolation across restart.
- 40 evaluated events versus 41 broader events after a late arrival; pinned filters/sample evidence.
- Open → continued spike → recovery 1/3 → 2/3 → recovered.
- HTTP 503 → process restart → HTTP 200 with the same delivery ID; separate opening/recovery notifications.
- Demo reset/stale-run rejection, Historical import/restart, and an actual real-clock worker window.

Original handoff measurements on Python 3.14.5/macOS arm64: 100,000 events ingested in 1.500s; browsing medians 3.14ms first page, 5.10ms page 2000, 9.31ms filtered; 100 paced events in 4.960s with 4.86ms median ingestion. These dated synthetic measurements are not production guarantees or measurements of the latest revision.

## Review history

PRs #8–#14 received independent reviews and fixes for timestamp overflow, recovery eligibility, navigation/focus, upload validation, stale Demo runs and malformed provider responses. The repo-wide Standards and Spec reviews at `a74989466e8fd2b4e50982fc59a794bd6b834b93` (baseline `b63023517099daacb05f1e606a3d3ccdb287ffbc`) both passed with zero findings before PR #15. The bounded cleanup's separate review findings and fixes are in [its report](verification-cleanup.md). Those reviews do not automatically cover later user-directed refinements.

Generic AFK runner files were preserved. Logs remain under `/private/tmp/log-watchdog-afk-logs/`; [ticket index](ticket-drafts/README.md) links the original scope.

## Limitations

- Local single-user MVP, one process on loopback port 8000; no authentication, arbitrary webhook destinations, hosting or external connectors.
- No cloud compute, hosted database, cloud storage or deployment resources were provisioned or used for the application. GitHub and AI coding tools were used during development. Optional Gemini is an external API; no live application-to-Gemini call, account quota or output-quality validation is claimed.
- Browser evidence is headless Chrome, not physical mobile devices, every browser engine, a complete screen-reader/zoom audit or accessibility certification. Opened native select menus retain platform styling.
- Statistical detection is a heuristic, not a probability of failure. Retention exceptions are not a hard storage cap. Basic redaction cannot guarantee removal of secrets.
- Exact evidence timestamps remain verbose at narrow widths. No P0/P1/P2 was found in the bounded UI checks; this is not a guarantee that no defects exist.

Run current checks using [README verification commands](../README.md#verify). Full backend HTTP tests/runtime require port 8000 exclusively; do not silently stop a separately launched user app.
