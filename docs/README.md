# Documentation

Start with the [project README](../README.md) to run the app and follow the Demo. This index separates current product references from historical implementation evidence; files keep their existing locations.

## Product and implementation

| Document | Purpose |
| --- | --- |
| [Product](../PRODUCT.md) | Audience, scope and constraints |
| [MVP specification](mvp-spec.md) | Implemented capabilities and acceptance criteria |
| [UI flow](ui-flow.md) | Page responsibilities, Demo walkthrough and investigation navigation |
| [Design](../DESIGN.md) | Layout, controls, light/dark palettes and motion |
| [Glossary](../CONTEXT.md) | Domain terms |
| [Detection](detection.md) | Error-log-rate formula, configuration, clocks and evidence |
| [Deliveries](deliveries.md) | Local HTTP, retry/restart behavior and receiver scenarios |
| [Analysis](analysis.md) | Gemini setup, preview/consent, privacy and limits |
| [Lifecycle](lifecycle.md) | Retention, protected evidence and Demo reset |
| [Decisions](adr/decisions.md) | Accepted architecture and superseded choices |

Historical JSON ingestion, schema, API examples and exact upload limits are in the [README](../README.md#import-historical-json).

## Validation and handoff

- [Current validation summary](final-validation.md): latest check scope, earlier full runtime evidence and remaining limitations.
- [Rendered UX checks](verification-ux.md): dated browser, polish, walkthrough, motion and theme passes.
- [Presentation handoff](presentation-handoff.md): concise project facts, screenshot manifest and final-deck confirmation items.
- [Presentation](presentation.md): AI-generated Markdown deck; local artifact, not externally submitted.
- [Tooling](tooling.md): consolidated inventory and infrastructure boundary.
- [Prompt audit](../prompts.md): preserved chronological user prompts and execution notes.

## Historical implementation evidence

These are snapshots of their original work, not current test counts or pending-task lists:

- Issue verification: [1](verification-issue-1.md), [2](verification-issue-2.md), [3](verification-issue-3.md), [4](verification-issue-4.md), [5](verification-issue-5.md), [6](verification-issue-6.md), [7](verification-issue-7.md).
- [Bounded cleanup verification](verification-cleanup.md).
- [Original ticket drafts and GitHub issue index](ticket-drafts/README.md).

## Agent workflow

[Repository instructions](../AGENTS.md) · [Domain documentation rules](agents/domain.md) · [Issue tracker](agents/issue-tracker.md) · [Triage labels](agents/triage-labels.md) · [AFK runner](../afk-Codex/README.md) · [Project execution policy](../afk-Codex/project-policy.md).

No cloud compute, hosted database, cloud storage or deployment resources were provisioned for this MVP. GitHub and AI development tools were used; optional Gemini is an external service whose live provider path has not been verified. See the [validation boundary](final-validation.md#limitations).
