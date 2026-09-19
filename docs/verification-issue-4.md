# Issue #4 verification

Executed 2026-09-19 UTC on macOS 15.6 arm64, Python 3.14.5, repository virtual environment and installed frontend lockfile dependencies. Synthetic isolated temporary SQLite databases only. No external webhook, provider, or real user logs were used.

## Eligibility

Full paginated ready-issue enumeration returned #4, #5, #6, #7 and full paginated open-PR enumeration returned none. All four issue comments and native dependencies were fetched. Native and textual graph agrees with approved scope: #4 requires completed issue #2; #5 requires completed issue #1; #6 waits for open #4/#5 (issue #3 completed); #7 requires completed issue #3 but follows core under project policy. Issue #4 is lowest executable. Immediately before branching and again before PR creation, #4 remained open and ready, issue #2 remained closed, no open PR claimed it, and remote main remained `b374e98902cc540f099bdde5e9257be2d152f0a6`.

## Completed checks

| Exact command | Result |
| --- | --- |
| `npm --prefix frontend run build` | Passed, TypeScript and Vite production bundle |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run lint` | Passed |
| `npm --prefix frontend run format:check` | Passed |
| `npm --prefix frontend test` | 53 tests passed across 4 files on final run |
| `.venv/bin/ruff check log_watchdog tests scripts` | Passed |
| `.venv/bin/ruff format --check log_watchdog tests scripts` | Passed, 14 files |
| `.venv/bin/mypy` | Passed, 8 source files |
| `.venv/bin/python scripts/check_contrast.py` | Passed, existing token pairs 5.19:1–14.24:1; static check only |
| `.venv/bin/pytest -q` | 56 passed; 2 existing Starlette/httpx/anyio deprecation warnings |
| `.venv/bin/python scripts/validate_runtime.py` | Passed actual launcher, HTTP, persistence, notifications, performance and real clock |
| `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/Deliveries.tsx frontend/src/EvidencePane.tsx frontend/src/Overview.tsx frontend/src/App.tsx frontend/src/Router.tsx frontend/src/styles.css` | No mechanical findings (`[]`) |
| `git diff --check` | Passed |

Initial development checks exposed socket reuse in the HTTP fixture, test timer interception and long lines; corrected and rerun successfully. The separate Impeccable finish reviewer identified an unwrappable control label and announcement delta defects. Both were fixed, covered where meaningful by DOM tests, and scored resolved on its focused source verdict. Ordinary-extension documentation comparison preserved the design files and reported their preexisting stale descriptions; no redesign or drift repair was added.

Backend coverage includes transition rollback, one notification per opening/recovery, no abnormal-update duplicates, dataset/run boundaries, restart/no backfill, actual FastAPI HTTP 503→200, actual three-503 exhaustion, real 2/5-second schedules unaffected by simulation advancement, receiver ID recognition, settings validation, payload bound, and interrupted attempt consumption. A mocked TimeoutError verifies failure accounting; actual HTTP tests cover controlled statuses. A simulated abrupt claim interruption verifies unknown outcome and exhausted final-attempt handling. Actual process restart is separately exercised below.

Frontend coverage includes Enter expansion with focus retained, literal payload rendering, stable expanded content under status updates, empty-to-first/new/changed announcements without unchanged repetition, exhaustion independent from incident recovery, no resend, historical empty state, initial loading, refresh errors/retry with retained results, receiver save, and axe DOM rules. Router tests execute incident → Deliveries → explicit/browser Back and restore the originating action plus pinned evaluation/run context.

## Actual runtime evidence

- Started the documented launcher on loopback with a fresh temporary database and verified dashboard plus compiled JavaScript over HTTP.
- Configured fail-first-then-succeed, opened the Demo incident, observed HTTP 503 and a scheduled retry, terminated/restarted the actual application process using the same SQLite file, then observed HTTP 200 with the same delivery ID and `[503,200]` attempt history.
- Advanced through two abnormal windows and three eligible normal windows; one opening and one recovery notification both delivered. Live/Historical notifications remained empty. Incident state and stable evidence survived another process restart.
- Measured 100,000 bulk synthetic events in 1.340 seconds; first-page browse median/max 3.05/3.16 ms, deep page 2000 5.17/5.59 ms, service/severity/message 9.24/9.66 ms (10 requests each).
- Paced 100 events at target 20/second in 4.960 seconds; ingestion median/max 5.63/8.33 ms. Restart retained 100,100 Live events; isolated Demo seed and empty Historical preserved.
- Actual real-clock worker evaluated a 40-event Live minute as learning baseline. Late evidence remained 40 evaluated / 41 broader with correct filters and sample membership.

These are one local machine's synthetic measurements, not throughput guarantees or a production reliability claim.

## Browser availability and Manual UI verification pending

Used the installed Browser skill's supported setup. `agent.browsers.getForUrl("http://127.0.0.1:8000/")` returned **No browser is available**. Read `bootstrap-troubleshooting` and performed supported recovery discovery; `agent.browsers.list()` returned `[]`. No alternate browser automation was substituted. The authorized project-policy fallback applies.

Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.

- [ ] Rendered desktop: fresh temporary database → Deliveries receiver controls → Overview advance → Investigate → View delivery history. Check hierarchy, payload readability, attempt history, clock labels and retained selection.
- [ ] Rendered narrow-screen layout/overflow at 320/375 px and 200% zoom: same path, expand payload/attempts; verify controls wrap and the page does not overflow.
- [ ] Real-browser keyboard/focus: use Tab/Enter for settings, incident selection, delivery expansion, explicit Back and browser Back/Forward. Confirm heading/origin focus and retained expanded control focus during an actual retry update.
- [ ] Browser-dependent loading/empty/error states and interactions: inspect empty Historical/new Demo, delayed first fetch, failed refresh with retained data and retry, receiver save error, first notification announcement, 503→200, and three-attempt exhaustion. Confirm updates do not repeatedly announce unchanged deliveries.

DOM/axe, source review and token contrast checks do not establish rendered layout, full accessibility or browser keyboard behavior.
