# Log Watchdog investigation UI

Status: Incident workbench selected, code-first. All five specification gaps from the first critique are addressed below, including the user-confirmed evaluated-evidence default. Implementation and rendered verification remain pending.

## Navigation and context

Four primary destinations: Overview, Incidents, Logs, Deliveries. Keep the active dataset visible on every view, with an explicit Demo / Live / Historical label. The simulation clock and advance control appear only in Demo.

Preserve dataset, service, and time range when moving from an incident into logs or deliveries. Represent shareable filters in the URL. Provide a visible return link to the originating incident; browser Back restores prior filters and scroll position.

### Persistent workbench

On desktop, selecting Investigate in the queue updates the adjacent incident detail pane and records the selected incident in the URL. Keep the queue visible; highlight the selected row independently from keyboard focus. A direct incident URL opens the same selection. With no selection, the pane says "Select an incident to inspect its evidence"; do not silently select a new incident during refresh.

Queue refresh preserves the selected incident, scroll position, and detail focus. If that incident recovers, retain its detail and show its updated state, even if an Open-only queue filter hides its row; explain "Selected incident recovered" and offer View recovered incidents. If evidence is unavailable because of retention or demo reset, explain the cause instead of selecting another incident.

Logs and Deliveries are full investigation destinations reached from the pane with incident context in their URLs. Back to incident restores the workbench selection. On narrow screens, selecting an incident opens full-width detail with a visible Back to incidents link; the same URL and context rules apply.

## Overview

Lead with active incidents, affected service, observed error-log rate, expected baseline, and last evaluated time. Give each incident one clear action: Investigate. Place recent error-log trends and service state immediately after actionable incidents, with volume labeled separately.

When no incidents are open, show "No active incidents" rather than a universal health claim. Keep learning-baseline services visible so lack of evidence cannot look healthy. Show the latest evaluation time; distinguish stale results from current results.

Demo controls: simulation time, Advance one minute, scenario phase, and Reset demo. Explain that resetting affects demo data only and confirm the destructive action inline before execution. Do not hide whether the current chart represents simulated time.

### Freshness and the two clocks

Label demo event/chart timestamps "Simulation time (UTC)" and live event timestamps "Event time (UTC)". Label delivery attempts and retry timing "Real time (UTC)" even in Demo. Place "Retries use real time; advancing the simulation does not accelerate them" beside the demo delivery status.

Show both the last evaluated window and the last successful dashboard refresh. If refreshing fails, retain the last values with "Updates unavailable — showing results fetched at …" and a Retry refresh action; do not clear the queue or claim current health. A paused simulation says "Simulation paused" rather than appearing stale. For live data, flag evaluation as delayed when an eligible completed window remains unevaluated past the configured grace period plus one evaluation interval; describe the affected window and keep the last result visible.

## Incident

Start with service, incident state, time window, and the observed-versus-expected error-log rate comparison. Use a chart with an explicit percent axis, baseline/threshold legend, and abnormal-interval marking that remains meaningful without color.

Below the measurement, show:

- Repeated error patterns with counts and direct links into filtered logs.
- Representative supporting logs with IDs and UTC timestamps.
- A local evidence summary labeled as non-LLM analysis.
- Opening/recovery delivery status and a link to all attempts.

The primary investigation action is View evaluated logs. AI analysis is secondary and never required to continue. Recovered incidents retain their evidence and explain when recovery was observed.

Show the error count, total count, and error-log rate for the selected evaluated window, plus its baseline and threshold. Use the same percentage precision and units in the queue, chart, and detail. Label representative excerpts "Sample of evaluated logs" with sample size; never imply that a few excerpts constitute the complete denominator.

While an incident remains open, show recovery evidence separately from the lifecycle state: "Recovery: 2 of 3 eligible normal windows" or "Still abnormal — recovery not established." Insufficient traffic never increments recovery progress or marks the incident recovered; explain "Waiting for sufficient traffic to assess recovery." A missing/ineligible interval breaks the consecutive eligible-window run, so reset the displayed streak and wait for three consecutive eligible normal windows. A new abnormal eligible window also resets the streak. Thresholds and progress reflect the configured detector, not hard-coded UI values.

## Filtered logs

Use a table with UTC timestamp, severity, service, and message. Keep full event ID and metadata in an expandable detail region rather than making every row excessively wide. Severity is always written as text; color is supplementary.

Show active dataset, service, severity, time, and message filters as editable controls, with a clear reset action. Incident-driven filters identify their originating incident. Avoid silently broadening filters when navigating.

### Evaluated evidence first

Incident log links open in **Evaluated evidence** scope by default. This scope contains events included in the recorded evaluation for the selected incident interval; it excludes late arrivals that were not evaluated. Carry the incident ID, evaluated interval, and evidence scope in the URL. Pin this context above the query controls, separate from service/severity/message refinements.

Offer an explicit **Include later arrivals** control to switch to **All matching logs** for the same service and interval. Mark added rows "Arrived after evaluation — excluded from incident counts." Keep the recorded evaluated counts visible with "Incident measurements are unchanged." Switching back restores evaluated-only scope and retains compatible filters. Broader manual time ranges leave incident-evidence scope only through an explicit scope change.

For a selected evaluated window, show "N evaluated events · M matching current filters" so an ERROR filter or message search does not appear to contradict the all-severity denominator. Page through the full eligible evidence; representative samples on the incident page are not the entire result set. Clear query filters preserves the dataset and incident-evidence scope; a separate Leave incident scope action returns to general log exploration.

Support loading, malformed filter, no matching logs, and unavailable-data states. A no-results view offers Clear filters without implying ingestion failure. Keep pagination and total matching count visible. User-controlled expansion reveals full messages without hover-only access.

