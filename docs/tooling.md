# Project tooling

This inventory tracks tooling used throughout implementation, including development tools, agent skills, languages, frameworks, libraries, databases, and services. Update it as tooling is introduced, configured, replaced, or removed.

Status: **Used** means exercised in this project; **Configured** means selected and documented but not yet exercised; **Planned** means required or proposed but not implemented.

## Development and collaboration

| Tool | Status | Purpose |
| --- | --- | --- |
| OpenAI Codex | Used | AI coding agent for repository inspection, architecture collaboration, code and documentation changes, and verification. |
| Codex CLI 0.155.1 | Used | Checked local version and non-interactive flags for runner compatibility; initial version check preceded execution; issue #1 implementation has now run under the project policy. |
| Bash 3.2.57 | Used | Validate the copied AFK runner with `bash -n`; also its execution shell when launched. |
| AFK Codex runner (`junaidk14/tools`) | Used | The initial run stopped for browser absence; the subsequent issue #1 run completed implementation, independent review, fixes, re-review and merge (PR #8). All seven approved issues subsequently completed the implementation/review/fix/re-review/merge workflow. Gemini #7 followed the core MVP. Ordinary failures were repaired within configured retries; genuine blockers retain safe-stop behavior. Project policy now permits an explicitly documented automated-check fallback with rendered UI checks pending manual verification. Generic runner and prompts remain unchanged from commit `0e7016fd713b3306df0f44fb636b2d4c19ddc3f0`. |
| `jq` | Used | Installed dependency used by the upstream runner to validate session results and GitHub state. |
| Git | Used | Repository inspection and version control; inspected the remote and working-tree status. |
| GitHub | Used | Remote repository at `junaidk14/log-watchdog`; queried issue and label inventory. |
| GitHub Issues | Used | Published seven approved MVP tickets, labeled ready-for-agent, with eight verified native blocking relationships. Conventions are in [issue-tracker.md](agents/issue-tracker.md). |
| GitHub CLI (`gh`) | Used | Read/create issues and labels and create/verify native dependencies through the GitHub API. |
| zsh | Used | Shell for local repository commands. |
| ripgrep (`rg`) | Used | Fast repository file discovery. |
| Python 3 (`python3`) | Used | Local scripts for appending prompt audit entries and verifying documentation references. |
| Codex execution and patch tools | Used | Run local commands and apply file changes (`functions.exec`, `exec_command`, and `apply_patch`). |
| Clock tool (`clock__curr_time`) | Used | Read UTC time to report elapsed project time. |
| Impeccable CLI (`context`, `concept-seed`, `serve-question`) | Used | Inspect project context, obtain design reference candidates, and serve the local design choice page. |
| Browser runtime and Node execution tool | Used | Attempt to open the in-app preview; no browser was available, so the design choice page was opened using the system browser. |
| macOS `open` | Used | Open the local design choice page in the user's browser. |
| Structured question tool (`request_user_input_async`) | Used | Collect the user's design workflow preference during product initialization. |
| Codex sub-agent (`collaboration.spawn_agent`) | Used | Delegate a bounded, read-only architecture fact check as required by the grilling workflow. |
| Web research tool (`web__run`) | Used | Consult primary documentation for architecture and statistical detection recommendations through the fact-check sub-agent. |

## Agent skills

Only skills actually applied or explicitly configured for this project are listed; availability alone does not indicate use.

