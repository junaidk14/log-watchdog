# Optional Gemini evidence analysis

Incident investigation and the **Local evidence summary** work without credentials. To enable optional analysis, set `GEMINI_API_KEY` in the server environment and restart. Never place it in frontend configuration, source, or a URL. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`; set it to another available text model ID if your account requires it. No provider SDK or new runtime dependency is needed.

The default path permits only verified simulator/seed evidence. Demo is also a writable ingestion dataset, so its name and `metadata.synthetic` do not establish trust. Publicly ingested events and rows created before this feature are unverified. Reset Demo through its existing confirmation to generate a new trusted scenario; this removes only Demo data. Core ingestion, deduplication and detection are unchanged.

For Live or unverified Demo evidence, configure a key linked to a project with active billing and appropriate Gemini paid-service processing, then explicitly set `GEMINI_PAID_SERVICE=true` and restart. This is an operator declaration, not automatic billing verification. Consult the provider terms and your account before enabling it. Historical imports remain outside incident detection and have no analysis endpoint, so they cannot reach this integration.

## User path

1. Open Demo Overview, advance once, and Investigate checkout.
2. Below the local summary, choose **Preview evidence for analysis**. This makes no external call. Missing credentials or an unpaid privacy restriction appears inline.
3. Read the exact evidence packet and disclosure. It contains a redacted service name, fixed evaluated counts/rates/window, and at most five evaluated messages with synthetic reference IDs. Metadata and original event IDs are omitted. Common credential assignments, authorization strings, emails and URLs receive basic redaction before messages are capped at 800 characters. Arbitrary text can still contain secrets; review every value.
4. Choose **Send for analysis** to disclose that packet to Google. No later events or refreshed measurements are added. Gemini receives that exact string plus fixed system instructions and a structured output schema, not the rest of your investigation.
5. Review the generated summary, possible causes and next checks as hypotheses. Each claim links only to validated supplied evidence. Links preserve dataset, incident, window and Demo run. Model text is rendered as plain text, without executable markup, external links or actions. References establish membership, not truth or proof of causation.

Previews last ten minutes and are capped at 32 per process (oldest evicted first); restarting discards them. Packet size is limited to 16,000 UTF-8 bytes. Expired, reset or unavailable evidence requires a new preview. Changing the selected window, incident or dataset removes the old UI analysis. A failed provider request keeps the preview and the local summary; **Send for analysis** explicitly retries that same packet and may incur another provider request. A successful repeat returns the cached result. No background retries occur.

There is one active analysis request at a time, outside SQLite transactions, to the fixed TLS host `generativelanguage.googleapis.com`, with a 20-second socket timeout, no proxies or redirects, maximum 2,048 output tokens and 32,768 response bytes. Incomplete/blocked responses, malformed output, excessive claims/text and unknown references are rejected. Rate limits, timeouts and other provider errors have separate explanations without echoing provider response bodies or credentials. Navigating away or resetting cannot recall a packet already sent; stale results are discarded/rejected.

## API

- `POST /api/datasets/{demo|live}/incidents/{id}/analysis/preview` accepts `{ "evaluation": <id>, "run": "<Demo UUID>" }`. Demo requires a run; Live can omit it. Returns an opaque preview ID, exact packet string, provider/model and local reference map. No external call occurs.
- `POST /api/analysis/send` accepts only `{ "preview_id": "<UUID>", "confirm_send": true }`. Arbitrary packets, model changes and paid overrides are rejected.

## Provider evidence and verification boundary

The default model is listed in the [official model catalog](https://ai.google.dev/gemini-api/docs/models), checked 2026-09-20 UTC. The adapter follows [generateContent REST documentation](https://ai.google.dev/api/generate-content). The privacy gate follows the distinction described in [Gemini API terms](https://ai.google.dev/gemini-api/terms). Catalog availability does not prove a particular account's access, billing status or quota.

Controlled-response tests verify request content, headers, endpoint, bounds, errors and reference validation. **No live Gemini call was made**; real account access and provider output quality remain unverified. No real user logs were transmitted for testing. See [issue #7 verification](verification-issue-7.md) for executed commands and deferred browser checks.
