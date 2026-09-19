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


## PR #10 independent-review fixes — R1 and R2

Verified a clean existing branch at reviewed head `9c86ef3d22adb3eba4008516b8a13ff885db54d6`, open non-draft PR #10 against the supplied main base, and open ready issue #3 with closed prerequisite #2. Changes are restricted to the two focus findings and necessary tests/documentation; no new architectural decision or dependency.

`npm --prefix frontend test -- src/Investigation.test.tsx` first reproduced four failures (4 existing tests passed): primary Logs → Back with undefined, removed or hidden saved targets, and Back to incidents → browser Back. After correction, this command passed all 10 tests. Saved undefined origins no longer overwrite explicit destinations; clearing selection records the incident heading in the outgoing entry. Restoration rejects hidden/unfocusable targets and waits for evidence's busy state to settle before falling back, including failed responses. Two additional delayed-response tests preserve valid initiating controls and verify error fallback. Existing recovered-incident traversal now asserts heading focus. Narrow queue hiding in jsdom models visibility only, not rendered viewport behavior.

Completed FIX verification:

| Command | Result |
| --- | --- |
| `npm --prefix frontend run build` | Passed; 33 modules, JS 259.57 kB / 79.60 kB gzip |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run lint` | Passed |
| `npm --prefix frontend run format:check` | Passed |
| `npm --prefix frontend test` | 32 passed across 3 files, including axe DOM rules |
| `.venv/bin/ruff check log_watchdog tests scripts` | Passed |
| `.venv/bin/ruff format --check log_watchdog tests scripts` | Passed; 12 files |
| `.venv/bin/mypy` | Passed; 7 source files |
| `.venv/bin/python scripts/check_contrast.py` | Passed; existing palette 5.19:1–14.24:1 |
| `.venv/bin/pytest -q` | 50 passed; two existing upstream deprecation warnings |
| `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/navigation.tsx frontend/src/Overview.tsx frontend/src/App.tsx frontend/src/EvidencePane.tsx` | `[]`, no source findings |

The initial formatting invocation used paths relative to the wrong working directory and made no changes; running the installed Prettier from `frontend` corrected it. The first full frontend run exposed jsdom's unimplemented `scrollTo` in the existing Overview history test now that restoration completes; that test now stubs scrolling and asserts restored focus. Final frontend run has no such warning. No check was weakened.

### Manual UI verification pending — additional return paths

Browser setup again returned **No browser is available** for localhost; after supported recovery guidance, discovery returned **[]**. The existing desktop, narrow-layout/overflow, keyboard and loading/empty/error checklist above still applies. Add these paths on desktop and at phone width/200% zoom, using only the keyboard:

- [ ] Investigate → primary-navigation Logs → Back to incident: preserve incident/evaluation and visibly focus detail heading. Repeat with the saved origin unavailable and after an evidence failure.
- [ ] Investigate → select an evaluated window → Back to incidents → browser Back: restore that same incident/window and focus the visible detail heading, not the hidden queue. Repeat through recovery.
- [ ] Investigate → a pattern/sample/evaluated-logs link → Back: wait for delayed evidence, restore the initiating control when present, otherwise the detail heading; subsequent refresh must not steal focus.

Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.

FIX runtime validation: `.venv/bin/python scripts/validate_runtime.py` completed successfully on a synthetic temporary SQLite database using the actual launcher and loopback HTTP. Verified dashboard/assets, 40 evaluated versus 41 broader events, filters/sample links, unchanged measurements, persistence/restart, isolation, all five demo transitions and a real-clock worker minute. Measured 100k ingestion in 1.701s; first/deep/filtered browse median 3.95/6.62/11.06ms; 100 events paced at 20/s in 4.957s, ingestion median/max 2.80/8.77ms. These are local measurements, not performance guarantees. `git diff --check` passed.


## PR #10 refresh-restoration fix — R1 at reviewed head b5f2292

Verified clean branch `issue-3-investigation-workbench` at the supplied reviewed head, synchronized with its remote, open PR #10 against supplied base `755ebbf9568f08ec2f85ead34c1c77bd6204a6d2`, and open ready issue #3. Its native and textual prerequisite #2 is closed; paginated open-PR enumeration found only #10.

The workbench stored only its selection-time snapshot. It now saves focus and scroll changes in the current history entry, ignoring loading/restoration events and events from an outgoing URL. Browser automatic scroll restoration is disabled while the workbench owns restoration. Restoration waits for evidence to settle even if the saved heading already exists, avoiding scroll clamping on a shorter loading page. Existing fallback behavior handles unavailable controls. This is a focused correction using the existing history mechanism, with no new architecture or dependency.

`npm --prefix frontend test -- src/Investigation.test.tsx` first failed the new reload regression: remount restored scroll `(0, 0)` while evidence was still loading (10 existing tests passed). After the fix and a second heading-target case, all 12 tests passed. Both cases select incident #1/window 91, move focus and scroll to 900, preserve URL/history across remount, inject scroll/focus events during delayed loading, and assert the original target and scroll return after evidence. These are DOM simulations, not browser reload evidence.

| Command | Completed result |
| --- | --- |
| `npm --prefix frontend run build` | Passed; 33 modules, JS 260.28 kB / 79.75 kB gzip |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run lint` | Passed |
| `npm --prefix frontend run format:check` | Passed |
| `npm --prefix frontend test` | 34 passed across 3 files, including axe DOM rules |
| `.venv/bin/ruff check log_watchdog tests scripts` | Passed |
| `.venv/bin/ruff format --check log_watchdog tests scripts` | Passed; 12 files |
| `.venv/bin/mypy` | Passed; 7 source files |
| `.venv/bin/python scripts/check_contrast.py` | Passed; existing ratios 5.19:1–14.24:1 |
| `.venv/bin/pytest -q` | 50 passed; two existing upstream deprecation warnings |
| `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/navigation.tsx frontend/src/Overview.tsx` | `[]`, no source findings |
| `git diff --check` | Passed |