| Skill | Status | Purpose |
| --- | --- | --- |
| `setup-matt-pocock-skills` | Used | Set up the issue tracker, triage label vocabulary, and domain documentation conventions. |
| `writing-for-agents` | Used | Guide agent instructions, documentation pointers, and the core-only AFK execution policy. |
| `domain-modeling` | Used | Guide recording confirmed architectural decisions in `docs/adr/decisions.md`. |
| `grill-with-docs` | Used | Combine the design interview with ongoing architectural decision and glossary documentation. |
| `grilling` | Used | Shape the MVP through rounds of questions with explicit recommendations and confirmed choices. |
| `impeccable` (`init`) | Used | Capture durable product facts in `PRODUCT.md`; code-first workflow selected and stored in `.impeccable/config.json`. |
| `impeccable` (new UI design) | Used | Shape the selected Incident workbench around overview, incident evidence, filtered logs, and webhook delivery history; used for the issue #1 shell/log explorer, source detector and separate finish review; rendered verification is pending because browser discovery returned no browsers. |
| `impeccable` (`critique`) | Used | Independently assess the documented UI flow and selected Incident workbench proposal; rendered-UI verification is unavailable before implementation. |
| `impeccable` (`document`, seed mode) | Used | Record the user-selected Incident workbench in `DESIGN.md` and its surface brief, without inventing extracted tokens or implemented components. |
| `to-tickets` | Used | Draft and publish seven approved end-to-end MVP slices with acceptance criteria, ready-for-agent labels, and verified native blocking edges. |
| `openai-docs` | Used | Verify official non-interactive Codex guidance while adapting the project execution policy around the unchanged runner. |
| `browser:control-in-app-browser` | Used | Guide browser connection and availability checks for the local design preview. |
| `triage` | Configured | Installed skill with the five default label mappings documented in [triage-labels.md](agents/triage-labels.md); no triage run yet. |

## Languages and document formats

| Language or format | Status | Purpose |
| --- | --- | --- |
| Python | Used | Python 3.14.5 verified in the application virtual environment; implements validation, persistence, API, tests and verification scripts. |
| Markdown | Used | Agent instructions, configuration documentation, tooling inventory, and the prompt audit log. |
| Shell commands | Used | Local inspection and execution through zsh. |

## Application stack

| Component | Status | Selection |
| --- | --- | --- |
| API framework | Used | FastAPI 0.141.1 for typed ingestion/browsing and static dashboard serving; Pydantic 2.13.5 validates shared events. |
| Database | Used | SQLite through Python sqlite3, WAL mode, dataset-scoped uniqueness and indexed browsing; no separate service or ORM. |
| Dashboard framework | Used | React with TypeScript; Vite builds the Logs explorer for serving by FastAPI. Exact versions are in frontend/package-lock.json. |
| Optional LLM provider | Used | Google Gemini API via server-side REST; default `gemini-3.5-flash-lite`, configurable through environment variables. Implemented and tested with controlled responses; no live provider request verified. See ADR-031. |

## Project records

- [Product context](../PRODUCT.md): durable users, purpose, operating context, constraints, and open product details.
- [Design system](../DESIGN.md): completed MVP tokens and components, with browser-dependent verification explicitly pending.
- [AFK runner setup](../afk-Codex/README.md): pinned provenance, unchanged execution flow, launch prerequisites, and validation.
- [UI investigation flow](ui-flow.md): workbench interactions, evaluated-evidence scope, clock/recovery feedback, delivery endings, and keyboard acceptance cases.
- [Agent instructions](../AGENTS.md): entry point for repository-specific engineering conventions and the ongoing tooling documentation requirement.
- [Prompt audit log](../prompts.md): user prompts and the project timer start timestamp.
- [Domain documentation rules](agents/domain.md): single-context layout and guidance for consuming domain terms and architecture decisions.
- [Architectural decisions](adr/decisions.md): concise decision, rationale, and status entries for material architectural choices actually made.

Versions are omitted until verified from the environment or project dependency files.


## Issue #1 implementation and verification tooling

