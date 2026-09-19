# Project tooling

This inventory tracks tooling used throughout implementation, including development tools, agent skills, languages, frameworks, libraries, databases, and services. Update it as tooling is introduced, configured, replaced, or removed.

Status: **Used** means exercised in this project; **Configured** means selected and documented but not yet exercised; **Planned** means required or proposed but not implemented.

## Development and collaboration

| Tool | Status | Purpose |
| --- | --- | --- |
| OpenAI Codex | Used | AI coding agent for repository inspection, architecture collaboration, code and documentation changes, and verification. |
| Codex CLI 0.155.1 | Used | Checked local version and non-interactive flags for runner compatibility; no autonomous implementation session launched. |
| Bash 3.2.57 | Used | Validate the copied AFK runner with `bash -n`; also its execution shell when launched. |
| AFK Codex runner (`junaidk14/tools`) | Configured | Generic runner and implementation/review prompts copied unchanged from commit `0e7016fd713b3306df0f44fb636b2d4c19ddc3f0`; Log Watchdog execution policy added separately. |
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
| `writing-for-agents` | Used | Guide agent instructions and documentation pointers in `AGENTS.md`. |
| `domain-modeling` | Used | Guide recording confirmed architectural decisions in `docs/adr/decisions.md`. |
| `grill-with-docs` | Used | Combine the design interview with ongoing architectural decision and glossary documentation. |
| `grilling` | Used | Shape the MVP through rounds of questions with explicit recommendations and confirmed choices. |
| `impeccable` (`init`) | Used | Capture durable product facts in `PRODUCT.md`; code-first workflow selected and stored in `.impeccable/config.json`. |
| `impeccable` (new UI design) | Used | Shape the selected Incident workbench around overview, incident evidence, filtered logs, and webhook delivery history; code-first implementation remains pending. |
| `impeccable` (`critique`) | Used | Independently assess the documented UI flow and selected Incident workbench proposal; rendered-UI verification is unavailable before implementation. |
| `impeccable` (`document`, seed mode) | Used | Record the user-selected Incident workbench in `DESIGN.md` and its surface brief, without inventing extracted tokens or implemented components. |
| `to-tickets` | Used | Draft and publish seven approved end-to-end MVP slices with acceptance criteria, ready-for-agent labels, and verified native blocking edges. |
| `openai-docs` | Used | Verify official non-interactive Codex guidance while adapting the project execution policy around the unchanged runner. |
| `browser:control-in-app-browser` | Used | Guide browser connection and availability checks for the local design preview. |
| `triage` | Configured | Installed skill with the five default label mappings documented in [triage-labels.md](agents/triage-labels.md); no triage run yet. |

## Languages and document formats

| Language or format | Status | Purpose |
| --- | --- | --- |
| Python | Used / Planned | Used for development scripts; selected by the user as the application language. Application implementation has not started. |
| Markdown | Used | Agent instructions, configuration documentation, tooling inventory, and the prompt audit log. |
| Shell commands | Used | Local inspection and execution through zsh. |

## Application stack

| Component | Status | Selection |
| --- | --- | --- |
| API framework | Planned | FastAPI, selected for the Python API and local application. |
| Database | Planned | SQLite, selected for free local persistence. |
| Dashboard framework | Planned | React, selected for a lightweight investigation dashboard. |
| Optional LLM provider | Planned | Google Gemini API via server-side REST; default `gemini-3.5-flash-lite`, configurable through environment variables. No live integration verified yet; see ADR-021. |

## Project records

- [Product context](../PRODUCT.md): durable users, purpose, operating context, constraints, and open product details.
- [Design seed](../DESIGN.md): selected visual direction and explicitly unresolved implementation values; not an extracted or verified design system.
- [AFK runner setup](../afk-Codex/README.md): pinned provenance, unchanged execution flow, launch prerequisites, and validation.
- [UI investigation flow](ui-flow.md): workbench interactions, evaluated-evidence scope, clock/recovery feedback, delivery endings, and keyboard acceptance cases.
- [Agent instructions](../AGENTS.md): entry point for repository-specific engineering conventions and the ongoing tooling documentation requirement.
- [Prompt audit log](../prompts.md): user prompts and the project timer start timestamp.
- [Domain documentation rules](agents/domain.md): single-context layout and guidance for consuming domain terms and architecture decisions.
- [Architectural decisions](adr/decisions.md): concise decision, rationale, and status entries for material architectural choices actually made.

Versions are omitted until verified from the environment or project dependency files.
