# Improvement runtime evidence

November 1, 2026. Current working tree, dev app at `127.0.0.1:5173`, isolated Playwright CLI browser `runtime-phase1`. All interactions below used application controls, keyboard inputs, or the validated import UI. Read-only debug snapshots observed the derived simulation; authored/runtime positions were not injected through browser scripts. These are automated browser checks, not human usability sessions.

## Safe edit reconciliation

The runtime derives impact from the actual validated before/after projects. Appearance, name, AI lock, float, throwable/light/fear/transform/bounce and gate requirement changes preserve live bodies. Entity geometry, terrain, world dimensions/gravity, enemy patrol parameters, moving-platform motion, and explicit project replacement use a conservative rebuild. Import/reset can explicitly clear progress. A blocked authored spawn is relocated to clear terrain; a world with no clear spawn stays editable with an explanation.

Observed through the real inspector and atmosphere controls:

- A paused player was at **(356.2638889, 264)**, on the optional ledge, rather than its authored spawn (100, 564). Float 0 → 0.8 and a moonlight change retained the exact player position, velocity, camera 0, health 3, stars, elapsed time **2.899910000000003**, and moving-platform y **561.969728645493**.
- A carried Tossable sprout remained carried during a safe atmosphere edit: player **(913.2777778, 564)**, plant **(955.2777778, 554)**, carrying ID `toss-plant`, elapsed **3.24986**, identical before and after.
- Disabling both carry-enabling components (throwable false while portable light was already false) cleared the carrying ID while preserving the player and item positions. The object was released into ordinary residual-velocity physics rather than deleted or respawned.
- Mid-jump float 0.8 → 1.2 preserved already consumed float time **0.2333333333333333** exactly. Player position **(913.2777778, 438.0486111)**, upward velocity **−511.6666667**, and elapsed **3.48319** were identical before/after. Applying the edit did not refill the allowance.

Paused live entities remain visible/selectable at their actual positions. Inspector coordinates continue to represent authored spawn/object coordinates. Drags and terrain geometry changes take the structural path; runtime positions are never saved into the authored project to implement resume.

## Shared movement and actual renderer replay

The Phaser scene now calls `stepPlayerMotion`, the same pure production step used by static reachability checking. Dynamic platform riders, damage, throws and spring effects remain scene-level transitions and are explicitly outside the static checker.

An explicitly labeled diagnostic import added only an intermediate static step at **(480, 420), 100×20** to the starter. Through the actual terrain inspector, **Check this jump** returned a three-jump route to `optional-float-ledge` with unchanged float 0. The visible **Replay checked route** button fed its validated input sequence through the actual Phaser fixed-step runtime. Observed `replaying: true`, then:

- `lastReplayResult: "reached"`
- mode Edit, player **(356.2638889, 264)**, grounded, health 3.

After the manual float edit, a second current-revision replay also reached the same ledge at **(357.9583333, 264)**. Its visible completion message stated: **“Route replay reached the ledge · scripted input, not a human playtest.”**

The replay validates schema, current revision, mechanics fingerprint, a finite frame budget, and an exact deterministic recheck before starting. It starts a fresh derived test run at the checked source, displays **ROUTE REPLAY · TEST INPUTS**, and pauses on completion. Manual input, authored mutation, explicit cancellation or editing cancels replay. This is actual-runtime scripted-input evidence, not proof of human difficulty or a live agent playthrough. The diagnostic route above is not presented as an AI-generated proposal; separate live-provider evidence is owned by the lead engineer.

## Current starter and teaching encounter

The current **16-entity** starter was reset through the confirmation dialog and completed with **float 0**. Its authored revision stayed **4** throughout this run (revision 4 was the preceding Reset demo transaction). Pip remained authored at **(100, 564)**.

The newly added practice encounter worked without changing its proposed coordinates:

1. On the original default route, keyboard play collected the first star.
2. Player **(904.9027778, 564)** picked up Tossable sprout at authored x910; its held position was **(946.9027778, 554)**.
3. A second E threw it and transformed the stationary Practice puff at **(1020, 580)**.
4. Jumping onto the transformed puff produced the spring launch. Steering right landed player **(1206.2083333, 464)** on the original Lantern terrace and collected the second star, with all three hearts intact.
5. The same run continued through ordinary enemies, checkpoint and final terraces. Final state: **won true**, player **(2981.1111111, 564)**, health 2, all three stars, checkpoint active.

No Practice puff or Tossable sprout coordinates were changed by this agent; no engine physics tuning was needed. This demonstrates the encounter is mechanically usable in the actual starter, while uncoached learning remains untested.

## Visual and reduced-motion inspection

Added procedural feedback includes restrained landing/collection/transformation/checkpoint/gate rings, recognizable handles on throwable plants, light-fear rays/expression, a contextual E prompt and a generic throw-to-spring hint. Overlay geometry uses outlines and +/×/movement markers as well as colors; it never enters collision data.

At **1440×900**, Chromium reported reduced-motion media active, a rendered canvas, and no horizontal page overflow. Screenshot **`output/playwright/improvement-runtime-reduced-motion.png`** was inspected: the full workspace, game, controls, inspector, guidance, status and composer were readable within the viewport. Entity decorative bobbing and ambient firefly/star oscillation use a frozen decorative time under reduced motion; feedback rings do not expand. Necessary gameplay movement/platform motion remains functional. A single screenshot does not measure motion or constitute a comprehensive accessibility study.

## Checks and limits

Five focused edit-impact tests passed, covering safe classification, conservative structural/motion restart, immutable preview snapshots, geometry additions/moves/removals, undo symmetry and explicit replacement reset. Type checking passed. The targeted impact/reachability/physics run passed **15 tests** after final runtime changes. The lead engineer owns complete final regression/build runs, preview/retry UI verification and live AI recording.

No human sessions, public recording publication, legal acceptance, submission or deployment were performed by this agent.
