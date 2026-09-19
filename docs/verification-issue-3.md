# Issue #3 verification — evaluated incident investigation

Validated 2026-09-19 UTC on macOS 15.6 arm64, Python 3.14.5. Scope: issue #3 only. Synthetic temporary SQLite data; no external provider calls or webhook claims.

## Eligibility and scope

Started clean on `main` at `755ebbf9568f08ec2f85ead34c1c77bd6204a6d2`, matching local `origin/main` and `git ls-remote origin refs/heads/main`. Used `gh api --paginate` with explicit `repos/junaidk14/log-watchdog` to enumerate every open ready issue and every open PR. Candidates #3–#7; no open PRs. Read bodies and all comments (none), fetched native blockers for every candidate and resolved all textual/native references. #1 and #2 are closed; #3/#4 depend on #2, #5 on #1, #6 on open #3/#4/#5, and #7 on open #3. Relationships match the approved graph. #7 is also explicitly deferred by project policy. Selected lowest executable #3; repeated its eligibility/PR checks before creating the new branch.

## Completed commands and results

| Command | Completed result |
| --- | --- |
| `npm --prefix frontend run build` | Passed; 33 modules; final JS 259.09 kB / 79.45 kB gzip |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run lint` | Passed |
| `npm --prefix frontend run format:check` | Passed |
| `npm --prefix frontend test` | 26 tests passed across 3 files, including axe DOM checks |
| `.venv/bin/ruff check log_watchdog tests scripts` | Passed |
| `.venv/bin/ruff format --check log_watchdog tests scripts` | Passed; 12 files |
| `.venv/bin/mypy` | Passed; 7 application files |
| `.venv/bin/python scripts/check_contrast.py` | Passed existing palette ratios, 5.19:1–14.24:1 |
| `.venv/bin/pytest -q` | 50 tests passed; two existing upstream Starlette/httpx/AnyIO deprecation warnings |
| `.venv/bin/python scripts/validate_runtime.py` | Passed actual loopback HTTP, assets, evidence, restart, demo lifecycle, real-clock worker and performance checks |
| `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/App.tsx frontend/src/Overview.tsx frontend/src/EvidencePane.tsx frontend/src/navigation.tsx frontend/src/styles.css` | `[]`, no source detector findings |
| `git diff --check` | Passed |

Implementation iterations exposed and corrected formatting/lint errors, stale test fixture shapes after adding the evidence endpoint, lost return-scroll state during filter navigation, and a multi-window focus regression. Checks were not weakened. The separate UI finish source reviewer identified stale interval context and window-selector focus loss; both were corrected with a multi-window regression. Its focused verdict scored both findings resolved and returned **ship** at that limited source-review scope. Final frontend build/type/lint/format and all 26 frontend tests passed after corrections. This skill finish review does not replace the runner's independent PR review.

## Behavior evidence

Backend/API tests exercise exact evaluated membership and half-open bounds, late arrivals marked only in broader scope, identical recorded measurements/patterns after late ingestion, literal filters, exact sample-ID links, complete pagination, cross-dataset/window rejection, malformed query validation, pinned evidence through recovery and reopened SQLite persistence. A missing-evidence fixture deletes retained logs while keeping evaluations to verify missing-versus-zero-match semantics. A changed run UUID fixture verifies the specific 410 reset response; retention and reset execution themselves remain issue #6.

DOM interaction tests complete Overview → Investigate → evaluated Logs → refine → include/exclude later arrivals → clear refinements → expand metadata → Back. They verify selected identity, pinned interval, separate evaluated/matching counts, scope-preserving clear, explicit leave, return focus/scroll, browser Back, pattern/sample links, missing evidence and stale-run errors. A multiple-window test verifies the same selector DOM stays focused, URL interval follows the selected evaluation, primary-navigation Logs fields agree, and leaving scope uses that interval. Existing tests cover unchanged refresh silence, recovery selection, loading/error/retry, dataset races and available axe rules. jsdom is not a rendered keyboard or layout check.

Actual HTTP used the documented launcher on `127.0.0.1:8000` and a temporary database. Observed transitions: open/0, open/0, open/1, open/2, recovered/3. After a late timeout, the selected evaluated window still had 40 events and 16 errors; broader scope had 41 with precisely the late row excluded from incident counts. Severity and exact sample filters worked. Process restart returned the same evidence packet. A real current-minute worker probe evaluated 40 live events as learning baseline.

Measured performance (local validation, not guarantees):

- 100,000 bulk live events: 1.515 seconds.
- Ten browses each: first-page median/max 3.31/3.78 ms; page 2000 6.82/8.13 ms; service/severity/message 11.03/11.82 ms.
- 100 events scheduled at 20/second: 4.957 seconds; ingestion median/max 3.22/9.04 ms.
- Restart preserved 100,100 live events and dataset isolation. Demo seed was 3,600 events before the scenario; Historical remained empty.

Bulk events predate the initial live cursor, so the separate current-minute probe establishes actual worker execution. Large incident queues, long-running retention and external integrations are not benchmarked here.

## Browser discovery and Manual UI verification pending

Read the installed Browser skill and initialized its supported runtime. `agent.browsers.getForUrl("http://127.0.0.1:8000/")` returned **No browser is available**. Read `bootstrap-troubleshooting`; supported recovery `agent.browsers.list()` returned **[]**. No alternative browser-control mechanism or workaround was used. Apply the explicitly authorized project fallback; source/DOM checks are not rendered checks.

- [ ] **Rendered desktop:** Demo Overview → Advance → Investigate. Confirm the queue and evidence pane fit side by side; selected window, counts, pattern links, sample and local summary remain readable.
- [ ] **Rendered narrow-screen layout/overflow:** repeat at phone width and 200% zoom. Confirm full-width detail with Back, contained log-table scrolling, readable long messages/IDs and no page overflow.
- [ ] **Keyboard navigation/focus:** complete Overview → incident → select another window → evaluated Logs → filter/late toggle → metadata expansion → Back and browser Back. Verify visible focus, return position, selection through refresh/recovery, and continued keyboard operation of the window selector.
- [ ] **Browser-dependent loading/empty/error states and interactions:** stop/restart the server for retained data/retry, use a zero-match refinement, inspect stale-run and missing-retention fixtures, follow all summary/sample links, and check restrained announcements with assistive technology.

Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.

## Design documentation comparison

The separate read-only documenter compared PRODUCT.md, DESIGN.md, the surface brief/sidecar, frontend diff and complete component/CSS source. This is an ordinary extension: palette, system fonts, control radii, visible focus, severity styling, immediate transitions and the 900px full-width detail breakpoint remain unchanged. New composition is the two-column semantic queue table, ruled evidence section, full-width window selector, existing chart, pattern/summary/sample links and scoped Logs context controls. No imagery or external assets were added.

Existing design files are preserved under the skill's ordinary-extension rule. Pre-existing planning statements and issue #2 descriptions now lag the implemented issue #3 flow; the sidecar also omits the already-existing 900px breakpoint. This drift is reported rather than repaired as an unrelated side effect. The comparison is source-only, not rendered verification.
