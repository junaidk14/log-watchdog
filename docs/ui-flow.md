# Investigation flow

Implemented flow: **Overview → Investigate → Incidents → evaluated Logs → delivery history → optional Gemini**. For startup and exact APIs, use the [README](../README.md). [Design](../DESIGN.md) owns visual tokens; [validation](final-validation.md) owns check status.

## Shared shell

The left navigation exposes Overview, Incidents, Logs and Deliveries as appropriate to the selected dataset. Historical has browsing/trends, not incidents. Headers show the destination, dataset and moon/sun theme toggle. Theme defaults to system preference until selected; the choice persists locally. Dataset and investigation context remain in URLs. Tab titles, skip links and refresh/loading labels match the destination.

## Overview and Demo walkthrough

Overview summarizes recent incidents and current service trends; it never mounts the full investigation pane. Investigate opens Incidents with the chosen incident selected. “Latest window: No spike” describes only that evaluated minute; earlier spikes remain in the chart. Learning or insufficient traffic must not imply health.

Only Demo Overview shows **Try the Demo**:

1. Follow Reset Demo to the existing button and confirm the Demo-only reset.
2. Follow the Deliveries link, choose receiver behavior, and save.
3. Return to Overview and advance one minute to create the checkout timeout incident.
4. Follow the incident queue link, Investigate, then View delivery history.

The guide links to existing controls; it does not run actions. Reset restores receiver Success, so configure the receiver afterward. Demo advances use simulation time; HTTP attempts/retries use real time. The fifth advance recovers the default scenario. See [delivery walkthrough](deliveries.md#walk-through-retry-and-recovery).

## Incidents

Desktop shows a compact queue beside the selected evidence pane. Rows prioritize service, Open/Recovered state and last-spike error-log rate. On narrow screens the selected pane replaces the queue, with Back to incidents. There is no Open-only queue filter, assignment or acknowledgment workflow.

The pane shows recovery progress, then actions for evaluated logs, delivery history and a jump to Gemini. The selected evaluated window shows exact counts, observed rate, expected baseline and threshold. **Incident timeline and baseline** holds lifecycle detail separately. A recovered incident's last abnormal rate may remain 40% while its latest service trend is 0%; those refer to different windows.

Repeated error patterns link to filtered logs. The local evidence summary is explicitly non-AI; optional Gemini follows it, before the representative sample links. Selection/window remain pinned through refresh and recovery. Missing evidence and stale Demo runs produce explanations and recovery links rather than silently selecting a different incident.

## Logs and Historical

General Logs offers dataset-scoped service choices alongside exact-name text input, severity, inclusive UTC time bounds and message filters. Apply commits the draft filters to the URL. Tables paginate, scroll within a named region and expand messages/metadata by button.

Incident links open **evaluated evidence** using the recorded half-open window and watermark. Service/time stay locked. **Include later arrivals** broadens that same interval and marks additions excluded from incident counts. Recorded totals and matching filtered counts stay separate. Clear filters preserves scope; **Leave incident scope** returns to general browsing. Sample links pin event IDs.

**Import JSON into Historical** and the Historical dataset selector both reveal the file chooser and Import into Historical action. The compact helper states 5,000 events / 5 MB; format/retry guidance explains atomic validation and supplied-ID deduplication. Browse file interval applies the imported file's time bounds. Historical trends follow service/time filters; severity/message affect log results only. Imports do not create alerts or train baselines.

## Deliveries

History lists incident state separately from notification state. Expand a delivery to inspect frozen payload, destination, receiver behavior and chronological attempts. Pending, retry scheduled, delivered and exhausted outcomes remain distinct. Exhaustion shows the final error and no more retries; there is no resend action.

Demo receiver settings sit beside history on wide screens and below it on narrow screens. The linked reminder reads: “Reset Demo, choose a receiver behavior, then advance one minute from Overview.” Settings affect only new Demo notifications; existing retries retain their captured behavior. See [delivery semantics](deliveries.md).

## Gemini

Gemini setup accepts a password-field key into server memory, shows configured/not configured, links to AI Studio and offers Clear key. No key is returned or stored in browser storage. Clear restores an environment-key fallback. Saving does not validate provider access or send evidence.

Preview builds the exact bounded redacted packet locally; only **Send for analysis** transmits it. Unpaid processing requires verified synthetic evidence. Old unverified Demo logs offer the existing reset path with a deletion explanation. Local summary/investigation remain usable without credentials or after provider failure. Generated claims are hypotheses with evidence links. [Privacy and limits](analysis.md).

## Focus and feedback

- Queue rows are a semantic list with named Investigate links. Selection focuses the detail heading; return restores the originating link or a visible heading fallback.
- Logs/delivery navigation and browser Back/Forward preserve filters, selected window, focus and scroll. Failed loads retain an accessible fallback.
- Disclosure buttons retain focus and expose expanded/controls semantics. Background refreshes preserve selection/focus; meaningful changes use polite status announcements.
- Native selects retain keyboard behavior. Tables have labeled, focusable scroll regions and charts have numeric text alternatives.
- Loading/error/retry states stay actionable. Recent content remains visible after a refresh failure, with its timestamp.
- Brief opacity entry on Gemini content and delivery details does not delay interaction. Reduced-motion disables transitions; visible keyboard focus suppresses disclosure motion. Theme switching uses only a short color transition.
