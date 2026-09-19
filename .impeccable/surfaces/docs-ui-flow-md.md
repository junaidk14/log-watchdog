---
version: 1
slug: "docs-ui-flow-md"
primary_target: "docs/ui-flow.md"
related_targets: []
---

# Log Watchdog console

Mode: Operate. Scope: overview, incident detail, filtered logs, and webhook delivery history. Primary target: `docs/ui-flow.md`, the current behavior specification; bind this brief to the application entry component when implementation establishes its path.

Audience and task: one developer identifies an error-log spike, inspects the evaluated evidence, and verifies local notification attempts. The overview is incident-first. Demo content is synthetic and labeled. Behavior and acceptance cases remain authoritative in `docs/ui-flow.md`; product boundaries remain in `PRODUCT.md`.

## Direction contract

**THESIS:** Incident workbench keeps the selected problem beside its evidence; summary metrics never displace active investigation.

**OWN-WORLD:** Cool neutral workspace, white content surfaces, slate text, workbench-blue selection, compact ruled rows, and restrained status fills. Typography and measurements await implementation.

**STORY:** Identify the active incident, compare error-log rate with its baseline, inspect evaluated logs, then verify delivery attempts. Broader logs require explicit inclusion of later arrivals.

**FIRST VIEWPORT:** A compact navigation rail precedes an incident queue and persistent evidence pane; service trends sit below the queue. Investigate is the row action; View evaluated logs is the pane's primary action.

**FORM:** Incident workbench, grounded candidate 1, user-selected `model-pick`; seed key `599165fc`. Signature interaction: selection updates the pane while preserving queue position and URL context. Motion signals state changes only; focus and reduced-motion behavior follow the UI specification.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Status and unresolved details

This is a pre-implementation seed, not a completed build or visual review. Code-first is recorded in `.impeccable/config.json`. Exact type, semantic colors, spacing, borders, and breakpoints remain unresolved. The critique fixes are documented but not rendered or interaction-tested. A prior concept comp path was only a reserved slot; no approved raster exists.