An initial helper edit referenced a root-relative path while running inside `frontend` and failed before writing; the corrected patch and formatting completed successfully. No verification check was weakened.

### Manual UI verification pending — browser reload

Supported Browser `getForUrl("http://127.0.0.1:8000/")` returned **No browser is available**. Recovery documentation was read; discovery returned **[]** (serialized after the output helper rejected the raw array). The authorized browser-unavailable fallback applies. Existing manual checks remain pending, with this additional path:

- [ ] Desktop Overview/Incidents: Demo → Advance → Investigate → choose an evaluated window → focus View evaluated logs (also test window selector and sample link) → scroll into evidence → **browser reload**. Verify identical dataset/incident/window, focused control and scroll after delayed evidence finishes.
- [ ] Narrow-screen layout/overflow at phone width and 200% zoom: repeat reload in full-width detail, then Back to incidents and browser Back; verify preserved position and visible focus.
- [ ] Keyboard navigation/focus: use Tab and Enter throughout the same path; reload, continue tabbing, and open/return from Logs. Background refresh/recovery must retain focus and the pinned window.
- [ ] Browser-dependent loading/empty/error states: throttle evidence requests during reload, repeat a reload while loading, then test server failure/retry and unavailable evidence. Pending snapshots must survive loading and unavailable controls must receive the documented fallback.

Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.

Refresh-fix runtime validation: `.venv/bin/python scripts/validate_runtime.py` passed with the actual launcher and loopback HTTP against temporary synthetic SQLite data on macOS 15.6 arm64 / Python 3.14.5. Verified dashboard/assets, evaluated versus broader evidence (40/41), filters/sample links, unchanged measurements, restart persistence/isolation, all five demo transitions, and a real-clock worker minute. Measured 100k ingestion in 1.561s; first/deep/filtered browse medians 5.93/6.76/10.76ms; 100 events paced at 20/s in 4.960s, ingestion median/max 3.14/7.42ms. Local measurements only; no external provider or webhook claims.


