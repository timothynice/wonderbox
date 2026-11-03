# Gameplay experience review

November 1, 2026 · desktop creator audience · playable local build. Scope: evaluate implementation, rendered UI, and available automated evidence; implementation changes remain with the lead/runtime agents. Uses the evaluate-gameplay-experience skill's core framework and testing references.

Evidence labels: **observed** = inspected rendered capture or reported direct browser observation; **measured** = executable assertion/output; **inferred** = source/design interpretation; **hypothesized** = player outcome awaiting a study. No human participants, player reports, population telemetry, or representative accessibility testing were available. Scripted reachability is not proof of human completion or enjoyment.

Evidence inspected: `output/playwright/runtime-first.png`, `first-play.png`, `output/verification/live-ai.json`, production `src/game/index.ts` and `physics.ts`, shared actions/history/schema, editor controls, and unit tests. Early screenshots predate the three-heart revision; do not treat them as final-build captures.

## Experience contract

The fantasy is being both a small garden explorer and the maker of its rules. The primary user is a desktop browser user curious about making a game without writing code. Intended rhythm: discover → encounter a possibility → pause → make one understandable change → immediately experience its consequence. A short starter route offers completion; optional ledges offer experimentation. Mastery means predicting both platforming outcomes and the consequences of a reversible world edit. These are design intentions, not validated emotional outcomes.

| Mechanic | Expected dynamic | Intended feeling (hypothesis) | Falsifiable evidence |
|---|---|---|---|
| Buffered, variable-height jump and coyote time | Coarse timing still produces a deliberate jump | Control confidence | Compare held/tapped height and late-edge inputs in the actual runtime; observe novice misses |
| Pause, selection, shared manual/AI action | A change is understandable and survives return to play | Autonomy | Make identical edits both ways, inspect parameters and resulting movement, then undo |
| Float and optional high ledge | New ability creates a route unavailable to the baseline jump | Discovery | Same start/input policy fails before edit and lands after edit; separate from human usability |
| Throw → creature transformation → bounce | A tool creates a new traversal surface | Creative competence | Actual thrown-body collision changes state and upward velocity, then reaches the perch |
| Portable light and shy creatures | Moving light changes enemy behavior predictably | Playful experimentation | Enemy moves away inside radius; resumes patrol outside it |
| Three stars, checkpoint, gate | Clear local goals and recoverable loss | Gentle accomplishment | Gate stays closed at two stars, opens at three; recovery preserves stars but restores transient bodies |

## State/action truth table

| State / entry | Goal and permitted input | Information and teaching feedback | Exit |
|---|---|---|---|
| Play / initial load or Play button | Move A/D or arrows; Space/W/up jump; E pick up/throw; Escape edit | Active Play, star count, controls, contextual status. Goal: find three stars | Escape/Edit pauses; damage may restart; enough stars plus exit contact wins |
| Edit / Escape or Edit button | Select/drag; paint/erase; palette place; inspector; AI; history | Paused banner, selection bounds, 20px grid, inspector, selection context | Play resumes frozen simulation when no edit occurred |
| Authored mutation / manual edit or approved AI transaction | Wait for validation; inspect change and undo | Revision/save state and summary. A successful edit rebuilds runtime at checkpoint, not at an arbitrary mid-jump position | Play begins rebuilt simulation; failed validation applies nothing |
| AI pending / send request | Continue inspecting/manual editing; no speculative simulation change | Progress indicator and current selection context | Valid focused edit commits atomically; broad/destructive edit becomes preview; errors leave world unchanged; stale revisions rejected |
| AI preview / broad proposal | Inspect named operations; Apply or Discard | Proposed operations and summary, before any mutation | Apply validates current revision again; Discard changes nothing |
| Carry / E near eligible object | Move/jump with object; E throw in facing direction | Object visibly follows player; status explicitly teaches E to throw | Thrown object becomes runtime physics body; authored object remains intact |
| Hit / unprotected enemy contact | Recover position; continue moving | Three-heart runtime added after baseline; message names hearts remaining, knockback and temporary invulnerability | Third hit restarts at checkpoint; crossing enemy from above bounces instead |
| Checkpoint / touch flag | Continue route | Activated flag glow, status and tone | Later death/restart returns here; full restart resets collection |
| Gate contact / insufficient stars | Find missing stars | Remaining-star count; gate bars and star indicators | Threshold reached opens gate; contact wins |
| Victory / open gate contact | Play again or keep creating | Completion overlay with explicit next actions | Restart level or edit |