| Tool | Status | Purpose |
| --- | --- | --- |
| Uvicorn 0.53.0 | Used | Documented Python launcher binds 127.0.0.1:8000 with one worker. |
| Pydantic | Used | Shared event schema, JSON metadata bounds, timezone normalization, field-indexed validation. |
| setuptools / editable Python package | Used | Local installation and `log-watchdog` entry point; requirements-dev.lock pins the exercised Python dependencies. |
| uv | Used | Create the virtual environment and install/verify the Python lockfile; standard venv/pip instructions are also documented. |
| Node.js 26.0.0 / npm 12.0.2 | Used | Frontend dependency installation, repeatable npm ci, scripts and lockfile. |
| TypeScript | Used | Strict frontend type checking as a standalone command and before builds. |
| Vite 6.4.3 / React plugin | Used | Production frontend bundles and loopback development proxy. |
| pytest 9.1.1 / httpx 0.28.1 | Used | API/integration tests and actual HTTP startup, persistence/restart and bounded performance measurements. |
| Ruff 0.16.8 / mypy 1.20.2 | Used | Python lint/format checks and strict application type checks. |
| Vitest 4.1.11 / jsdom | Used | DOM interaction regressions; no rendered-browser claims. |
| React Testing Library / user-event / jest-dom | Used | Filter, Back, expansion/focus, race, error and same-query tests. |
| axe-core / eslint-plugin-jsx-a11y | Used | Available DOM accessibility and JSX checks. Color contrast is deferred to rendering, with static palette ratios separately checked by scripts/check_contrast.py. Named scroll regions are intentionally allowed keyboard focus. |
| ESLint / typescript-eslint | Used | Frontend and configuration linting. The installed ESLint 9 line reports a support deprecation warning; checks pass, and npm audit reports zero vulnerabilities. |
| Prettier | Used | Frontend formatting and repeatable format:check. |
| Impeccable detector | Used | Scanned App.tsx and styles.css; no detector findings. Source evidence only. |
| Impeccable finish reviewer and documenter subagents | Used | Skill-required separate source review and actual design-token documentation. Reviewer scored two navigation fixes resolved; visual checks remain pending. |
| `pr` skill | Used | Structure the issue #1 PR with scope, before/after evidence, decisions, exact verification and limitations. |
| `domain-modeling` skill | Used | Record atomic batch identity and direct SQLite/offset-browsing decisions as ADR-023 and ADR-024. |

No external runtime services, images, fonts, LLM calls, or webhook delivery are introduced by issue #1. Browser setup and supported recovery both found no usable browser; the policy's automated fallback was applied. Detailed evidence and pending manual checks are in [issue #1 verification](verification-issue-1.md).


## PR #8 review fixes

- `diagnosing-bugs` skill — Used to reproduce R1/R2 with failing API and history-traversal regressions before fixing them.
- Pydantic `AfterValidator` — Used to normalize browse bounds during request validation, producing field-specific overflow errors before storage.
- Vitest/jsdom and React Testing Library — Used for real `history.back()` / `history.forward()` traversal with scroll events and delayed mocked responses; does not establish rendered browser scrolling.
- Browser skill — Used again for supported setup/recovery discovery; no browser available (`getForUrl` failed, recovery list empty). Manual rendered checks remain pending.
- `pr` skill — Used to update the existing PR evidence. Existing Python/frontend verification tools were reused without dependency changes.

## Issue #2 detection and overview

- Python `math`, Pydantic configuration, SQLite transactions/indexes — Used for the smoothed proportion detector, persistent cursors, incident grouping and event inclusion watermarks. No statistical runtime dependency added.
- Python `asyncio` / FastAPI lifespan — Used for the single-worker real-clock evaluation loop; SQLite evaluation runs in a thread and resumes its durable cursor after restart.
- React/TypeScript and data-driven SVG — Used for the incident-first overview, minimal detail and separate rate/volume charts with exact-value tables. Existing CSS tokens are retained.
- pytest, Vitest/Testing Library, axe, Ruff, mypy, ESLint, Prettier and Vite — Used for deterministic detector/clock, API, DOM, accessibility, lint, formatting, type and build verification.
- httpx and subprocess runtime validator — Used for actual loopback demo progression, late-evidence immutability, restart, real-time worker execution and repeated bounded performance measurements.
- Impeccable skill/context/detector and finish reviewer/documenter — Used for the established console extension. Source detector reported no findings; finish review requested transition announcements, addressed with DOM regression coverage. Rendered verification remains deferred under the policy fallback.
- Browser skill/runtime — Used for supported connection and recovery discovery; `getForUrl` returned no available browser and recovery `list()` returned `[]`.
- `pr` skill and GitHub CLI — Used for PR structure, complete paginated issue/PR/dependency eligibility checks, and publication. No dependency versions changed.

## PR #9 review fix R1

