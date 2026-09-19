## What to build

Keep the local application manageable through seven-day retention and a demo-only reset, while preserving active investigation evidence, pending deliveries, and user-imported/live data.

## Acceptance criteria

- [ ] Apply the seven-day horizon to routine logs and completed investigations while preserving open incidents, their supporting evaluated evidence, and pending delivery work; exceptions are visible in documentation and are not described as a hard storage cap.
- [ ] Delete related records consistently so incident summaries and delivery history never silently reference the wrong data. Expired evidence is distinguished from a zero-match search.
- [ ] Reset demo has a clear demo-only confirmation, clears/reseeds demo state and normal history, and leaves live/imported events, evaluations, incidents, and deliveries untouched.
- [ ] Serialize reset with demo evaluation and pending delivery handling so old run work cannot attach to the new run. A stale demo URL explains that the run was reset and links to the current demo.
- [ ] Retained evidence and pending deliveries remain inspectable through the UI after cleanup and restart. A reset returns the demo to a reproducible initial state with a visible confirmation.
- [ ] Integration tests exercise retention with open/recovered incidents, protected evidence and pending deliveries, plus reset during queued work. Verify a clean-start walkthrough from spike through retry and recovery and preserve measured performance limitations in run documentation.

## Blocked by

- https://github.com/junaidk14/log-watchdog/issues/3
- https://github.com/junaidk14/log-watchdog/issues/4
- https://github.com/junaidk14/log-watchdog/issues/5