Three-second audit: **observed** initial screenshot identifies Play, three-star goal, first star, ground, and nearby step. **Inferred** different statuses have distinct next actions. AI preview and post-damage comprehension were unverified at baseline; subsequent captures and checks are recorded below, while uncoached comprehension remains untested. Cosmetic flowers are intentionally nonsolid; novice confusion about decorative versus interactive plants remains a hypothesis to test.

## Baseline score and release gates

Default weights retained, totaling 100. `gameplay-scorecard.json` is the reproducible **pre-polish** baseline; calculated with the skill's `scripts/scorecard.py`. Arithmetic: 9 + 12 + 9 + 6 + 6 + 6 + 6 + 2 + 4 = **60/100**. This is a diagnostic heuristic, not a player satisfaction measurement.

| Dimension | Weight | Rating / 5 | Confidence | Gate |
|---|---:|---:|---|---|
| State/goal clarity | 15 | 3 | medium | pass |
| Agency | 15 | 4 | medium | — |
| Skill/mastery readability | 15 | 3 | low | — |
| Challenge/fairness | 15 | 2 | medium | baseline fail |
| Feedback/game feel | 10 | 3 | low | — |
| Pacing | 10 | 3 | low | — |
| Motivation | 10 | 3 | low | — |
| Accessibility/control comfort | 5 | 2 | medium | baseline fail |
| Aesthetic/mechanic coherence | 5 | 4 | medium | — |

Baseline gate causes: root's keyboard traversal exposed punishing contact death; screenshot/CSS exposed 7–10px control/helper text. These cannot be averaged away by a higher agency score. The post-change observations below address both defects for the tested desktop workflow. No post-change numerical score is asserted; the 60/100 figure remains only the preserved pre-polish baseline.

## Baseline difficulty, evidence limits, and iteration

| Segment | Current evidence | Limits / next observation |
|---|---|---|
| Late/confused input | **Inferred:** 140ms jump buffer and 120ms coyote time mitigate small timing errors | No seeded delayed-input sweep or first-attempt comprehension measurement |
| Novice | **Observed, root report:** initial keyboard route exposed contact-death friction | Three-heart recovery reduces loss cost in code; novice success/duration unmeasured |
| Returning/competent | **Measured:** shared edit/history tests, live provider edits including float/throw/transform/light | Successful structured edits do not prove the complete keyboard traversal chain |
| Expert | **Hypothesized:** optional ledges and bounce route reward timing and rule composition | No expert speed, action count, or dominant-strategy analysis |
| Misuse/access needs | **Measured boundary tests:** stale edits, locks, invalid transactions, rollback. **Inferred:** typing guard and reduced-motion drawing exist | No key remapping, touch gameplay, screen-reader equivalent to canvas, or motor-access study |

| Priority | Problem / root-cause hypothesis | Change and expected metric | Regression risk / evidence to keep it |
|---:|---|---|---|
| 1 | Baseline contact death makes an exploratory route costly | Runtime agent added three hearts and 1.5s hit recovery; expect fewer full retries | Ensure health is visible and collision cannot drain all hearts immediately; rerun same keyboard route and capture damage/restart |
| 2 | Very small secondary/control typography hides information | Raise interactive/helper text while retaining canvas area; expect fewer missed controls | Test desktop plus narrow layout for clipping and scroll behavior; inspect screenshots at native size |
| 3 | Signature mechanics may work individually without a readable chain | Record a continuous repeatable route using actual inputs and validated edits | Do not call state injection a human playthrough; separately log exact input sequence and every outcome |
| 4 | Default float initially reduces gravity while ascending, producing substantial extra height | Observe pre/post reach and inspector duration meaning; explain hold behavior | Strong float may bypass encounters; compare bounded settings without changing unrelated mechanics |

Production physics tests exercise landing stability, wall collision and platform top crossing. Shared action tests cover atomic rollback, imports, locks, undo/redo, persistence, stale responses and preserving omitted behavior fields. No duplicate formula simulation was added: private Scene transitions need real browser exercise, not a copied test model.