## R1 follow-up: restore controls with stable focus identities

Back to incidents and Refresh overview saved empty focus IDs, so browser reload skipped both restoration and fallback. Both now have stable IDs. Unidentified focus saves the visible heading fallback, and legacy empty or missing targets fall back after evidence loading settles. No architectural or dependency change.

```diff
 on(focus)
-  save(activeElement.id)
+  save(activeElement.id || visibleHeading)
 on(restore)
-  skip an empty saved ID
+  restore the control or visible heading after loading
```

### Evidence

- **Before:** `npm --prefix frontend test -- src/Investigation.test.tsx -t 'after reload'` failed three cases: Back to incidents, Refresh overview and empty saved identity. The missing-target case passed. This was the expected regression run.
- **After:** `npm --prefix frontend test` passed all **39 tests** in 3 files, including seven reload cases through the actual Router with preserved history/URL, delayed evidence, loading-time focus/scroll events, selected window/incident, final visible focus, and scroll restored to 900. This is mocked HTTP/DOM evidence, not rendered browser verification.
- `npm --prefix frontend run build` — passed.
- `npm --prefix frontend run typecheck` — passed.
- `npm --prefix frontend run lint` — passed.
- `npm --prefix frontend run format:check` — passed.
- `.venv/bin/ruff check log_watchdog tests scripts` — passed.
- `.venv/bin/ruff format --check log_watchdog tests scripts` — passed, 12 files.
- `.venv/bin/mypy` — passed, 7 source files.
- `.venv/bin/python scripts/check_contrast.py` — passed all 9 static palette checks.
- `.venv/bin/pytest -q` — passed, **50 tests**, 2 existing Starlette/httpx/AnyIO deprecation warnings.
- `.venv/bin/python scripts/validate_runtime.py` — passed using the actual launcher, temporary synthetic SQLite data and loopback HTTP on macOS 15.6 arm64 / Python 3.14.5. Dashboard/assets, all five demo transitions, evaluated/broader evidence (40/41), filters/sample, unchanged late evidence, restart/isolation and a real-clock worker minute passed. 100k ingestion: 2.079s; first/deep/filtered browse medians: 9.97/9.38/12.92ms; 100 events paced at 20/s: 4.955s, ingest median/max 2.29/7.21ms. Local measurements only.
- `git diff --check` — passed.
- An initial formatting invocation using `npm --prefix frontend exec -- prettier --write src/...` could not resolve root-relative paths; rerunning `./node_modules/.bin/prettier --write src/navigation.tsx src/Overview.tsx src/Investigation.test.tsx` from `frontend` succeeded. No check was weakened.
- Prerequisite recheck: issue #3 remains open/ready; native and textual prerequisite #2 is closed. The existing assigned PR #10 remains the only target of this FIX.

### Manual UI verification pending

Supported Browser `getForUrl("http://127.0.0.1:8000/")` returned **No browser is available**. Read supported recovery documentation and called `agent.browsers.list()`, which returned `[]`. The authorized fallback applies; prior manual checks remain pending.

- [ ] Rendered desktop Overview/Incidents: Demo → Advance → Investigate → choose an evaluated window → focus Back to incidents, then separately Refresh overview → scroll → browser reload with delayed evidence. Confirm the same control, incident/window and scroll position return.
- [ ] Rendered narrow-screen layout/overflow: repeat the same path at phone width and 200% zoom, including the full-width pane and Back action.
- [ ] Keyboard navigation/focus: repeat using Tab/Enter, reload each control, then continue into evaluated Logs and back. Verify visible heading fallback for an unavailable origin.
- [ ] Browser-dependent loading/empty/error states and changed interactions: throttle evidence while reloading, move focus during loading, fail/retry requests and open unavailable evidence; confirm restoration waits and selects a visible fallback.

Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.

### Merge Danger

**Door:** two-way. **Blast Radius:** focus. The shared restoration hook also serves Logs; the complete frontend suite passes. No storage or API changes.
