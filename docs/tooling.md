# Tooling inventory

Current consolidated inventory. **Used** means exercised in this project; **Configured** means available/configured without a completed use. Historical per-turn details remain in [prompts.md](../prompts.md), issue verification reports and the [UX record](verification/ux.md). Availability alone is not use.

## Application

| Tool | Status | Purpose |
| --- | --- | --- |
| Python / FastAPI / Pydantic / Uvicorn | Used | Local API, validation, static dashboard serving and one-process launcher |
| SQLite / Python `sqlite3` | Used | WAL database, dataset isolation, evaluations, incidents, durable deliveries and retention; no hosted database or ORM |
| Python standard library | Used | `http.client` loopback/TLS requests, asyncio tasks, locks, clocks, file handling and generated ICO favicon |
| React / TypeScript / Vite | Used | Dashboard, typed components and compiled local assets |
| CSS / inline SVG / native HTML controls | Used | Responsive console, charts, flat selects, moon/sun icons and light/dark semantic tokens |
| Browser localStorage / matchMedia | Used | Only a light/dark preference under `log-watchdog-theme`; system default, local persistence and cross-tab synchronization. No credential storage |
| CSS `@starting-style` / media queries | Used | 140ms opacity entry enhancement and reduced-motion support; theme color transition is 120ms. No motion library |
| Fetch / FileReader | Used | Local API calls and bounded JSON upload |
| Gemini REST API | Configured and tested with controlled responses | Optional fixed-host evidence analysis, memory-only key override plus environment fallback; no live provider call verified |

The installed stack versions were recorded during implementation (Python 3.14.5, FastAPI 0.141.1, Pydantic 2.13.5, React 19, Vite 6.4.3). Reproducible dependency versions belong to `requirements-dev.lock` and `frontend/package-lock.json`; these observations are not upgrade recommendations.

## Development and verification

| Tool | Status | Purpose |
| --- | --- | --- |
| OpenAI Codex / Codex CLI | Used | Architecture discussion, code/docs generation, autonomous implementation and review sessions; CLI 0.155.1 was verified during runner setup |
| AFK Codex runner from `junaidk14/tools` | Used | Fresh implementation → PR → independent read-only review → fixes/re-review → merge for all seven issues; generic flow unchanged, project policy adapted |
| Git / Git worktrees / GitHub / GitHub CLI / jq | Used | Version control, isolated policy edits, issue labels/blockers, PR metadata and gated publication |
| zsh / Bash / ripgrep | Used | Local commands, runner shell and fast source inspection |
| Node.js / npm / uv / pip | Used | Frontend and Python environment/dependency management; setup instructions in the README |
| pytest / HTTPX / FastAPI TestClient | Used | Backend, validation, persistence, race/restart and controlled-provider tests |
| Vitest / jsdom / Testing Library / axe-core | Used | UI interactions, accessibility rules, history/focus, uploads, key setup and theme regressions |
| Ruff / mypy / TypeScript / ESLint / Prettier | Used | Lint, types and formatting |
| `scripts/check_contrast.py` | Used | Text/control/focus ratios for both palettes; not a rendered accessibility audit |
| `scripts/validate_runtime.py` | Used | Temporary-database real loopback HTTP, restart, lifecycle, 100k-event/20-events-per-second exercises |
| Playwriter CLI / local headless Chrome | Used | Rendered desktop/narrow inspection, keyboard/Back/Forward, Demo pointer/keyboard and walkthrough-anchor scroll regression reproduction and verification, including receiver setup and Back/Forward, targeted motion and theme checks, and synthetic presentation screenshots under `docs/screenshots/`; extension mode failed to attach |
| In-app browser runtime | Used for discovery | Initial discovery/recovery found no browser; this historical limitation was later overcome through Playwriter headless mode |
| Chrome DevTools MCP | Not used | Reserved for diagnosis when needed |
| Codex execution/patch, clock, question and collaboration tools | Used | Local edits, timing, clarification and explicitly scoped independent agents |
| Web tool / official provider docs | Used | Architecture, statistical and provider-contract research; no account/key provisioning |
| Hyperframes 0.8.53 / GSAP 3.14.2 / FFmpeg 8.1.2 | Used | Local 18-second launch-video composition, browser checks, encoding, poster frame and user-supplied Gemini screenshot revision; no hosted rendering or publication |
| NumPy / uv isolated tooling cache | Used | Official Hyperframes audio-band extraction for a restrained music-responsive accent; app requirements unchanged |
| Markdown / Mermaid | Used | Product/architecture docs and local AI-generated presentation; documentation index and grouped verification reports; no slide publication |
| Python standard library / ripgrep / Git | Used | Documentation path updates, relative-link and heading-anchor checks, preserved audit-history check, commit/push, GitHub PR merge and branch synchronization verification |
| macOS `open` / Impeccable CLI | Used | Initial local design choices and context/critique/audit/refinement workflows |

No cloud compute, hosted database, cloud storage or deployment resources were provisioned or used for the MVP. GitHub and AI development services are distinct from application infrastructure. The optional external Gemini integration is not described as cloud-free execution if a user elects to send evidence.

## Skills actually applied

| Skill | Use |
| --- | --- |
| `setup-matt-pocock-skills`, `grill-with-docs`, `grilling` | Initial conventions and scope/architecture interview |
| `domain-modeling` | Glossary and accepted architectural decisions |
| `writing-for-agents` | Repository instructions and project-specific AFK policy |
| `to-tickets` | Seven approved ticket drafts, GitHub issues and blocker relationships |
| `openai-docs` | Official Codex runner/CLI configuration guidance |
| `impeccable` | Context, initial design, critique/audit, polish, clarification, hardening and design documentation |
| `diagnosing-bugs` | Reproducible regressions and scoped fixes |
| `code-review`, `pr` | Independent Standards/Spec review and concrete PR descriptions |
| `browser:control-in-app-browser`, `playwriter` | Browser discovery and actual rendered checks |
| `brag`, Hyperframes core/animation/creative/keyframes/CLI domain skills | Launch-video story, real UI composition, validation and local render |
| `emil-design-eng` | Purposeful restrained micro-interactions |
| `triage` | Configured during setup; no triage run recorded |

## Verification workflow

Run relevant automated checks before after-change browser validation. Small copy/CSS changes get targeted Playwriter checks only for their changed screen/flow, navigation, focus, responsiveness or interactions. Whole-app browser checks belong to broad changes such as theming or final pre-merge validation, not every minor edit.

Temporary port-8001 fixtures disable background delivery to avoid posting into a user app on port 8000. They do not establish HTTP retry success. Live retry validation uses the documented port-8000 runtime harness. Browser-mocked Gemini responses never establish provider access; no user key is recorded in tools or artifacts.
