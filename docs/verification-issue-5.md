# Issue #5 verification

Executed 2026-09-19 UTC on macOS 15.6 arm64 and Python 3.14.5, using repository virtual environment and installed frontend lockfile dependencies. All fixtures are synthetic and use temporary SQLite databases. No provider calls or real user logs.

## Recovery and eligibility

The authorized recovery preserved the nine partial files on `issue-5-historical-upload` at supplied base `fa4d982c5f1efe66ed7c7c61b23f4fe590ef76dc`, matching `origin/main`. Full paginated ready-issue enumeration returned #5, #6 and #7; all comments and native blockers were read. Open-PR enumeration returned none. Issue #5 is open/ready and requires only completed issue #1, matching textual and native dependencies. Issue #6 waits for #5 (issues #3/#4 completed); #7 requires completed issue #3 and remains later scope. No graph discrepancy. Protected runner/policy files and AGENTS.md are unchanged from the supplied base.

The reported Ruff E501 and ambiguous frontend assertion reproduced. Wrapping the runtime report string fixed lint. The retry test now identifies the explanatory help text separately from the live alert, preserving both messages. An added malformed-input regression exposed Python's oversized-integer decoder ValueError; uploads now return 422 without storing data. Focused commands `.venv/bin/pytest -q tests/test_historical.py` and `npm --prefix frontend test -- src/Historical.test.tsx` passed 22 and 9 cases respectively after fixes.

## Verification commands