- `diagnosing-bugs` skill and pytest — Used for a failing persisted-SQLite restart regression covering increased minimum history, recovery, frozen membership, unchanged evaluations, and resumed learning after recovery.
- Existing Ruff, mypy, frontend and HTTP runtime checks — Used for verification without dependency changes.
- Browser skill — Used for supported browser availability/recovery discovery; rendered checks remain separately recorded.
- `pr` skill — Used to update the existing PR evidence.
- `domain-modeling` skill — Used to record the open-incident eligibility policy as ADR-026 in the existing decision log.

## Issue #3 evaluated investigation

- React/TypeScript, browser History API and MutationObserver — Used for shared in-app navigation, pinned incident/window URLs, saved return context, and focus restoration after asynchronous evidence loads; no router dependency added.
- SQLite, FastAPI and Python standard library — Used for snapshot evidence reads, explicit late-arrival membership, literal refinements, sampled logs, exact-message patterns and a persisted demo-run UUID. No new runtime dependency.
- Existing pytest/httpx and loopback runtime validator — Used for evidence membership, isolation, missing-evidence/reset-boundary fixtures, actual HTTP, restart and measured performance.
- Vitest/jsdom, Testing Library and axe — Used for scoped investigation, filters/late-arrival toggle, expansion, Back/return focus, multi-window interval/focus regressions and DOM accessibility checks.
- Impeccable context/detector and separate finish reviewer/documenter — Used for the established console extension; source detector reported no findings. Browser discovery/recovery found no usable browser, so rendered checks remain explicitly deferred.
- `domain-modeling` and `pr` skills, GitHub CLI, Git and clock tool — Used for the persisted evidence identity decision, PR evidence, full paginated eligibility checks and elapsed-time reporting. Existing build/lint/type/format/contrast tools reused without dependency changes.


## Authorized AFK resumption

