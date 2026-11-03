# Runtime verification

Verified in Chromium through the rendered application using keyboard input and the public editor controls on November 1, 2026. Read-only `window.__wonderbox` snapshots were used to observe state; the live run did not inject runtime positions, mechanics, or authored changes.

## Complete starter route

The original Moonlight Garden was completed with `floatSeconds: 0`. Held movement/jump inputs collected all three stars, activated the checkpoint, and reached `won: true` at player `(2983, 564)`. Authored Pip remained `(100, 564)`. Attempts included enemy damage and death, followed by checkpoint recovery while retaining collected stars. This verifies browser completion and mechanical reachability; it does not establish unassisted human usability or enjoyment.

Useful jump approaches: first star from approximately x305 to the first step; second star from x1020; final terraces from approximately x2000 and x2240. Jump before entering the underside of a platform. The exit step can be crossed by jumping from approximately x2495.

## Live AI and actual starter world

A new reset restored the starter world through the confirmation dialog. A genuine Gemini 2.5 Flash request in the creative partner produced a six-action preview:

- Pip float duration 0.8 seconds.
- Turnip sprout throwable.
- Mossling transforms on hit, bounce speed 900.
- Moonlight atmosphere.
- Shadebug and Nightling retreat from light.

Apply committed the actions together at revision 9. All original terrain, entity positions, three stars, and the gate requirement were preserved. No fixture was imported during this run.

The subsequent keyboard run verified:

1. Pip reached the optional ledge at `(338.5, 264)`, grounded on its y320 top.
2. Pip picked up the newly throwable Turnip at its original x250, carried it through the first and second stars, and threw it near x1395.
3. Mossling transformed at `(1556.75, 580)` after the projectile collision.
4. A spring launch reached the actual side perch at player `(1777.4, 294)`, grounded on its y350 top. The perch is at x1720; this placement avoids an overhead collision during launch.
5. Pip returned to the original lantern at x1240, picked it up, and carried it toward Shadebug. With player x1771.8 and lantern x1813.8, Shadebug retreated from x1990.2 to x2022.9, beyond its usual x2010 patrol boundary.
6. All three stars were collected, the checkpoint activated, and the gate produced `won: true` at `(3024, 467)` while carrying the lantern, with all three hearts intact. Authored Pip stayed `(100, 564)`.
7. Undo reverted the AI transaction, including float duration to zero. A manual inspector edit set float duration to 0.4. A subsequent live read-only agent request correctly reported: “Pip's current floatSeconds value is 0.4.” Its first attempt received a provider-unavailable error; retry succeeded without project corruption.

Screenshots in `output/playwright/`:

- `live-ai-actual-bounce.png`
- `live-ai-actual-victory.png`
- `live-ai-manual-context.png`

## Isolated mechanic checks

Before the integrated live run, explicitly configured JSON fixtures were imported through the validated import UI. These are diagnostic test projects, not live AI responses or the completed starter-world evidence. Files remain in `output/testing/`.

- Float duration 1.0 reached the original optional ledge.
- Pick-up and throw triggered the transformation transition.
- Releasing jump did not truncate a spring launch; a bounce speed of 900 reached a side perch at player y294.
- A carried lantern made a light-sensitive enemy retreat from x864.1 to x930.6 beyond its usual x840 patrol boundary.
- A horizontal moving platform carried a grounded rider: player and platform moved by the same amount over 700 ms, retaining the exact relative x offset `14.203140413858364`; rider y remained 444 on platform y500.

Three automated deterministic physics tests verify repeated stable landing, wall separation, and moving-platform top-crossing detection. Type checking also passed after the runtime changes. Root release checks cover the complete final source tree.

## Recording

`output/playwright/wonderbox-live-signature.webm` is a local recording of the actual live AI application run, including preview/apply, play, undo, manual editing, and the agent reading the changed state. Chromium decoded its metadata successfully: **250.56 seconds, 800×600, readyState 4**. It contains pauses and a provider retry and is evidence footage, not a polished narrated submission clip. The recording is local and has not been published to Clips or submitted to the hackathon.
