# Log Watchdog launch video

18-second polished product film, 1920×1080 at 30fps. No narration. Quiet music and two sparse SFX. Actual synthetic UI crops follow Overview → incident investigation → evaluated evidence → delivery history → optional Gemini analysis. The closing scene uses the user-provided response screenshot; no key is shown.

- `brag.mp4`: final local video, with selected poster baked as frame zero.
- `brag.jpg`: poster asset.
- `brag-plan.md`, `composition-brief.md`: story and implementation direction.
- `composition/`: editable Hyperframes source and local assets.
- `share-copy.txt`: one ready-to-use caption; not published.

Preview: run `HYPERFRAMES_NO_TELEMETRY=1 npm run dev` in `composition/`. Check: `HYPERFRAMES_NO_TELEMETRY=1 npm run check`. Render: `HYPERFRAMES_NO_TELEMETRY=1 npm run render -- --output ../brag.mp4 --quality delivery --fps 30`.

Source UI: `../docs/screenshots/`, captured from safe synthetic data. Delivery shows the recorded single-attempt HTTP 200 opening notification, not a 503→200 success sequence. Gemini is optional; its response is a user-provided capture, not a new provider call made for this video. Screenshot cuts illustrate navigation; this is an edited product film, not a continuous live screen recording.

Audio: bundled Happy Beats / Business Moves vol-12 by ende.app from the installed brag skill; Kenney CC0 click_003 and bong_001. GSAP and Hyperframes are used only for the video. Rendering runs locally with FFmpeg/Chrome. No cloud render, external publishing or feedback submission. Official guidance: https://github.com/heygen-com/hyperframes.

See `verification.md` for render evidence and the bundled music license confirmation needed before public distribution.

The updated presentation Deliveries capture is intentionally separate from the video: the video retains its original opening-notification/HTTP-200 source. Gemini response text is preserved as supplied; its “0.4 errors per window” wording is imprecise (the evidence rate is 0.4, or 40%). Hypotheses require verification.
