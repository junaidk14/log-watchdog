# Optional Gemini evidence analysis

Incident investigation and the **Local evidence summary** work without credentials. In an incident, open **Optional Gemini analysis → Gemini setup** to enter a key in the password field, then choose **Use key for this session**. The input clears as the request begins. A same-origin JSON request sends it to the backend; only `configured: true/false` comes back, never a key or partial key. Saving only changes configuration: it neither checks provider access nor sends evidence.

The application holds that key only in server memory until **Clear key** or server shutdown. It is not written to SQLite, files, browser storage, logs, prompt records or telemetry. The browser necessarily holds the typed value while entering/submitting it, and the backend uses it in Gemini's authentication header only on an explicitly authorized send. No key retrieval API exists. Clear removes the UI-supplied override; an existing `GEMINI_API_KEY` environment value remains the fallback, so status can remain Configured. Restart loses the override.

`GEMINI_MODEL` (default `gemini-3.5-flash-lite`) and `GEMINI_PAID_SERVICE` remain server environment settings. No provider SDK or secrets-management system is added. Key changes are rejected while an analysis request is sending; wait for completion and retry. Saving or clearing a key invalidates stored previews and visible analysis, requiring a fresh preview and a new explicit Send action. Other open tabs learn about an invalidated preview when they try to send and can refresh key status.


The default path permits only verified simulator/seed evidence. Demo is also a writable ingestion dataset, so its name and `metadata.synthetic` do not establish trust. Publicly ingested events and rows created before this feature are unverified. Reset Demo through its existing confirmation to generate a new trusted scenario; this removes only Demo data. Core ingestion, deduplication and detection are unchanged.

For Live or unverified Demo evidence, configure a key linked to a project with active billing and appropriate Gemini paid-service processing, then explicitly set `GEMINI_PAID_SERVICE=true` and restart. This is an operator declaration, not automatic billing verification. Consult the provider terms and your account before enabling it. Historical imports remain outside incident detection and have no analysis endpoint, so they cannot reach this integration.

## User path

1. Open Demo Overview, advance once, and Investigate checkout.
2. Use the Gemini action to jump below the local summary (before sample logs), then choose **Preview evidence for analysis**. This makes no external call. Missing credentials or an unpaid privacy restriction appears inline.
3. Read the exact evidence packet and disclosure. It contains a redacted service name, fixed evaluated counts/rates/window, and at most five evaluated messages with synthetic reference IDs. Metadata and original event IDs are omitted. Common credential assignments, authorization strings, emails and URLs receive basic redaction before messages are capped at 800 characters. Arbitrary text can still contain secrets; review every value.
4. Choose **Send for analysis** to disclose that packet to Google. No later events or refreshed measurements are added. Gemini receives that exact string plus fixed system instructions and a structured output schema, not the rest of your investigation.
5. Review the generated summary, possible causes and next checks as hypotheses. Each claim links only to validated supplied evidence. Links preserve dataset, incident, window and Demo run. Model text is rendered as plain text, without executable markup, external links or actions. References establish membership, not truth or proof of causation.

Previews last ten minutes and are capped at 32 per process (oldest evicted first); restarting discards them. Packet size is limited to 16,000 UTF-8 bytes. Expired, reset or unavailable evidence requires a new preview. Changing the selected window, incident or dataset removes the old UI analysis. A failed provider request keeps the preview and the local summary; **Send for analysis** explicitly retries that same packet and may incur another provider request. A successful repeat returns the cached result. No background retries occur.

There is one active analysis request at a time, outside SQLite transactions, to the fixed TLS host `generativelanguage.googleapis.com`, with a 20-second socket timeout, no proxies or redirects, maximum 2,048 output tokens and 32,768 response bytes. Incomplete/blocked responses, malformed output, excessive claims/text and unknown references are rejected. Rate limits, timeouts and other provider errors have separate explanations without echoing provider response bodies or credentials. Navigating away or resetting cannot recall a packet already sent; stale results are discarded/rejected.

## API

- `GET /api/analysis/key` returns only `{ "configured": true|false }` with `Cache-Control: no-store`.
- `PUT /api/analysis/key` accepts only `{ "key": "..." }`; `DELETE /api/analysis/key` clears the session override. Both require the dashboard's `X-Log-Watchdog-Settings: 1` header and reject cross-origin requests. PUT requires JSON, limits the body to 4 KiB and accepts an opaque 1–2,048-character visible-ASCII key (including dotted authorization keys), rejecting whitespace/control characters without echoing invalid input. Responses contain only configured state; errors use fixed, credential-free text. Neither endpoint contacts Gemini.

- `POST /api/datasets/{demo|live}/incidents/{id}/analysis/preview` accepts `{ "evaluation": <id>, "run": "<Demo UUID>" }`. Demo requires a run; Live can omit it. Returns an opaque preview ID, exact packet string, provider/model and local reference map. No external call occurs.
- `POST /api/analysis/send` accepts only `{ "preview_id": "<UUID>", "confirm_send": true }`. Arbitrary packets, model changes and paid overrides are rejected.

## Provider evidence and verification boundary

The default model is listed in the [official model catalog](https://ai.google.dev/gemini-api/docs/models), checked 2026-09-20 UTC. The adapter follows [generateContent REST documentation](https://ai.google.dev/api/generate-content). The privacy gate follows the distinction described in [Gemini API terms](https://ai.google.dev/gemini-api/terms). Catalog availability does not prove a particular account's access, billing status or quota.

Controlled-response tests verify request content, headers, endpoint, bounds, errors and reference validation. **No live Gemini call was made**; real account access and provider output quality remain unverified. No real user logs were transmitted for testing. See [issue #7 verification](verification-issue-7.md) for the original report and [current validation](final-validation.md) for later rendered setup/preview checks and their limits.


Successful save/clear invalidates prior preview/result/errors. Successful status refresh clears stale setup/analysis errors; preview/send stays disabled while setup is pending. Key-shape and stale-error regressions are recorded in [UX verification](verification-ux.md).

## Older Demo evidence and configured keys

A configured key does not override evidence privacy eligibility. Older Demo events migrated without trusted synthetic provenance remain unverified; they are never relabeled automatically. The preview privacy message now distinguishes this from a key error and offers **Open Demo reset**, which navigates to the existing confirmation flow. Reset removes only Demo data. After confirming reset and advancing one minute, the new incident has trusted simulator provenance and can be previewed with a configured key. Live or unverified evidence still requires the existing paid-service configuration. No provider request occurs until **Send for analysis** is explicitly clicked.
