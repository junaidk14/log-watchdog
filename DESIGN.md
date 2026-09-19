---
name: Log Watchdog
description: A lightweight SRE operations console built around evidence-led investigation.
colors:
  accent: "#246b87"
  ink: "#202c36"
  muted: "#526371"
  ground: "#f4f6f7"
  surface: "#ffffff"
  rule: "#cbd4d9"
  selected: "#e7f1f5"
  focus: "#125777"
  error: "#932a32"
  error-bg: "#fff0f0"
  warning: "#805000"
  warning-bg: "#fff3d6"
  control-border: "#8395a1"
  pressed: "#d0e4ec"
  disabled-bg: "#edf0f2"
  disabled-ink: "#64737e"
  accent-hover: "#195773"
  placeholder: "#60717c"
  text-selection: "#c7e2ed"
  text-selection-ink: "#142c39"
  row-rule: "#e0e6e9"
  severity-ink: "#344957"
  severity-bg: "#eaf0f3"
  severity-error-bg: "#fbe6e7"
  detail-bg: "#f0f6f8"
  error-border: "#e5b5b8"
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    lineHeight: 1.5
  headline:
    fontSize: "28px"
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontSize: "20px"
  brand:
    fontSize: "18px"
    fontWeight: 750
  label:
    fontSize: "13px"
    fontWeight: 600
  data:
    fontSize: "13px"
  hint:
    fontSize: "12px"
  severity:
    fontSize: "11px"
    fontWeight: 700
  metadata:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
rounded:
  control: "4px"
  badge: "3px"
spacing:
  tight: "6px"
  small: "8px"
  compact: "12px"
  standard: "16px"
  panel: "20px"
  section: "24px"
  workspace: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  navigation-current:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  severity-neutral:
    backgroundColor: "{colors.severity-bg}"
    textColor: "{colors.severity-ink}"
    rounded: "{rounded.badge}"
    padding: "3px 5px"
  explorer:
    backgroundColor: "{colors.surface}"
---

# Design System: Log Watchdog

## Overview

**Creative North Star: "Incident workbench"**

A precise, restrained operations workspace. Compact rows, clear labels, and stable context support repeated scanning and investigation. Cool neutral work surfaces, restrained status fills, and visible rules preserve the selected Incident workbench direction.

Data and readable controls carry the interface. Context-preserving inspection is the reusable signature: expanded log evidence stays beside its originating row. The current implementation uses immediate state changes without animation or decorative imagery.

**Key Characteristics:**

- Cool neutral surfaces and workbench-blue actions.
- Compact ruled rows with explicit severity labels.
- Inline evidence, UTC labels, and visible dataset context.

This refresh captures issue #1's implemented **Logs-only** surface from `frontend/src/styles.css` and `frontend/src/App.tsx`. The future overview → incident → evaluated logs → delivery history flow remains specified in `docs/ui-flow.md` and its surface brief; incident queues, baseline trends, delivery views, and later-arrival controls are not implemented here. No comp or raster assets ship with this slice.

Verification boundary: the implementation session reports 14 frontend tests, including axe DOM checks, plus passing build and lint. The independent finish source review reports both context-navigation findings resolved. Browser discovery failed (`getForUrl`; recovery `list` returned `[]`), so the policy-authorized source/DOM fallback applies. No screenshots, rendered desktop/narrow-layout checks, or real-browser keyboard/focus checks were completed. Browser-dependent loading, empty, error, and changed-interaction checks remain pending. These results are inherited session evidence; this documentation pass ran no builds or tests.

## Colors

The palette uses a single workbench-blue action accent with cool neutral grounds and restrained semantic fills. The frontmatter records the exact implemented values, including recurring state literals that are not CSS custom properties.

### Primary

**Workbench blue** (`accent`) identifies primary actions and links. `accent-hover` deepens primary hover; `focus` supplies the visible keyboard outline. `selected` supports navigation and secondary-button hover, while `pressed` is the general button press fill.

### Neutral

**Cool ground** (`ground`) backs the workspace, table headings, and loading bars. **Panel white** (`surface`) holds results and controls. **Slate ink** (`ink`) carries primary text, while `muted` carries labels and supporting context. `rule`, `row-rule`, and `control-border` distinguish region, row, and input boundaries. `detail-bg` connects expanded rows to evidence. Disabled and placeholder colors are separate from normal text.

### Semantic states

Warning severity uses `warning` with `warning-bg`. ERROR and FATAL use `error` with `severity-error-bg`; error notices use `error-bg` and `error-border`. DEBUG and INFO use `severity-ink` with `severity-bg`. There is no implemented success or recovered-state color. Text selection uses `text-selection` and `text-selection-ink`.

**The Explicit Status Rule.** Severity color always accompanies a readable severity label.

## Typography