When retained evaluation metadata outlives searchable logs, say "Evidence no longer available under the retention policy" and keep recorded measurements distinguishable from current search results. A demo reset instead says "This demo run was reset" with a return link to the current demo.

## Webhook delivery history

List notification kind (opened or recovered), incident, created time, delivery state, and attempt count. Selecting a delivery exposes its exact payload and chronological attempts with attempt number, UTC time, HTTP status or network error, duration, and next retry time where applicable.

Separate receiver demonstration settings from delivery results. Label the controlled first-attempt failure as a demo behavior so it is not mistaken for an operational incident. The destination is the built-in local receiver; there is no editable arbitrary URL field.

At exhaustion, show "3 of 3 attempts used; no further retries scheduled" using the configured maximum, along with the final error and a View attempts action. Offer a link to the demo receiver behavior and explain that a fresh demo run can exercise a different outcome. Reset retains its demo-only destructive confirmation. Do not show a resend button: manual resend is outside the current MVP.

Keep incident state and notification state separate, for example "Incident recovered · Recovery notification exhausted." An exhausted notification neither reopens an incident nor erases its recovery evidence.

## State vocabulary

| Entity | States | Presentation rule |
| --- | --- | --- |
| Log event | DEBUG, INFO, WARNING, ERROR, FATAL | Explicit severity text; never inferred from incident state. |
| Detector | Learning baseline, no spike detected, spike detected, insufficient current traffic | State describes evaluated evidence, not overall platform health. |
| Incident | Open, recovered | Open is actionable; recovered preserves history. Do not invent severity rankings from an uncalibrated heuristic. |
| Delivery | Pending, retry scheduled, delivered, exhausted | Show attempts separately; one failed attempt is not an exhausted delivery. |
| Analysis | Local summary, preview ready, sending, completed, failed, unavailable | Local summary remains accessible during every external-analysis state. |

Use text plus shape/icon or placement for status; never color alone. Reserve destructive styling for actual destructive actions and failure styling for evidence-backed failure states.

## External analysis

Preview the actual redacted evidence in an inline section with provider, disclosure boundaries, and redaction limits. Only an explicit Send for analysis action transmits it. Freeze that preview's evidence for the send. Render generated summaries as hypotheses with working evidence links; a failed request offers retry and preserves the local summary.

Without credentials, explain configuration availability without suggesting that the investigation is incomplete. Synthetic demo evidence is the unpaid-provider path; live/imported evidence follows the configured paid-service requirement in ADR-021.

## Layout and accessibility behavior

Desktop is the primary working layout. At narrow widths, collapse navigation, stack investigation regions in task order, and allow tables to scroll within labeled regions rather than making the page overflow. Preserve service, time, severity, and the primary action before secondary metadata.

Use semantic landmarks, labeled controls, visible keyboard focus, logical tab order, table headers, and text equivalents for charts. Keep status changes announced without stealing focus. Respect reduced motion. Loading states preserve layout, and errors offer an actionable recovery path.

### Keyboard and focus contract

- Each queue row has a named Investigate link, operable with the keyboard; clicking blank row space is not the only entry. Mark the current link with `aria-current` and a visible Selected label. Use a semantic table rather than claiming interactive-grid semantics without implementing their full keyboard behavior.
- Activating Investigate moves focus to the detail heading (programmatically focusable) and updates the URL. Returning to the queue restores focus to that incident's link. If it is no longer visible, focus the queue heading and explain why rather than moving focus to a different incident.
- Logs and delivery links focus the destination heading. Back to incident restores the initiating action in the pane when available, otherwise its heading. Browser Back restores view and filter context without auto-selecting another incident.
- Log-detail expansion uses a button with `aria-expanded` and `aria-controls`. Keep focus on the button while expanding/collapsing; never require hovering to inspect a full message.
- Background updates preserve focus and selection. Announce significant state transitions once through a polite status region, not every incoming log, refresh, or countdown tick. Use actionable inline errors for failed user actions.
- Make overflowing table regions keyboard-scrollable and labeled. Keep visible focus inside the scroll region and at 200% zoom. Chart text equivalents expose evaluated counts, rate, baseline, and threshold without requiring pointer hover.

## UI acceptance walkthrough

1. Identify the active demo incident from the overview without inspecting every service.
2. Open it and explain the observed increase using the baseline comparison and repeated timeout evidence.
3. Open matching logs with incident filters intact, inspect metadata, and return without losing context.
4. Open delivery history and distinguish the deliberate initial failure from eventual delivery success.
5. Advance to recovery and see the incident and notification state update without navigation being reset.
6. Complete the same investigation without an external LLM call.

### Critique follow-up acceptance cases

7. Select incident A, refresh the queue, and open/return from logs: A remains selected and the originating focus/filters are restored. Repeat at a narrow viewport.
8. Ingest a late event into an already evaluated interval. Evaluated evidence and recorded counts remain unchanged; Include later arrivals reveals the additional marked row. Query filters show matching counts separately from evaluated totals.
9. Observe recovery progress, introduce insufficient traffic, and confirm it does not imply recovery or preserve a false consecutive streak. Show stale live evaluation and paused demo time as different conditions.
10. Advance simulation time while a webhook retry waits; its real-time schedule remains unchanged and clearly labeled.
11. Exhaust all delivery attempts and identify the final error, absence of further retries, and supported next action. A recovered incident remains recovered independently.
12. Complete overview → incident → evaluated logs → delivery history using only the keyboard. Expand a log, follow Back, and receive a status update without focus loss or repeated announcements.

Visual tokens, composition, and component details will be documented from the selected implemented direction rather than treated as already approved.
