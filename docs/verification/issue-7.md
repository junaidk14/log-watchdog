# Issue #7 verification

Selected the only open `ready-for-agent` issue, #7, after complete paginated ready-issue and open-PR enumeration. No open PR existed. Native and textual prerequisite issue #3 was closed/completed; core issues #4–#6 were closed/completed. Clean `main`, local HEAD, origin/main and live remote main matched `baa9d2fbff4c1fc27b0765d798c23a8f7cb7519a` before creating `issue-7-gemini-evidence`. Eligibility and PR associations were rechecked before branching and before handoff.

## Completed checks

- `npm --prefix frontend run build` — passed; Vite generated the FastAPI-served dashboard.
- `npm --prefix frontend run typecheck` — passed.
- `npm --prefix frontend run lint` — passed.
- `npm --prefix frontend run format:check` — passed.
- `npm --prefix frontend test` — 79 tests passed in six files. Four focused analysis tests cover preview/send consent, exact token retry, missing credentials, busy state, abort/unmount, plain-text output, evidence links and available axe rules. A Router regression verifies the local summary and evaluated-log navigation remain usable after missing-credential failure.
- `.venv/bin/ruff check log_watchdog tests scripts` — passed.
- `.venv/bin/ruff format --check log_watchdog tests scripts` — 20 files already formatted.
- `.venv/bin/mypy` — passed, 11 source files.
- `.venv/bin/python scripts/check_contrast.py` — passed all nine palette pairs (minimum 5.19:1).
- `.venv/bin/pytest -q` — 117 tests passed. The 19 new analysis cases cover exact frozen sending despite arrivals/advance; valid local evidence links; cached success; credentials/model configuration; trusted provenance including public synthetic-metadata forgery; Live paid gating; Historical exclusion; redaction and byte bounds; expiry/eviction/restart/reset/concurrency; invalid claims/references; REST request contract, size/status/timeout failures; conservative schema migration.
- `.venv/bin/python scripts/validate_runtime.py` — passed on Python 3.14.5 / macOS 15.6 arm64 using a temporary database and real loopback HTTP. Verified synthetic analysis preview, dashboard/assets, ingestion, five-step Demo recovery, late evidence, actual webhook 503 → process restart → 200, persisted incidents, reset/run guards, Historical upload, isolation and a real-clock worker minute. Loaded 100,000 events in 1.505 seconds; first-page/deep-page/filtered browse medians 4.41/7.00/10.49 ms; 100 paced events in 4.962 seconds at a 20/second target, ingestion median 2.42 ms (max 28.10 ms). Restart preserved 100,100 Live events; final reset left 3,600 Demo and two Historical events. These are measurements for this environment, not guarantees.
- `git diff --check` — passed.
- `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/AnalysisPane.tsx frontend/src/EvidencePane.tsx frontend/src/styles.css` — returned `[]`. Separate finish review returned **ship at source scope**. Separate documenter confirmed reuse of the existing system; pre-existing stale design/product status prose was reported and preserved.

Initial formatting/lint attempts exposed long Python literals and an incorrect Prettier working directory; corrected before the final passing checks above. No checks weakened. Existing Starlette/HTTPX/AnyIO deprecation warnings remain. jsdom emits its existing unavailable-canvas diagnostic during axe contrast processing; this is not a rendered contrast pass. Static palette checks and available DOM rules passed.

## External provider boundary

Gemini transport uses controlled responses in tests. The local runtime validator uses a synthetic placeholder key and never calls Send; it overrides inherited Gemini environment settings. No real Gemini call, account billing/quota validation or real-log transmission occurred. The [official model catalog](https://ai.google.dev/gemini-api/docs/models) listed `gemini-3.5-flash-lite` on 2026-09-20 UTC; live access remains unverified. See [analysis behavior and configuration](../analysis.md).

## Manual UI verification pending

Browser setup imported the supported runtime and attempted `agent.browsers.getForUrl('http://127.0.0.1:8000/')`: **No browser is available**. After reading `bootstrap-troubleshooting`, recovery discovery returned `[]`. The first attempt to print the discovery array required JSON serialization; serialized recovery output confirmed the empty list. No browser-control fallback or rendered screenshots were used.

- [ ] Rendered desktop layout: Demo Overview → advance once → Investigate checkout → optional analysis beneath local summary; inspect exact packet and hypotheses beside the queue.
- [ ] Rendered narrow-screen layout/overflow: repeat at phone width; long packet/messages must wrap or scroll inside their region, with Back to incidents visible.
- [ ] Real-browser keyboard navigation/focus: navigate to Preview, focus/scroll the packet, Send, follow validated evidence links and Back; refresh and change windows without stale results or focus loss.
- [ ] Browser-dependent loading/empty/error states and interactions: missing credentials; unpaid restriction; preview and send progress; provider timeout/rate limit/invalid response; explicit retry with unchanged packet; new preview; selection/window/dataset change during sending; reset/expired preview. Verify the local summary always remains available.

Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check. These checks are deferred under the project policy, not passed.


## PR #14 review fix R1 — malformed provider candidates

The candidate was accessed with `.get()` before checking that it was an object. Controlled HTTP 200 responses containing a null, string, number or array candidate reproduced an uncaught `AttributeError` through the actual send endpoint. The adapter now requires a list containing one object before checking its finish reason; malformed candidates use the existing bounded invalid-analysis JSON 502 explanation. No architectural or dependency change.

- `.venv/bin/pytest -q tests/test_analysis.py -k non_object_candidate --tb=short` — before: four failures at the reported `.get()` access; after: four passed. Each case verifies the exact bounded JSON explanation, connection cleanup, unchanged evidence and preview, no automatic retry, and a successful explicit retry with the identical provider request.
- `npm --prefix frontend run build` — passed.
- `npm --prefix frontend run typecheck` — passed.
- `npm --prefix frontend run lint` — passed.
- `npm --prefix frontend run format:check` — passed after formatting the added Router test with `./node_modules/.bin/prettier --write src/Investigation.test.tsx` from `frontend/`.
- `npm --prefix frontend test` — 80 passed in six files. New Router coverage verifies invalid-analysis guidance, a retained preview and enabled Send control, no automatic send, and usable local summary/evaluated-log navigation. Existing component coverage verifies explicit retry.
- `.venv/bin/ruff check log_watchdog tests scripts` — passed.
- `.venv/bin/ruff format --check log_watchdog tests scripts` — passed, 20 files.
- `.venv/bin/mypy` — passed, 11 source files.
- `.venv/bin/python scripts/check_contrast.py` — passed, nine palette pairs.
- `.venv/bin/pytest -q` — 121 passed; existing Starlette/AnyIO deprecation warnings only.

Tests use synthetic temporary-database evidence and controlled provider responses. No live Gemini call or real-log transmission. Existing jsdom canvas diagnostics remain; DOM/axe tests do not establish rendered behavior. Supported browser selection again reported no browser; after bootstrap troubleshooting, recovery discovery returned `[]`. The Manual UI verification pending checklist above remains applicable, especially invalid response → retained preview → explicit retry with the local summary visible.

- `.venv/bin/python scripts/validate_runtime.py` — passed using a temporary database and actual loopback HTTP on Python 3.14.5 / macOS 15.6 arm64. Synthetic preview, assets, ingestion, evaluated evidence, five-step recovery, delivery/process restart, reset/isolation, Historical upload and real-clock worker checks passed. 100k events in 1.399 s; browsing medians 3.00/5.37/9.14 ms; 100 paced events in 4.963 s at 20/s target. Environment-specific measurements; no provider send.
- `git diff --check` — passed.
