# Validation and limitations

Updated 20 September 2026 after PR #16 merged. Application baseline: `9860072` on `main`. Counts below identify each verification pass; merging did not rerun every suite.

## Current state

All seven MVP issues completed the implementation → independent review → fix/re-review → merge gates (PRs #8–#14). PR #15 merged at `23118c6`. [PR #16](https://github.com/junaidk14/log-watchdog/pull/16) then merged `cleanup-main-flows` into `main` at `9860072` on 20 September 2026, including the investigation/UI cleanup, Gemini setup fixes, themes, Demo navigation fixes, documentation and media assets. Local `main` was verified clean and synchronized with `origin/main` immediately after that merge. No AFK runner was active at handoff. GitHub publication was authorized; no application deployment or external project submission was performed.

## Verification ledger

| Scope | Recorded result | Evidence |
| --- | --- | --- |
| Final frontend / Demo navigation (`bffef30`, included in PR #16) | 103 tests in 8 files; build/TypeScript, ESLint, Prettier passed | `/tmp/watchdog-wrap-tests.log`; [UX record](verification/ux.md) |
| Light/dark palette | 23 text/control/focus pairs per theme pass their 4.5:1 text or 3:1 control/focus thresholds | `scripts/check_contrast.py`; source ratios, not WCAG certification |
| Latest backend changes | 78 API/analysis tests passed after key-shape and service-choice fixes; Ruff lint/format, mypy passed | `/tmp/watchdog-readability-backend.log`; [UX record](verification/ux.md) |
| Latest full backend/runtime pass | 132 backend tests and real-HTTP runtime validator passed at rendered UX cleanup, before the later key/filter additions | `/tmp/watchdog-rendered-ux-backend.log`, `/tmp/watchdog-rendered-ux-runtime.log` |
| Original handoff | 121 backend / 81 frontend tests plus full runtime passed before PR #15 | Historical logs under `/private/tmp/log-watchdog-final-checks/` |

The last application changes were frontend Demo focus/history fixes. The 103-test pass covered that final frontend code before merge; subsequent pre-merge commits updated audit/tooling documentation only. No fresh full backend/runtime pass or post-merge full-suite run is claimed. Known test-environment diagnostics include jsdom canvas support and Starlette/AnyIO deprecations; no checks were disabled. Temporary logs/screenshots may disappear when the OS cleans `/tmp`; the committed descriptions preserve their scope and outcome.

## Rendered browser evidence

Playwriter local headless Chrome became available after initial in-app browser discovery failed. Earlier “browser unavailable” reports remain accurate for those original runs, but are no longer the current validation status.

Recorded rendered checks cover desktop/narrow Overview, selected Incidents, evaluated Logs, Historical upload, Deliveries and Gemini setup; keyboard selection and expansion; Back/Forward restoration; Demo controls; synthetic key save/preview/clear; and a prior actual local HTTP 200 delivery. Later targeted passes covered old-Demo privacy guidance, fresh-synthetic preview, compact copy/layout, the four-step Demo walkthrough and reduced-motion micro-interactions. Theme validation adds system preference, persistence, accessible switching and both palettes on main pages at 1440px/390px. The final targeted pass checked all four Try the Demo links at 1534×895 and 390×895: mouse activation avoids native hash jumps, keyboard activation focuses the target, receiver setup is visible, and Back/Forward restores its origin and saved position. Reset/Advance viewport preservation and Investigate/evaluated-Logs focus restoration were checked in the preceding pass. Details and scope boundaries are in [the dated UX record](verification/ux.md).

Later port-8001 fixtures disable delivery workers so they cannot post into the user's port-8000 app. Their pending notifications establish UI creation/navigation, not a new real-HTTP retry test. Gemini response animation was verified with a browser-intercepted mock. The later user-supplied Gemini response screenshot is separate evidence, not an independently rerun provider test.

## Runtime and scale evidence

The full runtime script uses a temporary database and real loopback HTTP. Recorded checks include:

- Served dashboard/assets/favicon; persistence and dataset isolation across restart.
- 40 evaluated events versus 41 broader events after a late arrival; pinned filters/sample evidence.
- Open → continued spike → recovery 1/3 → 2/3 → recovered.
- HTTP 503 → process restart → HTTP 200 with the same delivery ID; separate opening/recovery notifications.
- Demo reset/stale-run rejection, Historical import/restart, and an actual real-clock worker window.

Original handoff measurements on Python 3.14.5/macOS arm64: 100,000 events ingested in 1.500s; browsing medians 3.14ms first page, 5.10ms page 2000, 9.31ms filtered; 100 paced events in 4.960s with 4.86ms median ingestion. These dated synthetic measurements are not production guarantees or measurements of the latest revision.

## Review history

PRs #8–#14 received independent reviews and fixes for timestamp overflow, recovery eligibility, navigation/focus, upload validation, stale Demo runs and malformed provider responses. The repo-wide Standards and Spec reviews at `a74989466e8fd2b4e50982fc59a794bd6b834b93` (baseline `b63023517099daacb05f1e606a3d3ccdb287ffbc`) both passed with zero findings before PR #15. The bounded cleanup's separate review findings and fixes are in [its report](verification/cleanup.md). Those reviews do not automatically cover later user-directed refinements. PR #16 was merged at the user’s request with GitHub reporting a clean, mergeable head; its status-check list was empty. It did not receive a fresh independent whole-branch review, and local checks should not be described as GitHub CI results.

Generic AFK runner files were preserved. Logs remain under `/private/tmp/log-watchdog-afk-logs/`; [ticket index](ticket-drafts/README.md) links the original scope.

## Limitations

- Local single-user MVP, one process on loopback port 8000; no authentication, arbitrary webhook destinations, hosting or external connectors.
- No cloud compute, hosted database, cloud storage or deployment resources were provisioned or used for the application. GitHub and AI coding tools were used during development. Optional Gemini is an external API. The user supplied an application screenshot showing a Gemini response; automated validation did not independently verify that provider call, account quota or output quality.
- Browser evidence is headless Chrome, not physical mobile devices, every browser engine, a complete screen-reader/zoom audit or accessibility certification. Opened native select menus retain platform styling.
- Statistical detection is a heuristic, not a probability of failure. Retention exceptions are not a hard storage cap. Basic redaction cannot guarantee removal of secrets.
- Exact evidence timestamps remain verbose at narrow widths (previously recorded P3). Later user reports exposed Demo focus/anchor defects missed by earlier checks; those were reproduced, fixed and verified in the final targeted pass. This evidence does not establish that the whole app is defect-free.

Run current checks using [README verification commands](../README.md#verify). Full backend HTTP tests/runtime require port 8000 exclusively; do not silently stop a separately launched user app.

## Presentation assets

The [presentation handoff](presentation-handoff.md#screenshot-manifest) lists seven current screenshots: the original six Playwriter capture slots plus the supplied Gemini response. Original captures used a 1600×1200 desktop viewport and isolated synthetic Demo/Historical data. The user subsequently replaced `deliveries.png` with a recovered-notification capture and added `gemini-response.png`; these retain their supplied dimensions. No real key is visible. The captures do not establish a fresh retry or provider verification run.

The [launch video](../brag-output/README.md) is 18 seconds, 1920×1080 at 30fps. Its fifth scene shows the supplied Gemini response; its Deliveries scene retains the original notification/HTTP-200 capture. The revised render passed Hyperframes checks with zero errors and 90/90 text contrast checks; six reviewed structural advisories remain. The encoded closing frame was visually inspected. See [video verification](../brag-output/verification.md).

The supplied response’s “0.4 errors per window” wording is imprecise: the evidence shows an error-log rate of 0.4 (40%). Generated hypotheses remain unverified. Confirm bundled music redistribution terms before further public distribution. Media creation used local rendering and made no new Gemini request.
