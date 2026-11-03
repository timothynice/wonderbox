# Runtime feature re-audit

Date: November 1, 2026. Target: current working tree at `http://127.0.0.1:5173`, API port 3001. Separate Playwright CLI session `runtime-audit-h` used fresh browser storage; no user browser persistence was changed. Authored changes below used the real validated JSON import control. Runtime observations used the read-only `window.__wonderbox` API; positions and transitions were not injected into the simulation.

## Original starter world

**PASS: complete unmodified Moonlight Garden.** Keyboard movement and held jumps collected all three stars, activated the checkpoint, took enemy damage, crossed the exit step, and reached `won: true`. Final player `(2981.11, 564)`, health 2, checkpoint `checkpoint`. Authored revision remained **0**, Pip remained `(100, 564)`, and `floatSeconds` remained **0**. All authored enemies and stars were still present.

Observed grounded positions: first star `(485.78, 464)`, second star `(1211.65, 464)`, third star `(2381.78, 382)`. This is fresh browser completion and mechanical reachability evidence. It is not an unassisted human playtest or an enjoyment assessment.

## Isolated mechanics

These checks deliberately imported diagnostic fixtures. They are **not** live AI outputs and do not replace the original-world completion above.

| Feature | Current browser evidence | Result |
| --- | --- | --- |
| Float ability | `float-fixture.json`, float duration 1.0: keyboard jump reached the original optional ledge, player `(333.78, 264)`, grounded on its y320 top. | Pass |
| Pick-up | `throw-fixture.json`: E held plant at `(142, 554)` alongside player `(100, 564)`. | Pass |
| Throw / transformation | Second E produced projectile impact and `transformed: true` on enemy `(320, 580)`; projectile subsequently settled at y580 rather than freezing in air. | Pass |
| Bouncing platform | Released jump before landing on transformed enemy; launch detected with upward velocity exceeding 650; keyboard steering landed player `(553.11, 294)` on the diagnostic side perch. | Pass |
| Portable light / enemy retreat | `light-fixture.json`: carried lantern `(717.03, 554)`, player x675.03; light-sensitive enemy moved from x862.54 to x925.42, beyond its ordinary x840 patrol boundary. | Pass |
| Horizontal platform rider | `platform-fixture.json`: grounded player moved from x875.12 to x833.04 with the platform; relative x offset remained exactly `3.671087211390045` over 700 ms. | Pass |
| Vertical platform rider | Explicit vertical variant imported through the same UI: platform y479.32 → y447.90 and rider y423.32 → y391.90. Rider remained grounded with exact y offset −56 over 700 ms. | Pass |
| Pause / edit transition | Escape changed mode to edit. Moving platform x829.366141224007 remained identical across 500 ms. Play resumed through the visible Play control. | Pass |
| Damage / death / checkpoint | Explicit damage fixture used a wide stationary enemy, a stopping wall, and a checkpoint to force repeatable contacts. Health sequence **3 → 2 → 1 → 3**; death recovery returned player `(110, 564)`, grounded, checkpoint `audit-checkpoint`. | Pass |
| Import drops nonexistent checkpoint | After activating `audit-checkpoint`, importing the platform project (which contains no checkpoint) produced `checkpoint: null` and spawned from its authored player. | Pass after fix |

## Finding and fix verification

The first import check found a stale runtime checkpoint ID retained when the next project did not contain that checkpoint. Spawn fallback worked, but checkpoint status was incorrect. Reported to the lead engineer, who normalized retained IDs against actual checkpoint entities. The final damage → checkpoint → import check above verified the fix in the rendered app. No source or tests were changed by this audit agent.

Early headed attempts were affected by several old automation browsers consuming CPU and native focus changes. These attempts were not counted as product failures. The successful current checks ran in the separate headless session after cleanup.

Two transient `/api/health` 500 responses appeared during development hot reload/server restart. A subsequent request to the current dev endpoint returned HTTP 200. This audit did not identify a persistent runtime or API health failure.

## Boundaries

This re-audit covers gameplay and runtime transitions. It does not claim to re-verify live model behavior, transaction validation, persistence UI, accessibility, or all editor controls; the lead engineer owns the independent critical-path regression suite and wider product audit. Earlier live-AI actual-world recording and verification remain documented in `docs/RUNTIME-VERIFICATION.md`.
