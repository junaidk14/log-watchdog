# Project tooling

This inventory tracks tooling used throughout implementation, including development tools, agent skills, languages, frameworks, libraries, databases, and services. Update it as tooling is introduced, configured, replaced, or removed.

Status: **Used** means exercised in this project; **Configured** means selected and documented but not yet exercised; **Planned** means required or proposed but not implemented.

## Development and collaboration

| Tool | Status | Purpose |
| --- | --- | --- |
| OpenAI Codex | Used | AI coding agent for repository inspection, architecture collaboration, code and documentation changes, and verification. |
| Codex CLI 0.155.1 | Used | Checked local version and non-interactive flags for runner compatibility; initial version check preceded execution; issue #1 implementation has now run under the project policy. |
| Bash 3.2.57 | Used | Validate the copied AFK runner with `bash -n`; also its execution shell when launched. |
| AFK Codex runner (`junaidk14/tools`) | Used | The initial run stopped for browser absence; the subsequent issue #1 run completed implementation, independent review, fixes, re-review and merge (PR #8). The authorized continuation is capped at five core issues (#2–#6), with Gemini #7 deferred and safe-stop requirements in project policy. Project policy now permits an explicitly documented automated-check fallback with rendered UI checks pending manual verification. Generic runner and prompts remain unchanged from commit `0e7016fd713b3306df0f44fb636b2d4c19ddc3f0`. |
| `jq` | Configured | Installed dependency used by the upstream runner to validate session results and GitHub state. |
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
| Optional LLM provider | Planned | Google Gemini API via server-side REST; default `gemini-3.5-flash-lite`, configurable through environment variables. No live integration verified yet; see ADR-021. |

## Project records

- [Product context](../PRODUCT.md): durable users, purpose, operating context, constraints, and open product details.
- [Design system](../DESIGN.md): implemented issue #1 tokens and components, with browser-dependent verification explicitly pending.
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