| Exact command | Completed result |
| --- | --- |
| `npm --prefix frontend run build` | Passed TypeScript and Vite production build |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run lint` | Passed |
| `npm --prefix frontend run format:check` | Passed |
| `npm --prefix frontend test` | 65 passed across 5 files |
| `.venv/bin/ruff check log_watchdog tests scripts` | Passed |
| `.venv/bin/ruff format --check log_watchdog tests scripts` | Passed, 16 files |
| `.venv/bin/mypy` | Passed, 9 source files |
| `.venv/bin/python scripts/check_contrast.py` | Passed existing static token pairs, 5.19:1–14.24:1 |
| `.venv/bin/pytest -q` | 78 passed; 2 existing Starlette/httpx/anyio deprecation warnings |
| `.venv/bin/python scripts/validate_runtime.py` | Passed actual local HTTP, restart, historical upload and existing complete runtime walkthrough |
| `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/Historical.tsx frontend/src/App.tsx frontend/src/styles.css` | No mechanical findings (`[]`) |
| `git diff --check` | Passed |

The first full backend invocation overlapped the runtime validator and produced four port-8000 fixture setup errors (74 passed); both commands bind that fixed local receiver port. Run them sequentially. The sequential rerun passed all 78 tests. No test or port requirement was weakened.

Backend cases cover exact 5,000,000-byte/5,000-event acceptance, oversized rejection, malformed encoding/JSON/nesting/numbers, row/field schema errors, bounded feedback, whole-file rollback, equivalent normalized IDs, generated IDs, conflict handling, restart, inclusive timestamp filters, all-severity denominator, no-traffic gaps, at-most-30 buckets across years 1–9999, and dataset isolation. Integrated deterministic evaluation proves historical uploads create no evaluations, incidents or deliveries and cannot be evaluated as a detector dataset.

Frontend DOM cases cover the actual Router upload → completion → file interval → filtered logs/trends path, Enter submission, progress and double-submission prevention, selected file retention, row/field/malformed/oversized/read/connection errors, no stale success, trend retry and stale-response protection, exact-value disclosure and axe rules excluding contrast. Fetch is mocked in these component tests; actual HTTP is separately exercised below.

## Actual runtime evidence

The documented launcher served the dashboard and compiled assets on loopback using a fresh temporary database. Actual HTTP imported two events, repeated them as two duplicates, rejected an invalid row, found exactly one event using service/severity/message/inclusive interval filters, and returned rate buckets `[1, null, 0]`. Both historical events survived process restart. Demo and Live remained separate.

The complete existing validator also passed actual webhook 503 → process restart → 200 under the same delivery ID, opening and recovery notifications, five demo advances, stable late evidence (40 evaluated / 41 broader), incident restart and one real-clock Live worker minute.

Measured 100,000 bulk synthetic events in 1.576 seconds. Ten browse requests each: first page median/max 3.63/5.58 ms, deep page 2000 6.29/7.15 ms, service/severity/message 13.96/18.17 ms. Paced 100 events at target 20/second in 4.962 seconds, ingestion median/max 2.39/17.97 ms. Restart retained 100,100 Live, 3,600 Demo and 2 Historical events. These are one local run's measurements, not performance guarantees.

## Synthetic upload walkthrough

Save this UTF-8 array as `historical-example.json`:

```json
[
  {"event_id":"history-1","timestamp":"2025-12-01T10:00:00Z","service":"import-probe","severity":"ERROR","message":"Synthetic file timeout"},
  {"event_id":"history-2","timestamp":"2025-12-01T10:02:00Z","service":"import-probe","severity":"INFO","message":"Synthetic file normal"}
]
```

Start the app following README. Open Logs → Historical, choose the file, Tab to Import into Historical and press Enter. Expect 2 inserted, 0 duplicates; repeat for 0 inserted, 2 duplicates. Choose Browse file interval, apply service `import-probe`, severity ERROR and message `timeout`: one log matches; trends still include both severities and show 100%, no traffic, 0% in the exact-value table. Restart and inspect the same Historical interval. An invalid severity should identify row/field without a completion state; correct/reselect the file and retry. This is a manual reproduction path; the automated DOM and HTTP portions above were exercised separately, not as a rendered browser E2E run.

## Browser availability and Manual UI verification pending

Supported Browser setup completed, but `agent.browsers.getForUrl("http://127.0.0.1:8000/")` reported **No browser is available**. Read `bootstrap-troubleshooting`; supported recovery `agent.browsers.list()` returned `[]`. No substitute browser automation was used.

Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.

- [ ] Rendered desktop: Logs → Historical → upload → Browse file interval → filters → exact trend values; inspect grouping, charts, UTC bounds, completion/duplicates and long filenames/messages.
- [ ] Rendered narrow-screen layout/overflow at 320/375 px and 200% zoom: repeat, expand event format and exact-value table, check horizontal scroll regions and wrapping controls.
- [ ] Real-browser keyboard/focus: Tab/Enter through file picker, import, completion/browse, filters and disclosures; verify focus remains usable during upload, retry, dataset changes and browser Back.
- [ ] Browser-dependent loading/empty/error and interactions: empty Historical, file read failure, oversized/malformed file, pending upload, disconnected server with uncertain outcome, successful retry, trend loading/error/retry and filter updates.

Separate Impeccable finish review returned **ship** at bounded source/DOM scope, with these rendered checks deferred. The documenter compared the extension against incumbent tokens and found no durable system changes: existing palette, 13px text, spacing, controls, focus, chart/disclosure/table patterns reused. DESIGN.md and its sidecar remain unchanged; preexisting stale descriptions are not repaired in this slice. No new material architecture decision or dependency; existing ADR-009/015/019/023/024 apply. All rendered checks remain pending; source, static contrast and DOM/axe checks do not establish full visual/accessibility validation. Runner owns fresh independent whole-PR review.

## PR #12 independent-review fixes R1/R2

The upload endpoint now requires application/json before reading the request body (case-insensitive media type, optional charset parameters); unsupported or missing types return 415. This closes the raw-JSON simple-request path without changing the dashboard request. Ingestion carries the conflicting event's zero-based index into upload feedback instead of searching for the first matching ID. Transactions and existing ingestion API responses remain unchanged; no new architectural decision or dependency.

- Before: `.venv/bin/pytest -q tests/test_historical.py -k 'unsupported_media or dashboard_json or offending_row'` reproduced 7 failures and 2 passing JSON controls: five unsupported types returned 200 and both conflict cases blamed row 1.
- After: `.venv/bin/pytest -q tests/test_historical.py` passed 31 cases; subsequent full `.venv/bin/pytest -q` passed 89 cases, including two added prefix-insertion rollback cases (33 Historical cases total), with two existing dependency deprecation warnings.
- `.venv/bin/ruff check log_watchdog tests scripts`, `.venv/bin/ruff format --check log_watchdog tests scripts`, `.venv/bin/mypy`, and `.venv/bin/python scripts/check_contrast.py` passed. Two test-line formatting failures were corrected with Ruff before the passing checks.
- `npm --prefix frontend run build`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run lint`, and `npm --prefix frontend run format:check` passed.
- `npm --prefix frontend test`: first run had an unchanged Deliveries keyboard-expansion failure (64/65 passing); immediate full rerun passed 65/65 without code or check changes. No frontend source changed in this FIX; the transient failure remains recorded rather than claimed never to have occurred.
- Supported browser setup reported no available browser; recovery documentation followed by discovery returned `[]`. The manual UI checklist above remains pending, including correct conflict-row feedback in Logs → Historical. DOM checks do not establish rendered behavior.
- `.venv/bin/python scripts/validate_runtime.py` passed after backend tests finished: actual dashboard/assets, JSON upload/deduplication/invalid rows, interval/filter/trends, process restart and isolation, webhook 503→restart→200, incident recovery, stable late evidence, and real-clock evaluation. Temporary synthetic SQLite, Python 3.14.5/macOS 15.6 arm64: 100k events in 1.340s; browse median/max 3.05/3.30ms (first), 5.13/5.34ms (deep), 9.80/10.47ms (filtered); 100 paced events at target 20/sec in 4.952s. Measurements are not guarantees.
- `git diff --check` passed. No protected runner files changed.
