## What to build

When environment-based credentials are available, preview a bounded redacted incident evidence packet and explicitly send it for an evidence-linked LLM explanation. The local summary and complete core MVP remain usable without this feature.

## Acceptance criteria

- [ ] Use one lightweight server-side Gemini REST integration configured only through environment variables, with the selected model configurable; verify the chosen default remains available when implementing. Keep credentials out of the browser and source.
- [ ] Preview the exact bounded redacted evidence packet and send only after Send for analysis. Bind the call to that preview so new events are not silently added.
- [ ] Limit unpaid processing to synthetic demo evidence; gate live/imported evidence on appropriate paid-service configuration and clearly explain basic redaction limitations before sending.
- [ ] Render possible causes and suggested next checks as hypotheses with validated evidence references. Treat log text as untrusted data; the LLM never controls detection, alerting, or definitive root-cause claims.
- [ ] Handle missing credentials, timeout, provider errors, rate limits and invalid responses visibly while preserving the local evidence summary and the user's investigation context.
- [ ] Test exact-preview sending, redaction, input/output bounds, reference validation and error handling with controlled responses. Record separately whether a real provider call was verified; lack of credentials does not block core MVP completion.
- [ ] Keep this slice optional and lightweight. If it materially threatens the core MVP time budget, report that tradeoff rather than expanding into provider abstraction, orchestration, chat, or external actions.

## Blocked by

- https://github.com/junaidk14/log-watchdog/issues/3
