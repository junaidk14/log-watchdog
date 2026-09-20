# Bounded product/UI cleanup

Base: merged PR #15, `23118c6fa89e0ee75ff55c29e08067e5d5a91b39`. Scope: the user's eight findings after manually browsing the app. No application architecture, detector, evidence boundary, navigation state model or focus-restoration algorithm was changed.

## Findings and fixes

1. **Overview/Incidents duplication confirmed in source.** Overview retains recent incidents and current service trends, with an unselected queue spanning the width. Incidents omits service trends and gives two-thirds of the desktop workbench to investigation/evidence. Narrow queue/pane behavior remains unchanged.
2. **Measurement ambiguity confirmed.** Rows now say Latest abnormal window, label the precise measurement interval, and separately label Incident interval. The retained abnormal measurement remains legitimate after recovery; it is not presented as current service behavior.
3. **Missing upload not reproduced in source or DOM.** Selecting Historical already invokes navigation immediately and renders the native file chooser and Import into Historical button. Added Import JSON into Historical above Logs context so the action is discoverable without exploring the selector. Regression covers both paths. Rendered discoverability remains unverified in this environment.
4. **Environment-only Gemini setup replaced as requested.** Inline setup submits a password value to a fixed backend endpoint, empties the input immediately, and shows only configured state. Backend memory holds the override; Clear key restores environment fallback. No persistence/new service. Configuration mutation requires same-origin custom-header JSON requests with bounded sanitized validation. Previews are invalidated on change; provider sends remain explicit. Key changes are rejected during an active send. Model and paid processing remain environment-controlled.
5. **Static title confirmed.** Each destination sets Overview/Incidents/Logs/Deliveries · Log Watchdog through a shared title hook; generic startup title remains until React mounts. Navigation and browser Back update it.
6. **Overview-specific incident copy confirmed.** Skip, refresh, loading and refresh-error text now use the destination. Stable internal IDs remain unchanged for focus restoration. Reset errors use page-neutral wording.
7. **Ambiguous current status confirmed.** Service status is labeled Latest evaluated window, with UTC bounds and explicit notice that earlier spikes remain in chart history. Incident state and abnormal-window measurements remain separate.
8. **Missing favicon confirmed.** Added an original small ICO, linked in HTML and served at /favicon.ico. API regression verifies HTTP 200, ICO signature and content type.

## Verification

- Frontend: 86 tests in seven files passed, including pre-existing investigation/Back/failure/focus cases, Historic selector/import link, destination labels/titles and synthetic key setup/clear/error tests.
- Production build, TypeScript, ESLint, Prettier, Ruff lint/format, mypy and static text/focus contrast passed.
- Targeted analysis/API suite: 70 passed. New tests verify runtime override, environment fallback, clear/restart, preview invalidation, no key in status/response/SQLite/log capture, malformed/oversized/cross-origin requests and in-flight protection.
- The initial full backend run passed 126 tests but four real-HTTP fixtures could not bind because another app occupied port 8000. The user stopped that app; the full rerun passed **132 tests** after the review regressions. Actual HTTP/runtime validation also passed with temporary databases: session-key save/status/clear with environment fallback, favicon signature/HTTP 200, assets, 100k events, paced ingestion, evaluated/late evidence, delivery/process restart, incident recovery, Historical upload and Demo reset/isolation. No checks were skipped or weakened.
- Browser setup: `getForUrl` reported no browser; documented recovery `list()` returned `[]`. No screenshots or real-browser interaction checks occurred. DOM checks establish reachable controls and behavior, not rendered layout/overflow or real keyboard behavior.
- No real Gemini key, live provider request, external submission or deployment used. Existing jsdom canvas and Starlette/AnyIO warnings remain visible.

## Manual checks still pending

Use Overview → Incidents → investigate → evaluated logs → browser Back; compare recovered measurements with the latest service window. Switch Logs to Historical and use the direct import link. Open Gemini setup, save/clear a key, preview, and explicitly send only after reviewing the packet. Check desktop/narrow layout, keyboard focus, headings and browser titles. Verify the favicon request is 200. Manual browser and live-provider checks remain distinct from automated evidence.


## Review-driven corrections and final check evidence

The initial independent Standards review identified a preview-construction/key-change race. A configuration revision now rejects any preview whose construction overlaps a save/clear; deterministic tests cover replacement and environment-fallback clearing. The initial Spec review identified that direct Investigate selection bypasses Router search updates; a shared destination-owned title hook fixes it without changing navigation or focus restoration. The existing primary investigation regression now asserts the Incidents title on that exact path.

Final code checks: 86 frontend tests, 132 backend tests, production build, TypeScript, ESLint, Prettier, Ruff lint/format, mypy, static contrast and the actual-HTTP runtime script all passed. Full fresh read-only re-reviews use the complete cleanup diff, not only these two fixes. No rendered-browser or live-Gemini success is claimed.

Logs are preserved at `/private/tmp/log-watchdog-cleanup-frontend-final.log`, `/private/tmp/log-watchdog-cleanup-backend-reviewed.log`, and `/private/tmp/log-watchdog-cleanup-runtime-reviewed.log`. The runtime script cleans up its own temporary database/server and leaves user data untouched.
