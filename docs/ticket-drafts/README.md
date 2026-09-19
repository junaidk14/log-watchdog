# Published MVP tickets

Status: Approved and published to `junaidk14/log-watchdog`. All seven issues carry `ready-for-agent`. Native GitHub blocking relationships and textual blocker references were verified. The original draft numbers match the published issue numbers.

Each slice delivers a working user-visible path through persistence, API, UI, and meaningful tests. There is no implementation to prefactor. Styling and accessibility ship with each slice rather than waiting for a final horizontal UI ticket.

1. [Ingest structured events and browse them locally](01-ingest-and-browse.md). Blocked by: none.

2. [Detect an error-log spike and track incident recovery](02-detect-and-recover.md). Blocked by: 1.

3. [Investigate an incident through evaluated logs and a local summary](03-investigate-evaluated-evidence.md). Blocked by: 2.

4. [Deliver incident webhooks with visible retries and restart recovery](04-deliver-webhooks.md). Blocked by: 2.

5. [Upload historical JSON and explore its trends without alerting](05-upload-historical-json.md). Blocked by: 1.

6. [Expire old data and reset only the demo safely](06-retain-and-reset-safely.md). Blocked by: 3, 4, 5.

7. [Optionally analyze previewed evidence with Gemini](07-optional-evidence-analysis.md) — optional. Blocked by: 3.

Suggested solo order: 1 → 2 → 3 → 4 → 5 → 6; fit 7 after 3 if lightweight. This order is a scheduling suggestion, not additional blocking edges. Tickets 2 and 5 can start after 1; tickets 3 and 4 can start after 2; optional 7 does not block the core MVP.

Publication verified: seven issues, seven ready-for-agent labels, and eight native blocking edges. No parent issue was supplied or modified. Issue #1 is the initial unblocked frontier; optional issue #7 does not gate the core MVP.

Shared completion practice: keep prompt/tooling/decision records current, run checks meaningful to each change, keep each slice runnable, and record actual UI tokens and visual verification as implementation progresses.


## GitHub issues

- [#1](https://github.com/junaidk14/log-watchdog/issues/1) — [local ticket body](01-ingest-and-browse.md)
- [#2](https://github.com/junaidk14/log-watchdog/issues/2) — [local ticket body](02-detect-and-recover.md)
- [#3](https://github.com/junaidk14/log-watchdog/issues/3) — [local ticket body](03-investigate-evaluated-evidence.md)
- [#4](https://github.com/junaidk14/log-watchdog/issues/4) — [local ticket body](04-deliver-webhooks.md)
- [#5](https://github.com/junaidk14/log-watchdog/issues/5) — [local ticket body](05-upload-historical-json.md)
- [#6](https://github.com/junaidk14/log-watchdog/issues/6) — [local ticket body](06-retain-and-reset-safely.md)
- [#7](https://github.com/junaidk14/log-watchdog/issues/7) — [local ticket body](07-optional-evidence-analysis.md)