Next human wave: five desktop target users, one uncoached first route and two retries; include platformer novices and at least one user with readability/motor access needs. Observe first, then ask what happened, what is possible next, what deserves attention, and expected outcome. Record first correct input, missed cues, exact versus believed failure cause, retries, first/third success and duration. Use a clearly labeled internal 1–7 pulse for control confidence, fairness, curiosity and autonomy; no validated-instrument claim. Targets remain tuning hypotheses until observed. Rescore only after fresh evidence, keeping this baseline intact.

## Post-change verification and gate disposition

**Observed directly in final captures:** `desktop-final-layout.png` (1440×900) shows the complete desktop workspace, visible three-heart HUD, keyboard instructions, mute, separate checkpoint and full-level restart controls. `mobile-layout.png` (390×844) shows responsive stacking; lead agent measured document width 390, without horizontal overflow. The lead increased interactive/helper controls to 11–12px; some ornamental microtext remains intentionally small. This addresses the baseline control-legibility defect for the inspected desktop layout, while broader accessibility remains untested. Mobile has no touch gameplay controls and is not a complete mobile creator experience.

**Observed directly:** `live-ai-actual-bounce.png` shows Pip standing on the elevated side perch in moonlight, the transformed creature below, two stars, three hearts and the live model conversation. `live-ai-actual-victory.png` shows the actual completion state with Play again and Keep creating. These images substantiate rendered outcomes; the exact transition measurements below were reported by the runtime agent from read-only production debug observations during keyboard/mouse automation.

**Measured by runtime/lead browser runs:**

- Baseline starter with float 0 reached victory with all three stars and checkpoint active; one completed run ended with two hearts. Death/restart was exercised while debugging, and checkpoint recovery preserved stars. Authored spawn remained `(100,564)` and float remained 0. This verifies a route independent of AI abilities.
- In the actual starter, a live Gemini proposal with six supported edits was previewed/applied at revision 9. Float 0.8 reached the optional ledge at player `(338,264)`; the newly throwable original Turnip was carried from x250 to x1395; E threw it and transformed the actual Mossling at x1556.75. The transformed creature launched Pip onto the actual side perch, player `(1777,294)` grounded. The carried lantern caused a light-responsive enemy to retreat x1990→2022 beyond its ordinary patrol limit 2010. The run collected all three stars and won at `(3023,467)`, three hearts, checkpoint active. Authored spawn remained unchanged. This is integrated live-AI runtime evidence, distinct from earlier imported mechanics fixtures.
- Earlier explicitly configured JSON fixtures isolated each mechanic: float reached the original optional ledge; E/E transformed a creature; bounce reached a side perch; lantern retreat exceeded patrol bounds; moving-platform rider offset stayed exactly 14.2031404 before/after 700ms while grounded. Fixture evidence is labeled and is not presented as live AI.
- Lead's browser checks exercised locked AI edits, broad preview/Apply, stale-response rejection, AI undo, manual float 1.2 and a subsequent agent response that read 1.2 and returned no redundant actions. Editor checks covered painting/undo, placement, duplicate/delete and typing isolation. Detailed release evidence belongs in the final verification report.
- **Measured here:** the complete automated suite passes 25 tests, covering production physics, schema/actions/history and shared Agent-Native/provider/HTTP boundaries. These assertions do not replace the browser mechanics checks.

The runtime review found two real signature-route defects and corrected them before final integrated testing: bounce strength 780 could not gain the required 230px, so the default is now 900; a perch directly over the creature intercepted upward motion with its underside, so `bounce-perch` now starts at x1720, y350. A jump-release rule also incorrectly cut automatic bounce height; it now applies to voluntary jumps. These are production fixes supported by the subsequent actual-perch landing, not merely geometric estimates.

**Gate disposition:** baseline fairness and control-legibility blockers are addressed for the tested desktop route: recovery survived real contact/restart, both the unmodified and edited starter reached victory, health is visible, and final controls fit at a useful size. This is a provisional engineering release assessment with medium system evidence, not a high-confidence claim about novice fairness, accessibility or learning. Three-second comprehension after damage and uncoached completion still need the human wave above. No measured human enjoyment, preference or repeat desire is claimed.

Unresolved: human enjoyment and learning, full accessibility, touch gameplay, input latency/frame-time distribution, novice timing tolerances, authored levels that place spawns inside terrain, and arbitrary user-made level solvability. Versioned import/action validity deliberately does not imply every possible authored level is completable.
