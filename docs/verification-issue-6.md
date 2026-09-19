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