**Body and heading font:** the system sans-serif stack in the frontmatter. **Metadata font:** the dedicated monospace stack. No downloaded font or separate display family is used. Body size and heading weight retain browser defaults; they are not fixed application tokens.

The hierarchy is compact: headline for the page, title for empty states, brand for workspace identity, label/data for controls and rows, hint for secondary instructions, and severity for uppercase source values. Brand weight is 750; navigation is 650; buttons and form labels are 600. Root line-height is 1.5 except the explicit headline override. Timestamps and result counts use tabular numerals. Empty-state supporting text is bounded to 65ch. Metadata retains whitespace and wraps long content.

## Layout

The desktop workspace grid is `188px minmax(0, 1fr)` with `min-height: 100dvh`. The rail has 30px vertical and 20px horizontal padding; main content uses the workspace spacing token. The header separates title and a 164px dataset selector. The explorer is one bordered results region with filters, result count, table, and pagination.

Filters use four equal columns with a standard gap and panel padding; message search and actions each span two columns. Table cells have compact padding. Timestamp, severity, service, and detail-action columns are respectively 195px, 100px, 135px, and 104px; message uses the remaining width. Row messages clamp to two lines. Expanded detail uses a `170px minmax(0, 1fr)` definition list with a compact gap and small padding.

At `max-width: 1100px`, main padding becomes section spacing, filters use two columns, and the table receives a 760px minimum width inside a horizontal scroll region. At `max-width: 700px`, the rail becomes a horizontal header, secondary rail text hides, the page header stacks, dataset selection fills its width, and filters become one column. Main padding becomes 24px 16px. Input/select text becomes 16px; button minimum height increases from 38px to 44px. Input/select minimum height remains 38px. These are source-defined responsive rules; rendered fit and overflow remain unverified.

## Elevation & Depth

No shadows, gradients, overlays, or animated elevation are defined. White panels, cool ground, fine borders, and tinted detail rows establish grouping. No CSS transitions or animations are present; state changes are immediate, with no animation requiring reduced-motion overrides.

## Shapes

Controls and current navigation use the control radius; severity badges use the smaller badge radius. The explorer and error notice retain square corners. Borders are 1px solid. Focus uses a 3px solid focus-color outline with a 3px offset; the scroll region moves that outline inward with a -3px offset. There is no icon system in this slice.

## Components

### Buttons

Compact, explicit text actions. Primary applies filters; secondary supports clear, refresh, retry, expansion, and paging. Shared padding and colors are in frontmatter; all use weight 600 and a 38px minimum height before the narrow breakpoint. Secondary hover uses selected fill and accent border; press uses the pressed fill. Primary hover uses the deeper accent, which also wins during hover-plus-press under the current CSS cascade. Disabled controls use disabled fill/text, rule border, and the default cursor. Global visible focus applies.

### Inputs / Fields

Native labeled text inputs and selects use full available width, the control border, and the frontmatter padding/radius. Labels sit above fields with a tight gap. Placeholder and caret colors are explicit. Shared validation appears in the error notice; no field-specific invalid-border or disabled-input variant is implemented.

### Navigation

The rail exposes only Logs, with current-page semantics, weight 650, selected fill, and accent text. Its URL retains the applied dataset, filters, and page. The brand link intentionally opens Demo. Narrow navigation moves into the horizontal header. No distinct navigation-hover treatment is defined; visible focus uses the shared outline.

### Chips

Severity badges are noninteractive labels, with neutral, warning, and error/fatal variants. Padding and shape are recorded in frontmatter. Do not imply that these are selectable filters.

### Cards / Containers

The explorer uses a white, square-cornered, ruled container without a shadow. Internal regions own their padding: filters use panel spacing, toolbar 12px 20px, and pagination 16px 20px. It is not a grid of decorative summary cards.

### Log evidence and feedback

Inline expansion reveals the full message, event ID, real ingestion timestamp, and formatted metadata. Buttons expose expansion semantics. A refresh preserves expansion; changing query or dataset clears it. Back/Forward restores the applied URL context and requests scroll restoration after results or errors arrive. Pagination requests heading focus. The focusable results region contains horizontal scrolling and uses busy semantics during refresh. These behaviors have source/DOM evidence, not real-browser verification.

Loading uses three static 42px bars with 12px gaps inside a region with 220px minimum height, plus a live status label. Empty results provide explanatory text and a clear-filters action. Errors use a readable alert with Retry; a failed refresh retains previous results and shows their fetch time. A skip link becomes visible on focus at 12px from the top/left, with white background and 12px padding.

## Do's and Don'ts

### Do:

- Do preserve selected context during a refresh and keep dataset identity visible.
- Do pair severity color with its readable label.
- Do keep long evidence readable through wrapping, expansion, and contained table scrolling.

### Don't:

- Don't let decorative treatment compete with investigation evidence.
- Don't present future incident screens as implemented components.
- Don't treat source or DOM checks as rendered layout or real-browser keyboard verification.
