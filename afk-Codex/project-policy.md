# Log Watchdog execution policy

This is the project-specific supplement to the unchanged implementation and review policies from `junaidk14/tools`. It supplies scope, context, and verification expectations; it does not replace their session protocol, read-only boundary, Git protections, JSON result formats, or runner-owned merge gate. Implementers and fix agents must never merge; every review remains a fresh read-only assessment of the whole current PR.

## Read before issue work

Read `AGENTS.md`, `PRODUCT.md`, `CONTEXT.md`, `docs/mvp-spec.md`, `docs/adr/decisions.md`, `docs/ui-flow.md`, and `DESIGN.md`. Read `.impeccable/surfaces/docs-ui-flow-md.md` for console work, plus `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` for tracker conventions. Then read the assigned issue and its comments in full. Use implementation/configuration files and the README when they exist; this repository initially contains only planning documents.

The seven published issues are the approved implementation scope. Earlier planning references to a pending design/build confirmation do not require repeating that interview when executing an approved ready issue. Launching the runner is separate from configuring it.

## Eligibility and scope

- Target only `junaidk14/log-watchdog`, default branch `main`, approved issues #1–#7. A later issue needs explicit scope authorization before this policy is widened.
- Require an open issue with `ready-for-agent`. The label is necessary, not sufficient: a `blocked` label, open PR, open native blocker, unresolved textual prerequisite, or unreadable dependency excludes it.
- Follow the generic policy's complete paginated enumeration of ready issues and open PRs. Fetch native dependencies with `gh api --paginate repos/junaidk14/log-watchdog/issues/<number>/dependencies/blocked_by`; resolve every returned blocker and every textual reference to its current state. API/auth failures mean BLOCKED, not an empty backlog.
- Expected approved graph: #2←#1; #3←#2; #4←#2; #5←#1; #6←#3,#4,#5; #7←#3. This records the approved graph, not a substitute for querying GitHub. If live relationships contradict these approved prerequisites, stop with the discrepancy rather than silently changing edges or selecting blocked work.
- Choose the lowest-numbered executable issue and handle exactly that slice. Recheck its label, blocker state, and existing PR associations immediately before starting and before reporting PR READY. Include the checked prerequisites in the PR evidence. Agents do not remove labels or blockers to make work eligible.
- #7 is optional and never a blocker for core issues. Keep it a single lightweight integration; absent credentials do not block local functionality or require invented live-call claims. If implementing it exceeds its stated scope or budget, report the limitation instead of broadening it.
- FIX mode addresses only supplied review findings and necessary supporting changes on the same issue/branch/PR. Never implement another ticket as a convenient adjacent change.

## Product and design boundaries

Use Python/FastAPI, SQLite, and a lightweight React frontend served locally by FastAPI, with one worker and background evaluation/delivery. Keep the application loopback-only, single-user, and credential-free for its complete core flow. Do not add hosting, login, platform connectors, arbitrary text parsing, extra detectors, incident assignment/escalation, external webhook destinations, queues, or distributed infrastructure.

Preserve the ADRs: per-service statistical error-log-rate detection, configurable one-minute evaluation, explicit learning/insufficient-traffic states, stable evaluated evidence, grouped incidents, eligible-window recovery, dataset isolation, and the distinction between simulation and real time. Historical uploads do not train live baselines or trigger alerts. Pending delivery state survives restart; reset affects only demo data. Retention protects active evidence and pending work.

For UI work, use the already selected incident-first Incident workbench and code-first workflow. Preserve overview → incident → evaluated logs → delivery history, persistent selection, explicit inclusion of later arrivals, local summaries, keyboard/focus behavior, and the acceptance cases in the UI flow. The design seed is approved direction, not proof of implemented tokens. Resolve ordinary missing tokens during the scoped implementation and document the actual result. Do not reopen the visual-world selection or run unrelated design workshops. Apply only relevant available skill steps; report genuine verification blockers without silently claiming visual review.

External LLM analysis remains optional, environment-configured, explicit preview-and-send, evidence-linked, and independent from alert decisions. Follow the selected provider's documented configuration boundaries; do not transmit real user logs for testing without the specified consent. Use synthetic fixtures for development and record whether any live call was actually verified.

## Verification for implementation and fix sessions

Each ticket is a runnable vertical slice, not a backend-only or UI-only placeholder. Implement and verify its current acceptance criteria without demanding capabilities assigned to later tickets. Use real local HTTP for the webhook slice, actual persistence for restart claims, and deterministic data/clock fixtures for detector tests.

Issue #1 establishes the application packaging, startup instructions, repeatable test commands, frontend scripts, and appropriate runtime/build ignores as part of its existing bootstrap scope. Discover and use the resulting commands in later sessions; do not report nonexistent commands as passing. Prefer the smallest standard setup that satisfies the issue, rather than adding unrelated frameworks or CI infrastructure.

For every changed behavior:

1. Run relevant backend tests and configured lint/type checks; run the frontend build and relevant frontend tests when frontend code changes. If no command exists yet, the owning bootstrap work must define and document it. Missing required verification is BLOCKED.
2. Exercise the issue's full user path. UI evidence covers desktop and narrow layouts, keyboard navigation, loading/empty/error states, and the newly implemented interaction. Record real screenshots or browser evidence when available; source inspection is not a visual pass. Required checks that cannot run remain explicit blockers.
3. Use meaningful failure tests: malformed input/deduplication/isolation for ingestion; sparse/zero-error history, late arrivals and recovery for detection; retry/exhaustion/restart for delivery; privacy boundaries for analysis; protected evidence/reset races for retention. Test only the behaviors owned or affected by the current issue.
4. Record exact commands, completed results, and the relevant environment or dataset in the PR. Treat 100k events and about 20 events/second as measured validation targets, not promised performance. Identify mocked versus actual provider/network evidence.

A read-only reviewer inspects these tests and recorded evidence, traces each acceptance criterion, and flags missing proof. It must not install tools, start artifact-writing test runs, capture files, update design/audit documents, or repair code. No review is waived because the implementation session already performed a design review.

## Audit and result protocol

- IMPLEMENT/FIX sessions that make issue changes append their triggering assignment, issue reference, mode, and timestamp to root `prompts.md` before committing. This file is the user's project audit, distinct from protected runner task prompts and external session logs. Never include credentials. Update `docs/tooling.md` when introducing tooling and `docs/adr/decisions.md` only for newly made material decisions.
- REVIEW and no-work sessions write no repository files, including audit/tooling/design docs. Their exact effective prompts and results are already captured by the runner outside the checkout. Provide the audit text in the JSON `summary` when a repository audit write is prohibited; do not break the read-only or clean-main contract.
- Preserve the runner's exact JSON result shape, with no Markdown or extra text. Put `Elapsed Time: HH:MM:SS` in the existing `summary` string, measured from `2026-09-19T19:42:03Z`; do not append a separate footer to machine-readable output.
- The original target is 4–6 hours and maximum window 16 hours, including pauses. If the maximum window has elapsed, report BLOCKED with the time limitation before starting further implementation/fix work; do not silently extend the budget or misreport no executable issues. Read-only review can still report the actual state.
- Root project audit maintenance is the sole prompt-document exception. Issue agents must not change `afk-Codex/`, runner configuration/logs, this execution policy, or the AGENTS routing to it. They may not weaken verification/eligibility requirements to pass a review.
