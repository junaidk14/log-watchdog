# Issue #2 verification

Performed 2026-09-19 UTC on macOS 15.6 arm64, Python 3.14.5, using the existing locked dependencies. Synthetic data only; no external provider or webhook calls. Browser unavailable; this is automated/source evidence, not a rendered UI pass.

## Eligibility

Started clean on `main` at `53ce1c94c330e6d42818bcc5d0eb2403d63beeba`, matching both `origin/main` and `git ls-remote origin refs/heads/main`. Complete `gh api --paginate` enumeration found ready issues #2–#7 and zero open PRs (including drafts). Read every approved issue body and its paginated comments (none), and queried native blocked_by relationships for #1–#7. Live graph matches the project policy: #2←#1; #3/#4←#2; #5←#1; #6←#3/#4/#5; #7←#3. #1 is closed; #2 is the lowest executable issue. #7 is deferred. Rechecked #2 labels/prerequisite and all open PRs immediately before creating the new branch.

## Completed commands

All commands below finished successfully on the implemented code:

| Command | Result |
| --- | --- |
| `npm --prefix frontend run build` | TypeScript + Vite production build passed |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run lint` | Passed, including JSX accessibility rules |
| `npm --prefix frontend run format:check` | Passed |
| `npm --prefix frontend test` | 22 tests passed, including existing Logs regressions and 7 overview interaction tests |
| `.venv/bin/ruff check log_watchdog tests scripts` | Passed |
| `.venv/bin/ruff format --check log_watchdog tests scripts` | 10 files formatted |
| `.venv/bin/mypy` | Passed, 6 application source files |
| `.venv/bin/python scripts/check_contrast.py` | All existing palette checks passed; ratios 5.19:1–14.24:1 |
| `.venv/bin/pytest -q` | 46 tests passed; two upstream Starlette/httpx/AnyIO deprecation warnings |
| `.venv/bin/python scripts/validate_runtime.py` | Actual loopback HTTP, demo progression, late evidence, restart, real-clock worker and performance checks passed |
| `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/Overview.tsx frontend/src/styles.css` | `[]`; no source detector findings |

Implementation iterations fixed formatting findings and test expectations affected by the explicit `view=logs` URL. The final runs above pass without weakening checks. The finish reviewer found missing live transition announcements; the fix now announces opening/recovery once, leaves unchanged refreshes silent, and preserves focus. A focused independent source verdict scored that sole finding resolved. This is separate from the runner's future independent PR review.

## Behavior coverage

Deterministic backend tests cover the numerical zero-error/small-sample formula; strict grace boundary; warm-up and self-exclusion; normal nonzero history; spike/grouping; frozen baseline; configurable recovery; sparse/absent traffic and abnormal gaps; late events with unchanged inclusion watermark/counts; restart/catch-up; new-service isolation; demo/live/historical isolation; configuration rejection; and atomic/concurrent advance with rollback on event ID conflict. API tests run the full five-advance scenario and reopen the database.

DOM tests cover named keyboard activation, selected incident URL, detail/return focus, selection through recovery and history Back, loading/initial error/empty live baseline, retained values on refresh error, retry, failed advance, stale-refresh race, sparse recovery/delayed live status, exact chart tables, available axe rules, and once-only live transition announcements. jsdom does not establish rendered overflow, real-browser keyboard behavior, or visual contrast.

Actual HTTP runtime checks start the documented launcher on loopback port 8000 with a temporary database and stop it afterward. Sequence observed: `(open,0)`, `(open,0)`, `(open,1)`, `(open,2)`, `(recovered,3)`. Late synthetic ingestion left the recorded measurement byte-for-byte equal. A process restart preserved the recovered incident. The real background worker evaluated 40 current-minute live events after the actual minute boundary/grace and reported learning baseline. Multi-window statistical behavior uses deterministic clock tests; the real-time walkthrough does not wait ten baseline minutes.

Measured performance with the worker enabled:

- 100,000 synthetic live events in 1.319 seconds (bulk API batches).
- First-page browse, ten requests: median 2.93 ms, max 3.43 ms.
- Page 2000: median 5.42 ms, max 7.67 ms.
- Service/severity/message filter: median 9.14 ms, max 9.70 ms.
- 100 individual events scheduled at 20/second: 4.960 seconds, median ingestion 5.22 ms, max 10.37 ms.
- Restart preserved 100,100 live events; the pre-scenario seed remained 3,600 demo events and Historical empty. The detector scenario subsequently added its synthetic minutes and late event.

These are local validation measurements, not guarantees. Bulk benchmark event timestamps precede first live cursor and therefore do not train it; the separate real-clock probe verifies the worker. Long-running storage/retention and large incident queues are not benchmarked by this slice.

## Browser discovery and manual UI verification pending

Read the installed Browser skill; initialized its supported runtime and called `agent.browsers.getForUrl("http://127.0.0.1:8000/")`: **No browser is available**. Read `bootstrap-troubleshooting` and called the supported recovery `agent.browsers.list()`: **[]**. No browser workaround, installation or alternate automation was used. The project policy's authorized fallback applies.

- [ ] **Rendered desktop:** open Overview in Demo, advance once and investigate checkout. Confirm incident queue/detail fit side by side, measurement labels and both chart types are readable.
- [ ] **Rendered narrow-screen layout/overflow:** repeat at phone width and 200% zoom; selection opens full-width detail with Back, navigation/controls fit, and exact chart tables scroll only inside their named regions.
- [ ] **Real-browser keyboard navigation/focus:** tab to Advance, activate Investigate, verify heading focus and visible selected state; refresh/advance through recovery without focus loss, then Back to incidents and browser Back. Expand exact-value tables and visit Logs.
- [ ] **Browser-dependent loading/empty/error states and changed interactions:** use a fresh database for no-active state, Live for learning, stop/restart the server to inspect retained results/retry, and verify delayed evaluation differs from paused simulation. Verify once-only opening/recovery announcements with assistive technology.

Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.

## FIX verification — R1 (2026-09-19 UTC)

Increasing minimum history on restart previously stranded open incidents in learning baseline: baseline membership freezes while open, so the larger minimum could never be met. Open incidents now retain established baseline eligibility until recovery. Current traffic checks and frozen membership still apply; the new minimum applies again after recovery. ADR-026 and `docs/detection.md` record this policy. No schema or frontend changes in this fix.

- Before: `.venv/bin/pytest -q tests/test_detector.py -k higher_minimum` failed with `learning baseline` instead of `no spike detected`.
- After: the same command passed (1 test). The persisted SQLite restart regression confirms three-window recovery, no incident baseline members, unchanged original evaluation rows/measurement, and resumed learning under the increased minimum after recovery.
- Re-ran `npm --prefix frontend run build`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run lint`, and `npm --prefix frontend run format:check`: all passed.
- Re-ran `npm --prefix frontend test`: 22 passed, including available axe DOM checks.
- Re-ran `.venv/bin/ruff check log_watchdog tests scripts`, `.venv/bin/ruff format --check log_watchdog tests scripts` (10 files), `.venv/bin/mypy` (6 files), and `.venv/bin/python scripts/check_contrast.py`: all passed.
- Re-ran `.venv/bin/pytest -q`: 47 passed, two upstream deprecation warnings.
- Re-ran `.venv/bin/python scripts/validate_runtime.py`: passed actual HTTP dashboard/assets, demo opening/grouping/recovery, late evidence, process restart, isolation, and actual real-clock worker evaluation. Synthetic temporary SQLite data on macOS 15.6 arm64 / Python 3.14.5: 100k bulk events in 1.364s; median browse first/deep/filtered 3.00/5.14/9.54ms; 100 events paced at 20/s in 4.953s, median ingest 1.44ms. Local measurements only; no external provider/webhook calls.
- `git diff --check`: passed. Rechecked issue #2 open/ready, prerequisite #1 closed, native dependencies, and PR #9's assigned base/branch/head; paginated open-PR scan found only #9.
- Browser availability rechecked with the Browser skill: `getForUrl` reported “No browser is available”; supported recovery `agent.browsers.list()` returned `[]`. The existing **Manual UI verification pending** checklist still applies to Overview, incident recovery/detail, trends and Logs. No rendered desktop, narrow-screen, keyboard or browser-dependent state validation is claimed.
