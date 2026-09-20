# Issue #6 verification

Scope: seven-day retention and safe Demo-only reset, on Python 3.14.5/macOS 15.6 arm64. All data used for verification was synthetic in temporary databases. No default/user database was reset or cleaned by this session.

## Completed automated checks

| Exact command | Completed result |
| --- | --- |
| `npm --prefix frontend run build` | TypeScript/Vite production build passed; 35 modules |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run lint` | Passed |
| `npm --prefix frontend run format:check` | Passed |
| `npm --prefix frontend test` | 70 tests passed across 5 files |
| `.venv/bin/ruff check log_watchdog tests scripts` | Passed |
| `.venv/bin/ruff format --check log_watchdog tests scripts` | 18 files already formatted |
| `.venv/bin/mypy` | Passed, 10 source files |
| `.venv/bin/python scripts/check_contrast.py` | Existing palette combinations passed, minimum 5.19:1 among reported pairs; not rendered verification |
| `.venv/bin/pytest -q` | 96 passed, 2 existing Starlette/httpx/AnyIO deprecation warnings |
| `.venv/bin/python scripts/validate_runtime.py` | Passed actual local HTTP, process restart, retry/recovery, reset, persistence and performance checks |
| `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/Overview.tsx frontend/src/styles.css` | `[]`; ran once |
| `git diff --check` | Passed |

Lifecycle tests cover open evidence, pending recovered investigations, terminal-history deletion, expiration at the exact horizon, frozen baseline metadata, missing versus filtered evidence, persisted identity maxima, startup clocks, restart inspection, Demo-only reset, stale/duplicate reset requests, stale advance, rollback on seed failure, and reset while a claimed delivery or evaluation is in flight. The in-flight reset unit test uses a controlled HTTP connection and the actual receiver/store; it is distinct from the real network walkthrough.

DOM tests cover confirmation without transmission, Cancel/restore focus, completion/cleared selection/new run URL, unknown HTTP results retaining investigation, disabled reset/advance/cancel during a request, absence in Live, and a confirmation that keeps its original UUID when refresh discovers a newer run. Axe checks available DOM rules; jsdom cannot verify color contrast or layout.

Initial checks found formatting issues, a startup cleanup/request race with old fixtures, and an extra empty status region. These were fixed and the final checks above passed. Startup cleanup now finishes before requests are accepted; persistence fixtures use recent timestamps. The runtime stale-link assertion was corrected to carry the run UUID required by the existing reset-specific URL contract; untagged links still return unavailable rather than attaching to another incident.

## Actual HTTP and measured limits

The launcher served the dashboard and compiled asset. The walkthrough imported/deduplicated/rejected Historical files, ingested 100,000 Live events, paced another 100 at 20/second, and restarted. It exercised the five-advance scenario (open, open, recovery streak 1, 2, recovered), a real 503 response followed by process restart and a 200 retry with the same notification ID, both transition notifications, late evidence (40 evaluated/41 broader), filters/sample, and a real-clock worker minute.

After recovery, it confirmed Demo reset, checked 3,600 reseeded events, no Demo incidents/deliveries, stale-run evidence and advance rejection, another process restart, unchanged Live/Historical counts, and a fresh reproducible 40% spike with a new incident identity.

| Measurement | Observed |
| --- | --- |
| 100,000-event bulk ingestion | 1.500 seconds |
| First-page browse, 10 requests | median 3.47 ms, maximum 3.85 ms |
| Page 2000, 10 requests | median 5.53 ms, maximum 6.06 ms |
| Service/severity/message filter, 10 requests | median 10.07 ms, maximum 10.60 ms |
| 100 single-event writes at target 20/second | 4.966 seconds; median 4.52 ms, maximum 10.30 ms/request |
| Restart before real-clock probe | 100,100 Live events, 2 Historical events retained |

These are one-machine synthetic measurements, not production guarantees or a storage cap. The benchmark timestamps are now one day before execution so real-time retention does not intentionally expire its persistence fixtures. Seven-day expiration is tested separately with controlled clocks. Retention uses a write transaction; very large protected histories, unbounded services and long catch-up workloads were not benchmarked. SQLite disk-file shrinking is not claimed.

## Browser discovery and manual UI verification pending

The supported Browser skill/runtime initialized; `agent.browsers.getForUrl('http://127.0.0.1:8000')` returned **No browser is available**. The documented recovery instructions were read, and `agent.browsers.list()` returned `[]`. No screenshots or rendered browser checks were performed. The project-authorized browser-unavailable fallback applies.

- [ ] Desktop: Demo Overview → Reset demo; inspect inline confirmation, scope text, retention note and preserved incident workbench.
- [ ] Narrow screen/200% zoom: repeat confirmation, busy, error and completed states; verify wrapping and no page overflow, including incident/evaluated-log/delivery views after cleanup/restart.
- [ ] Keyboard/focus: open reset, Cancel, confirm, and verify focus returns to Reset demo; use Back to reach the old run and the current-Demo link. Walk overview → incident → evaluated logs → delivery history with retained evidence.
- [ ] Browser loading/empty/error/interaction: slow the reset request, verify duplicate actions stay disabled; disconnect the server, inspect unknown-outcome feedback and refresh; restore and reset, observe completion and normal empty incident queue. In a second tab reset while the first tab's confirmation is open, refresh the first, and verify confirmation rejects the old run.
- [ ] Configure fail-first-then-succeed after reset, advance through spike/retry/recovery, and inspect persisted delivery/evidence after restart.

**Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.**

## Impeccable finish and documentation evidence

The required separate finish-reviewer launch failed with `no thread with id`; the skill's inline fallback was used. This is a scoped source/DOM review, not the runner's independent PR review. Browser-only requirements are deferred under project policy.

Initial disposition: **fix**.

- **persistence:** Pass. PRODUCT.md, DESIGN.md and the established Incident workbench surface brief exist; this is a narrow code-first extension.
- **fidelity:** Type, palette, ground, flat ruled material, existing primary navigation and workbench structure match in source. Inline destructive confirmation is the specified extension; no replacement visual world or raster asset.
- **ceiling:** The extension uses existing controls, spacing, responsive action wrapping and focus styling. Rendered assessment deferred.
- **material_fixes:** Freeze the confirmation's run UUID; a background refresh must not retarget an already-open destructive confirmation.
- **keep:** Preserve inline scope disclosure, stable investigation on error, explicit cancellation, and a single restrained completion announcement.

Verdict pass: the finding is **resolved** by `resetRun` captured only when Reset demo opens, with a passing refresh-to-new-run regression. No remaining source/DOM finding from this scoped pass. Disposition: **ship**, scoped to the resolved finding and authorized browser fallback.

Documenter fallback: **No changes** to the incumbent DESIGN.md or design sidecar. Checked DESIGN.md, the surface brief, Overview.tsx and styles.css. Palette remains cool neutrals/workbench blue with the existing error red for the destructive action. Type remains system sans with the existing hierarchy. Flat borders group confirmation content. Existing spacing/control radii and action wrapping apply. Explicit text, visible focus and persistent context remain the named rules. Pre-existing DESIGN.md feature-coverage drift is not repaired in this issue; the local extension introduces no new durable visual system.

## PR #13 review fix R1 — 2026-09-20

The stale-run check previously gated only selected-incident detail. A run-only Overview URL (including Back after two resets) therefore omitted the explanation and allowed Advance to mutate the loaded replacement run. The reset explanation and current-Demo link now appear above the controls for every mismatched Demo run URL. Advance, Reset and confirmation are disabled; mutation handlers also guard stale state. Replacement investigation/trend content is withheld until returning to the current Demo, whose link carries the loaded UUID. Existing visual tokens/styles and ADR-027/030 semantics are preserved; no new architectural decision.

Regression evidence uses synthetic UUIDs and mocked fetch responses with the real Overview component and jsdom History API. `npm --prefix frontend test -- src/Overview.test.tsx -t 'stale'` initially failed all three new cases: missing explanation without an incident and after two resets/Back, plus enabled controls with an incident. After the fix, `npm --prefix frontend test -- src/Overview.test.tsx` passed all 15 tests. Tests cover disabled mutations, current-run link recovery, advancing with the current UUID, Back after two successful resets, refresh while stale, and available axe rules.

Completed verification for this fix:

- `npm --prefix frontend run build` — passed; 35 modules.
- `npm --prefix frontend run typecheck` — passed.
- `npm --prefix frontend run lint` — passed.
- `npm --prefix frontend run format:check` — passed.
- `npm --prefix frontend test` — 73 passed across 5 files.
- `.venv/bin/ruff check log_watchdog tests scripts` — passed.
- `.venv/bin/ruff format --check log_watchdog tests scripts` — passed, 18 files.
- `.venv/bin/mypy` — passed, 10 source files.
- `.venv/bin/python scripts/check_contrast.py` — passed; minimum reported 5.19:1, static palette only.
- `.venv/bin/pytest -q` — 96 passed, 2 existing deprecation warnings, 19.26 seconds.
- `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/Overview.tsx` — `[]`.
- `git diff --check` — passed.

The initial formatting invocation `npm --prefix frontend exec -- prettier --write src/Overview.tsx src/Overview.test.tsx` used paths relative to the wrong working directory and changed nothing. Corrected command: `./node_modules/.bin/prettier --write src/Overview.tsx src/Overview.test.tsx` from `frontend/`; passed, followed by the passing configured format check.

Browser availability was rechecked through the supported setup: `getForUrl('http://127.0.0.1:8000')` returned **No browser is available**. Read `bootstrap-troubleshooting`; recovery `browsers.list()` returned `[]`. Source/DOM checks do not establish rendered layout or real-browser keyboard behavior.

### Manual UI verification pending for R1

- [ ] Desktop: visit an old Demo Overview URL with `run=<old UUID>` and no incident; inspect reset explanation, current-Demo link and disabled controls.
- [ ] Narrow-screen/200% zoom: repeat and verify explanation/control wrapping and overflow.
- [ ] Keyboard/focus: reset twice, use browser Back, follow Return to current demo; verify focus recovery and normal Advance/Reset controls.
- [ ] Loading/empty/error/changed interactions: load a stale URL slowly, retry a failed refresh, refresh while stale, and return to the current Demo's empty queue.

**Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.**

Runtime rerun: `.venv/bin/python scripts/validate_runtime.py` completed successfully with actual loopback HTTP, temporary synthetic SQLite data and process restarts. Confirmed reset/reseed, stale API rejection, Demo/Live/Historical isolation, five-step spike/retry/recovery, 503 → restart → 200 delivery, 40 evaluated/41 broader evidence, and the real-clock worker. Python 3.14.5/macOS 15.6 arm64: 100k events in 1.510 s; first/deep/filtered browse medians 3.44/5.82/10.18 ms (maxima 3.96/6.08/30.10 ms); 100 writes at target 20/s in 4.962 s, median 4.47 ms, max 7.41 ms. These synthetic measurements retain the existing performance limits and are not browser-navigation evidence.

## General Logs review fix R1 (2026-09-20)

A saved general Demo Logs URL now validates its run UUID in the same SQLite snapshot as the count and event page. After reset it returns HTTP 410 without replacement events. Logs shows the reset explanation and **Return to current demo** without requiring an incident selection; that action returns to general current-Demo browsing. Reset errors clear cached results; existing same-query network-failure retention remains covered. No schema, dependency, visual-token or material architectural change; extends ADR-024/027's existing snapshot/identity semantics.

- **Before:** `.venv/bin/pytest -q tests/test_lifecycle.py -k general_logs` failed because the stale URL returned 200 rather than 410. `npm --prefix frontend test -- src/App.test.tsx -t 'withholds stale general'` failed because the explanation/link were absent and old results remained.
- **After:** both commands passed. API coverage includes two resets, replacement-only data, restart, legacy untagged URLs, Live/Historical isolation and deterministic reset between run validation and count. Mocked-fetch component coverage includes refresh after another-tab reset, remount/reload, actual jsdom History Back, suppressed results, and current-Demo recovery. Existing incident-evidence tests still pass.
- `npm --prefix frontend run build` — passed, 35 modules.
- `npm --prefix frontend run typecheck` — passed.
- `npm --prefix frontend run lint` — passed.
- `npm --prefix frontend run format:check` — passed.
- `npm --prefix frontend test` — 74 passed. Available axe DOM rules pass; axe emits jsdom's unsupported canvas diagnostic, so this is not rendered contrast evidence. No checks disabled.
- `.venv/bin/ruff check log_watchdog tests scripts` — passed after correcting an initially misplaced runtime assertion caught as undefined `run`/`new_run`.
- `.venv/bin/ruff format --check log_watchdog tests scripts` — passed, 18 files.
- `.venv/bin/mypy` — passed, 10 source files.
- `.venv/bin/python scripts/check_contrast.py` — passed, minimum reported 5.19:1 (static palette only).
- `.venv/bin/pytest -q` — 98 passed, two existing Starlette/httpx/AnyIO deprecation warnings.
- `.venv/bin/python scripts/validate_runtime.py` — passed with a temporary synthetic database and actual loopback HTTP/process restarts. Includes new general-Logs stale-run 410/no-event checks and current-run 3,600-event browsing, plus reset/reseed/isolation, five-step spike/retry/recovery, pending delivery restart, evaluated/late evidence and real-clock worker.
- Runtime measurements: Python 3.14.5/macOS 15.6 arm64; 100k events in 1.450 s; first/deep/filtered browse medians 3.14/5.12/9.36 ms; 100 paced writes at target 20/s in 4.967 s, median 6.02 ms, maximum 8.71 ms. One synthetic run, not production guarantees.
- `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/App.tsx` — `[]`.
- `git diff --check` — passed.

### Manual UI verification pending — general Logs

Supported Browser setup `getForUrl('http://127.0.0.1:8000')` reported **No browser is available**. Supported recovery documentation was read; `browsers.list()` returned `[]`. No rendered verification claimed.

- [ ] Desktop: reset Demo, open Logs without selecting an incident, save the URL, reset in another tab, then refresh the saved URL; inspect explanation/link and absence of event rows.
- [ ] Narrow screen/200% zoom: inspect Logs reset notice, recovery link and controls for wrapping/overflow.
- [ ] Keyboard/focus: activate Return to current demo, verify restored browsing/focus, then browser Back and repeat recovery.
- [ ] Browser loading/empty/error/changed interactions: slow response and failed refresh, stale URL reload, current-Demo link and current-run empty/filter states.

**Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.**
