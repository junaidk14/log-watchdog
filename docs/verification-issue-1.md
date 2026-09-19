# Issue #1 verification evidence

Environment: macOS 15.6 arm64, Python 3.14.5, Node 26.0.0, npm 12.0.2. Dependencies are recorded in `requirements-dev.lock` and `frontend/package-lock.json`. Results were measured on 2026-09-19 UTC (2026-09-20 IST).

## Automated evidence

- `npm --prefix frontend run build`: passed TypeScript compilation and Vite production build; 29 transformed modules. JavaScript bundle approximately 234 kB / 73 kB gzip, CSS 5.74 kB / 2 kB gzip. No external fonts or images.
- `npm --prefix frontend run lint`: passed ESLint, TypeScript rules and JSX accessibility rules.
- `npm --prefix frontend run format:check`: passed Prettier.
- `npm --prefix frontend test`: 14 Vitest/jsdom interaction tests passed, including axe DOM checks. Color-contrast checks are excluded from axe's jsdom invocation because they require rendering; static token contrast is assessed separately, not represented as a rendered check.
- `.venv/bin/ruff check log_watchdog tests scripts`: passed.
- `.venv/bin/ruff format --check log_watchdog tests scripts`: passed.
- `npm --prefix frontend run typecheck`: passed.
- `uv pip install -r requirements-dev.lock` and `npm --prefix frontend ci`: completed successfully from lockfiles. npm reported deprecation notices for the ESLint 9 line and whatwg-encoding; build/lint/tests still passed.
- `.venv/bin/python scripts/check_contrast.py`: nine actual semantic token combinations passed 4.5:1; smallest ratio 5.19:1. Static palette evidence only.
- `.venv/bin/mypy`: strict check passed for five application modules.
- `.venv/bin/pytest -q`: 31 passed. Two upstream deprecation warnings remain for Starlette's httpx compatibility and anyio portal alias; no test failure or warning suppression.
- `.venv/bin/python scripts/validate_runtime.py`: passed actual loopback HTTP startup, dashboard and JavaScript asset serving, bulk/paced ingestion, browsing, process restart and dataset isolation.
- `npm --prefix frontend audit`: zero reported vulnerabilities after updating the test runner to Vitest 4.1.11.
- `/Users/junaidahamad/.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/App.tsx frontend/src/styles.css`: returned `[]`. This is a source detector, not a visual review.

Meaningful defects found and fixed during verification: non-finite metadata previously caused serialization of the validation response to fail; raw validation inputs are now excluded while preserving index/field/type/message. A separate finish review identified same-query navigation clearing results without reloading and Back restoring scroll before fetched rows exist. Regression tests cover both fixes; the same finish reviewer scored both resolved in its follow-up.

## Local measurements

Temporary SQLite database; synthetic live events across three services, alongside 3,600 demo events; one Uvicorn worker; real HTTP via httpx. Bulk ingestion used 100 requests of 1,000 events. Each browsing query ran 10 times after 100,000 live events were stored.

| Measurement | Result |
| --- | --- |
| 100,000-event bulk load | 1.327 s |
| First page median / maximum | 3.38 / 3.58 ms |
| Page 2,000 median / maximum | 5.54 / 5.67 ms |
| Service + severity + message filter median / maximum | 9.45 / 9.89 ms |
| 100 individual events scheduled at 20/second | All accepted in 4.962 s |
| Paced ingestion median / maximum response | 3.23 / 11.43 ms |
| Live count after actual process restart | 100,100 |
| Demo / historical counts after restart | 3,600 / 0 |

These are one-machine measurements of bounded synthetic fixtures, not throughput guarantees, sustained-load tests, or browser rendering measurements. Message filtering and counts scan matching dataset rows; larger datasets and concurrent producers may be slower. Offset pages may shift when new events arrive.

## Browser discovery and permitted deferral

Loaded `browser:control-in-app-browser`, initialized the supported browser runtime, and called `agent.browsers.getForUrl("http://127.0.0.1:8000")`. It returned **No browser is available**. Read the supported `bootstrap-troubleshooting` recovery instructions; `agent.browsers.list()` returned **[]**. No alternate automation backend was used. The repository's authorized browser-unavailable fallback applies.

**Browser unavailable; rendered desktop, narrow-screen, and keyboard verification require a later manual check.** Source and DOM checks do not establish those results. The independent source finish review is separate from the runner's independent PR review and merge gate.

## Manual UI verification pending

Start with the README commands, then open http://127.0.0.1:8000/.

- [ ] **Logs, desktop:** at 1440px and 1100px, inspect rail, filters, count, table, expanded metadata and pagination. Confirm readable labels, contrast, focus visibility, and no clipping; repeat at 200% zoom.
- [ ] **Logs, narrow screen:** at 390px, confirm the navigation collapses, filters stack, touch controls remain usable, long messages/IDs stay inside the named horizontally scrollable table, and the page itself does not overflow.
- [ ] **Keyboard/navigation:** Tab from Skip to logs through dataset, filters, Apply, Refresh, table region, Expand and pagination. Enter/Space expands while preserving focus. Scroll the table using keys. Filter, go to page 2, then Back and Forward; verify URL fields, table contents and prior scroll position after loading.
- [ ] **Loading/empty/error and changed interactions:** throttle the local browser connection to inspect loading; choose empty Historical and clear already-clear filters; use a nonmatching message; apply unchanged filters; stop the API, refresh, confirm retained same-query results/error and Retry after restart. Change datasets while a request is slow to verify stale rows never appear under the new dataset.

No screenshots or rendered accessibility pass are claimed.
