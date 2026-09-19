## What to build

Opening and recovering incidents send actual HTTP requests to a built-in local receiver. Users inspect payloads and attempts, watch a controlled failure retry successfully, and understand an exhausted delivery.

## Acceptance criteria

- [ ] Persist one opening notification and one recovery notification atomically with their incident transitions; repeated abnormal updates do not create repeated notifications.
- [ ] Restrict destination to the built-in local receiver. Perform actual HTTP outside database transactions, using a stable delivery ID so retried requests can be recognized.
- [ ] Allow three total attempts with default retry delays of 2 and 5 seconds, bounded request timeouts, and persisted pending/scheduled/success/exhausted states plus attempt history. Resume pending work after restart without duplicating transition records.
- [ ] Provide receiver behaviors for success, fail-first-then-succeed, and always-fail. Clearly label these as demo controls, separate from actual attempt outcomes.
- [ ] The Deliveries destination and incident links show notification kind, payload, destination, attempt number, UTC time, status/network error, duration, and next retry when applicable.
- [ ] Display delivery times and retries as real time even in Demo; advancing the simulation does not accelerate retry schedules.
- [ ] At exhaustion show the configured attempts used and that no more retries are scheduled, the final error, and the supported receiver/fresh-demo path. No unsupported resend control is presented. Keep incident recovery independent from notification delivery success.
- [ ] HTTP integration and restart tests verify controlled retry, exhaustion, pending-work recovery and duplicate recognition. Verify accessible attempt expansion, incident return context and non-disruptive status updates in the UI.

## Blocked by

- https://github.com/junaidk14/log-watchdog/issues/2