- Temporary external PR #10 resume script — Reuses the generic runner session functions and complete independent review/fix/re-review/merge gates, starting at review for the existing PR. Preserves logs outside the repo; generic runner files remain unchanged.
- Codex Fast mode — Existing user configuration has `service_tier = "fast"`; CLI reports `fast_mode` stable/enabled. Inherited by fresh sessions, without reducing reasoning or verification. Configuration checked against [official speed documentation](https://developers.openai.com/es-419/docs/agent-configuration/speed); actual server-side tier availability is not guaranteed by the setting.
- `pr` and `writing-for-agents` skills — Used for the closing-reference correction and updated execution scope respectively.


## PR #10 review fixes R1 and R2

- `diagnosing-bugs` skill, Vitest/jsdom and Testing Library — Used to reproduce four failing return-focus cases, then verify primary-navigation return, unavailable/hidden origins, browser Back after clearing selection, delayed evidence and failed evidence responses. The existing recovered-incident traversal now also asserts focus.
- React/TypeScript, History API, MutationObserver and computed styles — Used to preserve explicit focus destinations, reject hidden targets and wait for evidence loading before falling back to the incident heading. No dependencies added.
- Impeccable context/craft-floor/detector and Browser skill/runtime — Used for the scoped accessibility refinement; detector returned no findings. Supported browser setup failed and recovery discovery returned an empty list, so rendered checks remain pending.
- Existing frontend/backend build, test, lint, type, format, contrast and loopback runtime commands — Reused for verification. `pr` skill, GitHub CLI, Git and clock tool used for the existing PR update and elapsed-time evidence.


## PR #10 refresh-restoration fix R1

- React/TypeScript, History API and browser focus/scroll events — Used to keep the workbench snapshot current, protect it while loading/restoring, and defer restoration until evidence settles. Existing MutationObserver reused; no dependency or architectural change.
- `diagnosing-bugs`, Vitest/jsdom and Testing Library — Used for failing-then-passing reload regressions with preserved URL/history and delayed evidence, covering evidence-link and existing-heading focus plus scroll.
- Impeccable context/craft-floor/detector, Browser runtime and `pr` skill — Used for scoped focus hardening, supported availability/recovery discovery, source checks and PR evidence. Browser unavailable; rendered checks remain deferred.
- Existing frontend/backend checks and actual loopback runtime validator — Used unchanged for verification.


## PR #10 empty-focus review fix R1

- `diagnosing-bugs`, Vitest/jsdom and Testing Library — Used for failing-then-passing actual Router reload regressions for Back to incidents, Refresh overview and an empty saved identity; missing/unidentified target coverage also verifies heading fallback and delayed scroll restoration.
- React/TypeScript and History API — Used for stable control IDs and nonempty saved focus fallback; no new dependencies or architectural decisions.
- Browser skill/runtime — Used for supported setup and recovery discovery: no browser available; discovery returned `[]`.
- Existing frontend/backend build, lint, type, format, contrast, test and loopback runtime tools; `pr` skill and GitHub CLI — Used for verification and updating the existing PR.


## PR #10 primary-Logs browser-Back fix R1

- `diagnosing-bugs`, React/TypeScript History API, Vitest/jsdom and Testing Library — Used for an actual Router regression of Investigate → primary Logs → browser Back with delayed evidence, including an older entry without a focus identity. Existing focus snapshots survive id-less links; saved positions enable fallback. No new dependencies.
- Impeccable context/craft-floor/detector and Browser runtime — Used for scoped focus verification. Detector found no source issues; supported browser setup failed and recovery returned `[]`, so rendered checks remain pending.
- Existing build/test/lint/type/format/contrast/runtime commands, Git/GitHub CLI and `pr` skill — Used for verification and the same-PR update. Codex sub-agent used for the user-requested fresh whole-PR read-only review.


## PR #10 failed-Overview return focus R1

- `diagnosing-bugs`, React/TypeScript, Vitest/jsdom and Testing Library — Used for four failing-then-passing actual Router regressions covering explicit/browser Back with immediate/delayed Overview failures, visible page-heading fallback, keyboard retry, selection/window persistence and subsequent refresh focus. No dependency added.
- Impeccable context/harden/craft-floor/detector and Browser skill/runtime — Used for this scoped error/focus correction. Source detector found no issues; supported browser selection failed and recovery discovery returned `[]`, leaving rendered checks pending.
- Existing frontend/backend build, test, lint, type, format, contrast and real-HTTP validation tools — Reused for full verification. `pr`, GitHub CLI, Git and clock — Used for existing PR evidence, metadata checks and elapsed-time reporting.


## Remaining backlog continuation

Project-specific AFK policy now authorizes #4–#7 and requires implementation/fix agents to self-check base, sole closing issue, branch/head, draft/repository/auto-merge state and competing PRs before handoff, correcting their own metadata mistakes and refetching. Uses the existing `writing-for-agents` guidance. Generic runner and prompts remain pinned and unchanged; current CLI Fast-mode configuration is inherited. Final Impeccable refinement, repo review, README and presentation are separately authorized after all issues merge; no external submission.

## Issue #4 delivery slice

- Python standard-library `http.client` — Used for bounded actual HTTP to the fixed local receiver without proxy or redirect behavior. No new runtime dependency.
- Existing SQLite/FastAPI/asyncio — Used for atomic notifications, persisted attempts/receiver receipts, settings APIs, and the single background delivery worker.
- Existing React/TypeScript/CSS, Vitest/Testing Library/axe, pytest/httpx/Uvicorn, Ruff/mypy and runtime validation — Used for the Deliveries view and real local HTTP/restart verification.
- Impeccable context, surface brief, craft floor, mechanical detector and separate finish reviewer — Used to extend the existing console. Detector returned no findings; rendered checks remain deferred.
- Browser skill and supported runtime recovery discovery — Used; `getForUrl` reported no available browser and `browsers.list()` returned `[]`.
- `pr` skill, Git/GitHub CLI, and clock tool — Used for issue eligibility, PR evidence/metadata handoff and elapsed time.


## PR #11 review fix R1

- `diagnosing-bugs` skill and existing Vitest/React Testing Library — Used for failing then passing Router interactions from Historical Deliveries via both Overview links, and the unavailable Incidents link.
- Existing frontend build, type, lint, formatting, DOM/axe tests, Python checks and runtime validator — Used to verify the scoped navigation fix; no new dependencies or architectural decisions.
- Browser skill/runtime — Used for supported setup and recovery; `getForUrl` reported no available browser, recovery discovery returned `[]`. Rendered checks remain pending under the authorized fallback.
- `pr` skill, GitHub CLI, Git and clock tool — Used to update the existing PR evidence and verify metadata/elapsed time.


- Git worktree — Used for a disjoint policy/audit update on clean main while preserving known partial issue #5 changes in the implementation checkout.
- Codex CLI queue — Attempted user steering; unsupported for this ephemeral thread because no saved rollout exists. No queued message was delivered.
- AFK failure handling — Ordinary failed checks are diagnosed, fixed and rerun; only unresolved failures after configured retries, genuine blockers or unsafe/ambiguous Git/PR state stop the run. Independent review and merge gates are unchanged.


## Issue #5 historical upload recovery

- Existing Python/FastAPI/Pydantic/SQLite — Used for streamed byte bounds, shared atomic event validation/deduplication, historical persistence and bounded descriptive trend queries; no dependency or schema change.
- Existing React/TypeScript, native FileReader, Fetch and SVG — Used for file reading, indeterminate progress, row/field feedback, interval navigation, rate/volume charts and exact-value tables.
- `diagnosing-bugs`, pytest/httpx and Vitest/Testing Library/axe — Used to reproduce/fix ordinary lint/test failures, cover oversized JSON integers and verify upload limits, isolation, errors and interactions. Existing Ruff/mypy/Prettier/ESLint/Vite/static contrast and actual HTTP runtime tools reused.
- Impeccable context/craft-floor/detector and separate finish reviewer/documenter — Used for the established console extension; no mechanical findings. Browser skill/runtime setup and supported recovery returned no browser (`[]`), leaving rendered checks pending.
- `pr` skill, Git/GitHub CLI and clock — Used for complete paginated eligibility, recovery audit, commit/push/PR and metadata handoff. Protected runner files remain unchanged.

## PR #12 review fixes R1/R2

- `diagnosing-bugs` skill and pytest/TestClient — Used for failing then passing media-type and precise conflict-row regressions, including atomic rollback with existing and within-file IDs.
- Existing Python/FastAPI/SQLite and frontend verification tools — Used without new dependencies or schema changes. Runtime HTTP upload fixtures now supply the dashboard's application/json header.
- Browser skill/runtime — Used for supported setup and recovery discovery; no browser available and recovery list empty. Rendered checks remain pending.
- `pr` skill, Git/GitHub CLI and clock tool — Used for existing PR evidence, metadata handoff and elapsed time.

## Issue #6 lifecycle

- Existing Python/FastAPI/SQLite/asyncio and standard-library `threading.RLock` — Used for startup/hourly retention, atomic Demo reset, worker/reset serialization, and monotonic identities in the existing settings table. No runtime dependency added.
- Existing React/TypeScript/CSS, Vitest/Testing Library/axe — Used for inline run-bound confirmation, cancellation, busy/error/completion states and DOM focus checks. jsdom contrast is covered separately by the existing static palette checker, not represented as rendered verification.
- Existing pytest/httpx/Uvicorn, Ruff/mypy and runtime validator — Used for protected evidence, expiration boundaries, restart, rollback, in-flight HTTP/evaluation serialization, real HTTP and measured 100k-event/20-events-per-second validation.
- Impeccable context/craft-floor/detector — Used for the narrow extension; detector returned `[]`. The required finish-reviewer spawn failed with a harness thread error, so the documented inline finish-reviewer/documenter fallbacks were used. Existing design system preserved; no raster assets.
- Browser skill/runtime — Used for supported setup/recovery; `getForUrl` reported no browser and discovery returned `[]`. Rendered checks remain deferred under the authorized fallback.
- `domain-modeling` and `pr` skills; Git/GitHub CLI and clock — Used for lifecycle decisions, paginated eligibility/dependency checks, PR evidence, metadata handoff and elapsed time.

## PR #13 review fix R1

- `diagnosing-bugs`, Vitest/jsdom, Testing Library and axe — Used to reproduce stale run URLs with/without incident selection and real History API Back after two mocked successful resets. Existing tests verify return-link recovery and mutation guards; DOM evidence does not establish rendered behavior. The supplied review already localized the cause, so the regression loop replaced speculative hypothesis/instrumentation work.
- Impeccable context, harden guidance and detector — Used for the scoped stale-state fix with existing error/control styles; no new visual tokens or dependencies.
- Browser skill/runtime — Used for supported discovery and recovery; no browser available, recovery list empty.
- Existing frontend/backend build, lint, format, type, contrast, test and runtime tools — Reused for verification; `pr` skill and GitHub CLI used to update the existing PR.

## PR #13 general Logs review fix R1

- Existing FastAPI/SQLite and React/TypeScript — Used to guard general Demo event reads in one snapshot and show the existing reset error/recovery pattern without an incident selection. No new dependency, schema or material architectural decision.
- `diagnosing-bugs`, pytest/TestClient and Vitest/Testing Library/axe — Used for red/green API and component regressions, a deterministic reset/read interleaving, reload/refresh/Back and recovery. Supplied findings localized the cause, so regression reproduction replaced speculative hypotheses and instrumentation.
- Impeccable context/harden/craft-floor/detector — Used for the scoped error state within existing styles; detector returned `[]`. Browser skill setup/recovery returned no browser and `[]`; rendered verification remains deferred.
- Existing Ruff/mypy/ESLint/Prettier/TypeScript/Vite, static contrast and real HTTP runtime validator — Used for verification. jsdom's axe canvas/contrast diagnostic is an environment limit, not rendered contrast evidence; no checks were disabled.
- `pr` skill, Git/GitHub CLI and clock — Used for existing PR evidence, dependency/metadata checks and handoff.

## PR #13 delivery guidance review fix R1

- Existing React/TypeScript and Markdown — Used for the exhausted-delivery reset instructions and matching retry/exhaustion walkthrough; no new dependency or architectural decision.
- Impeccable context/clarify/craft-floor/detector and `pr` skill — Used for scoped recovery copy and existing PR evidence. Detector returned `[]`; existing design tokens retained.
- Existing Vitest/Testing Library/axe, pytest/TestClient, TypeScript/Vite, ESLint/Prettier, Ruff/mypy, static contrast and runtime validator — Used for verification. Temporary-database API walkthrough verifies reset restores Success before configuring each new scenario.
- Browser skill/runtime — Used for supported setup and recovery; no browser available and recovery list `[]`. Rendered checks remain pending.
- Git/GitHub CLI, Python standard library and clock — Used for state/dependency checks, audit/evidence updates and elapsed-time handoff.

## Issue #7 optional analysis

- Existing Python/FastAPI/Pydantic/SQLite and standard-library `http.client`, bounded in-memory cache and locks — Used for trusted simulator provenance, immutable expiring previews, explicit fixed-host TLS Gemini REST calls and validated bounded output. No dependency added. `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_PAID_SERVICE` are server-only environment configuration; default model catalog checked, live provider/account access unverified.
- Existing React/TypeScript/CSS, Vitest/Testing Library/axe and pytest/HTTPX — Used for explicit disclosure/send, preserved local summaries, scoped state and controlled provider tests. Existing build, lint, type, format, contrast and actual loopback runtime validation reused.
- Impeccable context/surface brief/craft floor/mechanical detector and separate finish reviewer/documenter — Used for the established incident-pane extension; detector returned `[]`. Browser skill supported setup failed; recovery discovery returned `[]`, so rendered checks remain deferred. No new design tokens or raster assets.
- `domain-modeling` and `pr` skills; Git/GitHub CLI, official Google documentation via web tools and clock — Used for decisions, eligibility/dependency checks, provider contract, PR evidence and metadata handoff.


## PR #14 malformed-candidate review fix R1

- Existing Python/FastAPI and pytest/TestClient with controlled `http.client` responses — Used to reproduce four uncaught candidate-shape failures, validate JSON 502 guidance, and verify unchanged evidence and same-preview explicit retry. No dependencies or architectural decisions added.
- `diagnosing-bugs` skill — Used for the failing-then-passing endpoint regression; the supplied finding localized the cause, so additional speculative hypotheses/instrumentation were unnecessary. Existing Vitest/Testing Library verifies the invalid-response guidance, retained preview/local summary and evaluated-log navigation.
- Existing build, lint, type, format, contrast, backend/frontend tests and runtime validator — Used for verification. Browser skill supported setup failed and recovery discovery returned `[]`; rendered checks remain pending.
- `pr` skill, Git/GitHub CLI and clock — Used for existing-PR evidence, assigned state/dependency checks and elapsed-time handoff.


## Final refinement and handoff

- **Impeccable critique, audit, polish, document — Used.** Two isolated source assessments and a deterministic scan inform a bounded refinement of sparse states, chart readings, evidence order, focus geometry and spacing. DESIGN.md and its schema-v2 sidecar capture the result. No decorative motion added.
- **Browser skill — Used for discovery.** Supported selection reported no browser; recovery returned `[]`. Rendered desktop/narrow/keyboard checks remain deferred, not passed.
- **code-review — Used.** Separate read-only Standards and Spec assessments of the entire implementation since the pre-code policy commit, plus final changes. Findings/results are recorded in final validation.
- **Markdown and Mermaid — Used.** Local AI-generated presentation and architecture diagram; no deck upload or external submission.
- Existing React, inline SVG, CSS, Vitest/axe, Ruff, mypy, pytest and real-HTTP validation tooling are reused. No runtime dependency or architecture was added for polish.

- **pr skill — Used.** Structured final refinement PR description with concrete change, evidence and rollback scope.


## Bounded product cleanup

Existing FastAPI/React infrastructure now supports session-only Gemini key entry without a new service, dependency or storage system. Impeccable refinement guidance and domain-modeling decision documentation were used; the code-review skill provides independent Standards/Spec checks. Browser setup was attempted again and recovery returned no browsers, so rendered checks remain unverified. The favicon is an original code-generated ICO using Python’s standard `struct` module, served by FastAPI and copied by Vite. Credential tests use visibly synthetic values only; no user key is recorded in tools, artifacts or telemetry.

## Rendered UX cleanup

- **Playwriter skill and CLI — Used.** Before/after rendered inspection in local headless Chrome, session 3, at 1440px and 390px. The extension did not attach even after the user enabled it; supported headless mode succeeded. Screenshots, accessibility snapshots, layout inspection, keyboard/Back/Forward, synthetic upload and memory-key/preview/clear checks used a temporary database. No external provider request. Only failed request URLs/statuses were collected, never request bodies or credentials.
- **Impeccable polish guidance — Used.** Scoped refinement of existing page responsibilities, action hierarchy, alignment and copy; preserves the incident-workbench direction.
- **Chrome DevTools MCP — Not used.** Reserved for diagnosis if the rendered checks expose a problem that needs it.

- **Google AI for Developers documentation — Consulted.** Verified the official AI Studio API-key destination via https://ai.google.dev/gemini-api/docs/api-key. No account access or key creation performed.

## Gemini setup bug fix

- **Diagnosing Bugs skill — Used.** Deterministic red/green backend API and React integration regressions reproduced dotted-key rejection, input truncation and stale parent errors. No separate review pass, per user request.
- **Google AI Developers documentation/forum — Consulted.** Google's announcement confirms the transition to AQ authorization keys: https://discuss.ai.google.dev/t/my-api-key-is-only-aq-not-standard/172262. Only synthetic key fixtures were used locally; no credential inspection or provider call.
- Existing pytest, Vitest/Testing Library, Ruff, mypy, TypeScript, ESLint, Prettier, Vite and contrast checks validate the focused change. No added dependency.

## Evidence eligibility and readability follow-up

Existing React/native HTML select and input controls, SQLite dataset-scoped service lookup, pytest and Vitest were reused without new dependencies. Playwriter session 3 inspected the rendered changes in local headless Chrome using a disposable database on port 8001, with background delivery disabled. A read-only SQLite aggregate confirmed mixed trusted/unverified Demo provenance in the user database; no log messages or credentials were inspected. No real Gemini request or automatic user-data reset occurred.
