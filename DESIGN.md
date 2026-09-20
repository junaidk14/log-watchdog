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

A precise, restrained operations workspace. Compact ruled rows, clear labels, and stable context support repeated scanning and investigation. Cool neutral surfaces and workbench-blue actions preserve the approved direction. The signature is context-preserving evidence: selected incidents stay beside their queue on desktop; log inspection returns to its originating investigation.

**Key Characteristics:**

- Cool neutral surfaces and workbench-blue actions.
- Compact ruled rows with explicit severity labels.
- Inline evidence, UTC labels, and visible dataset context.

This document describes the completed MVP and final code-first refinement. Sources are `frontend/src/styles.css`, `Overview.tsx`, `EvidencePane.tsx`, `App.tsx`, `Deliveries.tsx`, `Historical.tsx`, and `AnalysisPane.tsx`. No raster assets, external fonts, or chart library are used. Source and DOM checks do not establish rendered fit: desktop, narrow-screen, zoom, and real-browser keyboard verification remain pending. See `docs/final-validation.md` for verification evidence.

## Colors

### Primary

Workbench blue identifies actions and links; the deeper accent marks primary hover. Focus uses the high-contrast focus token. Selected fill connects the current destination or incident to its content.

### Neutral

Cool ground backs the workspace and table headings; panel white contains evidence. Slate ink carries primary text, muted ink supporting context. Fine rules divide regions without shadows. Detail fill connects expanded log rows to their source.

### Semantic states

Warning and error colors accompany readable severity or state text. Abnormal error-log-rate observations use hollow circles and an error-colored value; volume never receives an anomaly marker. Recovered and healthy-looking normal data do not introduce unsupported overall-health claims or a green success palette.

**The Explicit Status Rule.** Color supplements readable state; it never establishes health or carries meaning alone.

## Typography

System sans-serif carries interface text; monospace is reserved for metadata and payloads. Frontmatter records the implemented hierarchy. Page headings use the headline role, section headings the title role, and evidence subheadings use 16px. Tabular numerals align counts, rates, timestamps, and chart readings. Supporting empty-state text is bounded to 65ch; empty-overview guidance to 70ch. Long services, messages, IDs and payloads wrap rather than widen the workspace.

## Layout

Desktop uses a 188px navigation rail and a flexible main region with 32px padding. Main padding becomes 24px at 1100px and 24px 16px at 700px. The narrow rail wraps navigation links. Headers separate page identity from a 164px dataset selector, which fills the narrow width.

The incident workbench uses `minmax(260px, 2fr) minmax(0, 3fr)` columns. Queue and pane each have 20px padding and a fine divider. With no incidents and no selected URL, a single compact guidance region replaces empty table headings and the unusable selection pane. Invalid selected URLs retain their recovery path. Below 900px, selection displays the pane with Back to incidents; otherwise the queue is shown.

Filters use four columns, two below 1100px and one below 700px. Results scroll within named focusable regions; log/trend tables retain their deliberate minimum widths. Evidence and delivery definition lists stack on narrow screens. Controls, inputs, selects and disclosures have a 44px narrow minimum height. Checkboxes retain their native compact control and surrounding label.

Service trends follow the investigation with 24px separation; each ruled service region starts 16px below the prior region. Paired charts use two columns and a 24px gap, stacking below 700px. Chart margins are 12px. Empty log states use 28px vertical and 20px horizontal padding with left-aligned explanation/actions. Retention guidance follows the workflow rather than competing above the incident queue.

## Elevation & Depth

Flat ruled regions and restrained fills establish grouping. No shadows, gradients, decorative imagery, entrances, or chart animation are used. Immediate feedback is appropriate for this operations console: button labels, disabled states, timestamps, and polite status announcements communicate work without motion. Reduced-motion users therefore receive the same complete information.

## Shapes

Controls and navigation retain the small control radius; severity badges use the smaller badge radius. Evidence regions are square-cornered. Keyboard focus uses a 2px solid focus-color outline with a 2px offset; scroll regions use an inset -3px offset. Programmatically focused headings fit their content, remain bounded by the container and have a 2px corner radius. Focus restoration behavior is unchanged.

## Components

### Controls and navigation

Explicit text actions and native inputs retain existing hover, press, disabled and focus states. Primary styling excludes disabled controls so pending actions remain visibly disabled. Document titles follow the active destination, and the Incidents skip/refresh/loading labels refer to Incidents while stable internal focus IDs preserve restoration. Navigation exposes Overview, Incidents, Logs, and Deliveries as appropriate to dataset and context. Current destinations and selected incidents have semantics as well as fill. URL state preserves dataset, incident, evaluation, filters and Demo run. Browser Back restoration includes initial-load failures and fallback heading focus.

### Workbench and evidence

Overview presents recent incident rows and latest evaluated service trends; its unselected queue fills the content width. Incidents omits service trends and prioritizes a queue/evidence grid with a one-third/two-thirds desktop split. The queue presents service, Open/Recovered state, latest abnormal-window observed versus expected error-log rate, that measurement’s UTC window, and a separately labeled full incident interval. Selection focuses the pane heading. The pane retains latest abnormal measurement and recovery progress; evaluated-window selection chooses the evidence beneath it. Refresh preserves selection and announces transitions without stealing focus. Insufficient traffic never advances recovery.

A single recorded window uses a compact, wrapping observed/baseline/threshold comparison rather than a full time-series frame. The evaluated-log action precedes notifications, repeated error patterns, local evidence summary and representative sample. Optional Gemini analysis follows the core evidence. Basic evidence remains usable without credentials. Error, stale-run, unavailable, loading and retained-results states offer their existing recovery actions.

### Trends

Multi-window charts use a responsive `540 × 180` SVG. Error-log rate retains a fixed 0–100% scale with a 50% reference; volume scales to its maximum with a midpoint tick. Subtle dashed horizontal guides support reading. Latest values are text outside the SVG. Baseline and threshold marks, labeled legend, hollow abnormal rate markers, and exact-value tables preserve meaning without relying on color. Missing rate observations break the line. Historical charts keep their own equal-bucket labels and exact UTC values; they have no detector baseline.

### Logs, deliveries and imports

Logs expand inline to full messages, identifiers, ingestion times and metadata. Evaluated scope is explicit; including later arrivals does not alter the recorded measurement. Clear refinements preserves incident scope; leaving it is a distinct action. Loading, empty and failed-refresh states preserve context.

Delivery history exposes payloads, attempts and real-time retry state. Exhaustion explains the bounded ending and Demo reset/configure/advance path. Logs exposes an explicit Import JSON into Historical link as well as the Dataset selector. Switching to Historical immediately reveals its import form. Historical uploads have native labeled file input, bounded validation, atomic failure feedback, and a browse-results path. Reset uses a Demo-only confirmation and restores context with a new run identity.

### External analysis

Gemini setup is an inline disclosure with a password input, session-key save and clear actions, and configured/not-configured state. It never displays a saved key. Configuration remains secondary to the evidence path. Preview is distinct from send. The exact bounded redacted packet appears in a scrollable region before the explicit Send for analysis action. Provider errors retain the preview and local summary; output remains plain text with validated internal evidence links. No chat surface or external actions are present.

## Do's and Don'ts

### Do:

- Do preserve selected context during refresh and keep dataset identity visible.
- Do pair severity color with its readable label.
- Do keep long evidence readable through wrapping, expansion and contained scrolling.

### Don't:

- Don't let decorative treatment compete with investigation evidence.
- Don't imply volume is anomalous or absent traffic proves health.
- Don't treat source or DOM checks as rendered layout or real-browser keyboard verification.
