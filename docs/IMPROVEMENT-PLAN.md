# Wonderbox — judging feedback improvement plan

Created November 1, 2026. Status: engineering implementation complete; final release evidence below. Group testing was explicitly waived by the user; an owner playtest checklist replaces that work. Baseline is the verified release and its follow-up feature audit:25 unit tests and3 repeatable browser tests, including9/9 repeated passes. The prior75/100 assessment is a subjective judging estimate, not an official score. Higher scores below are aspirations to test, not promised outcomes.

## Outcome and scope

Make Wonderbox feel like a responsive creative playground: pause at a problem, understand a proposed change, apply it, and immediately experience the result. Demonstrate an agent that can inspect a game, propose a bounded solution, check a supported gameplay outcome, and explain its evidence through capabilities shared with the UI.

Preserve the existing engine, original world/art, strict versioned actions, atomic history, AI locks, stale checks and durable authored projects. No arbitrary generated code, second engine, accounts, multiplayer, marketplace or broad infrastructure expansion. Desktop creation remains the primary target. Public deployment is optional; security review precedes exposure of a credentialed server.

| Feedback / judging category | Planned response | Evidence required |
|---|---|---|
| Execution: edits interrupt play | Classify mutations and reconcile safe changes without resetting the run | Same paused position/camera/progress before and after safe edit; structural fallback clear and reliable |
| Design: changes are hard to visualize | Shared visual diff preview with ghost geometry, highlights and property changes | Preview cannot mutate the canonical project or live runtime; Apply/Discard/Undo demonstrated |
| Innovation: agent mainly returns transactions | One outcome-aware ledge-assistance workflow | Real inspect → propose → check → preview → apply; reproducible route evidence and honest limits |
| Agent-Native: strengths mostly invisible | Shared inspect/preview/check/apply capabilities and a concise activity display | Manual and agent paths use identical capability code; locks/revisions apply throughout |
| Design/execution: novice learning unproven | Improve one discovery sequence and prepare owner testing (group study waived) | Runnable teaching sequence and a concise owner checklist; no invented human results |
| Execution: provider friction | Preserve failed intent and provide safe explicit retry/current-state handling |503/timeout/invalid/stale requests leave state intact and recover without duplicate commits |
| Execution: dependency risk | Review and remediate affected dependency paths | Fresh production audit, reviewed changes and regression checks; remaining exposure documented |
| Presentation: product strengths take too long to show | Rehearsed2–3 minute actual-app demo with a strong opening | Higher-resolution recording, genuine requests/results, legible changes and signed-out public Clips check by user |

## Sequence and working schedule

This is a proposed focused schedule, not an unattended job or automatic deadline commitment. Work can start immediately after planning. Preserve a full final-day buffer rather than adding mechanics late.

| Order / target window | Deliverable | Dependency |
|---|---|---|
|1 — Nov2 | Safe edit/resume reconciliation; initial dependency triage | Existing baseline checks |
|2 — Nov3 | Visual transaction preview and reliable retry | Shared edit-impact classification from1 |
|3 — Nov4–5 | Bounded reachability checker and shared Agent-Native workflow | Preview protocol and production physics extraction |
|4 — Nov6 | Discovery/game-feel polish; owner test kit | Stable core workflow; group study waived |
|5 — Nov7 | Fix observed friction, finish security review and full verification | Engineering findings and dependency review |
|6 — Nov8 | Final rehearsal, recording and submission package | Release gates pass |
|Buffer — Nov9 | Only material fixes, human publication/submission and receipt | User action; published deadline23:59 Pacific |

Dependency remediation runs alongside the product work but is integrated separately so upgrades do not obscure gameplay regressions. The user explicitly requested skipping group testing and will playtest after delivery. Prepare the owner checklist; there is no participant recruitment or group-study completion gate. Do not claim human usability results from automation.

## 1. Preserve play context after safe edits

Primary ownership: runtime and shared model/action integration. Likely files: `src/game/index.ts`, `src/game/physics.ts`, new shared edit-impact helper, `src/main.tsx`.

- [x] Derive a typed change-impact summary from the actual validated before/after projects, rather than trusting the model's labels. Reuse it for manual edits, AI edits, undo/redo and preview explanations.
- [x] For safe atmosphere/behavior edits, update the affected live components while preserving player position, camera, health, stars, checkpoint, enemies, platform phase and valid carried-object state. A parameter change must not refill a consumed float allowance or reset a run gratuitously.
- [x] Normalize edge cases explicitly: disabling a carried object's throwable/light behavior safely releases or updates it; changing motion parameters must not teleport an occupied platform. If reconciliation cannot be proven safe, use the structural fallback.
- [x] For structural geometry, spawn, world dimensions/gravity, import/reset, and incompatible changes, rebuild at a valid checkpoint/spawn and state why. Preserve the existing separation between authored data and runtime bodies. Do not persist current player position to achieve resume.
- [x] Warn in broad previews when an edit will restart simulation. Direct structural edits show a brief restart explanation and retain Undo. Explicit checkpoint/full-level restart controls remain available.

Acceptance: pause beside the high ledge, change float, Apply, and resume from the same position/camera; no jump happens until a fresh input. Atmosphere edits retain progress and platform phase. Invalid geometry/checkpoint references cannot trap or corrupt runtime. Undo/redo use the same impact rules. Keyboard/form guards and disposal still pass.

## 2. Make changes visible and recovery easy

Primary ownership: editor/product design plus shared transaction preview. Likely files: `src/main.tsx`, `src/style.css`, runtime overlay rendering, new shared preview/diff helper, `server/agent.ts`.

- [x] Build a pure validated preview result: base revision, affected IDs/regions, additions/removals/moves, changed fields, restart impact and any check evidence. Previewing applies actions to a clone only; preview never adds a history entry.
- [x] Render ghost platforms/objects, before/after movement markers and affected bounds above the current world. Use labels/shapes as well as color. Preview overlays must not intercept editing or participate in collisions.
- [x] Show concise property differences such as “Float0 →0.8s” and “Gate3 stars →4.” Keep the canvas dominant; support panning to affected items without losing the user's camera bookmark.
- [x] Retain immediate application for focused reversible edits, with a short affected-object highlight and Undo. Broad/destructive edits and outcome-checking edits use explicit Apply/Discard. Provide a way to inspect the last applied diff.
- [x] Invalidate a pending preview after any authored revision change; Apply revalidates locks, expected revision and approval through the existing shared action. Discard restores overlay/camera context and changes nothing.
- [x] Preserve failed request text and selection; add an explicit Retry. Retrying uses the latest project and context, identifies changed context, and cannot silently reapply a completed transaction. Handle503, timeout, quota, invalid output and stale responses distinctly; avoid blind retry loops.

Acceptance: added/moved/removed terrain is recognizable before Apply; focus/property-only edits have legible feedback. Discard changes no project/runtime state; Apply is one revision/history entry; Undo restores authored data. Concurrent manual edits prevent stale Apply. A forced provider failure can be retried without retyping and without duplicate commits. Overflowing panels retain non-reflowing scroll affordances.

## 3. Build one outcome-aware agent capability

Primary ownership: shared physics, bounded analysis and Agent-Native integration. Likely files: `src/game/physics.ts`, new `src/shared/reachability.ts`, `actions/`, `server/agent.ts`, preview UI.

Signature request: **“Make this ledge reachable without changing my character.”** Target a selected terrain surface/region; the existing editor currently selects entities, so add a focused terrain-target selection affordance with visible bounds. Preserve ordinary terrain paint/erase and entity selection.

- [x] Extract the necessary movement/jump/collision stepping from production runtime into shared pure code. The checker must use that code, not a second approximate physics implementation.
- [x] Limit the first checker to static terrain and supported player movement/float parameters. Use explicit source/target surfaces, bounded input trajectories and a computation budget. Moving platforms, throws, transformations and light-mediated routes return “not checked by this checker,” not fabricated confidence.
- [x] Return typed evidence: project revision, tested source/target, mechanics/settings fingerprint, status, limitations and a witness input sequence/trajectory when a route is found. Distinguish “route found,” “no route found within tested inputs,” and “unsupported/inconclusive.” A bounded search cannot prove global impossibility.
- [x] Expose a small set of actual Agent-Native capabilities for inspection, validated preview, route checking and existing transaction Apply. Both a manual “Check this jump” control and the agent call the same checker. Read-only inspection/checking never increments revisions or commits speculative data.
- [x] Give the agent a bounded inspect → propose → check loop, initially at most3 candidate proposals and a finite simulation-step/time budget. Preserve the existing model deadline/cancellation; on exhaustion return useful limits and a manual alternative. No arbitrary executable output.
- [x] Preview a candidate stepping stone and the witness trajectory. Recheck the exact proposal/revision at Apply, enforce AI locks, and summarize the checked outcome without claiming human usability. Lock-respecting constraints include keeping the character unchanged.
- [x] Show a compact activity list: “Inspected ledge → proposed step → checked route.” Display tool results and assumptions, not hidden model reasoning or invented progress.

Acceptance: on the original optional high ledge, a genuine agent request proposes an allowed terrain change, finds a supported route without changing the player, previews it and commits only after Apply. The returned input sequence is replayed in the actual runtime and reaches the target. Manual checking produces identical evidence on the same snapshot. Impossible-within-budget and unsupported dynamic cases fail honestly. Manual edits during checking invalidate evidence. A locked relevant object stays unchanged.

Fallback if budget/schedule fails: ship the shared manual checker and visual previews with an explicit experimental/limited label; do not claim the outcome-aware agent milestone complete or simulate a successful result. Preserve the existing live editing loop while continuing to resolve the checker.

## 4. Improve discovery and game feel with evidence

Primary ownership: game/product design and original procedural art/audio. Likely files: `src/shared/starter.ts`, `src/game/index.ts`, contextual editor guidance and `docs/GAMEPLAY.md`.

- [x] Tune one short early sequence that teaches pickup, throw, transformation and bounce through readable spacing and cues. Keep a complete baseline route and optional edited route. Avoid adding more mechanics or expanding level length.
- [x] Add restrained original character anticipation/landing feedback, distinct throwable versus decorative plant cues, transformation reaction, light-fear expression and clear gate/checkpoint feedback. Preserve simple collision geometry and reduced-motion behavior.
- [x] Improve first-session guidance: immediate movement goal, contextual E prompt, a clear reason to pause/select/change and an easy way to dismiss guidance. Retain desktop canvas area and readable controls.
- [x] Group study waived explicitly by the user. Prepared [owner self-test checklist](PLAYTEST-CHECKLIST.md) for testing after delivery; no participant results or usability targets are claimed.

Acceptance: teaching sequence works in the real runtime; default and edited routes still finish. All animations respect reduced motion and do not move colliders unexpectedly. Owner testing follows delivery. No uncoached human results are claimed.

## 5. Reliability, dependency remediation and regression gates

Primary ownership: lead integration, with runtime/agent specialists used for separated tasks during execution.

- [x] Refresh production dependency audit and map affected transitive paths to actual imported code/routes. Verify current upstream fixes before choosing versions. Prefer compatible upstream updates; narrowly justified overrides require API/import compatibility checks. Avoid force-downgrading Agent-Native or overriding Zod majors blindly.
- [x] Resolve the critical/high findings where safe compatible changes exist; document remaining paths/exposure with evidence. No public credentialed deployment until material exposed findings are resolved and host access control is verified. Local testing can proceed independently.
- [x] Extend the existing3 browser flows rather than creating a large fragile suite: gameplay adds resume preservation and runtime witness replay; creation adds visual preview/Discard/stale Apply; AI adds bounded tool results, retry and checked-proposal approval.
- [x] Add focused unit tests for impact classification, preview purity, checker outcomes/budgets, evidence revision invalidation and parameter reconciliation. Keep fixtures explicitly labeled and live-provider checks separate.
- [x] Run `npm run typecheck`, `npm test`, `npm run test:critical`; repeat the3 critical tests3 times after final integration. Run original starter and live-AI signature routes, console/network inspection, desktop/narrow screenshots and reduced-motion inspection.
- [x] Preserve the current passing baseline; integrate each vertical slice separately and keep production runnable. Update PLAN.md/evidence after each milestone. No claim of security, usability or live-provider success based solely on mocked browser tests.

Acceptance: all required checks pass without retries masking failures; safe edits/preview/checker appear in evidence; fresh dependency findings and limitations are explicit. No secrets in client bundle, exports, logs or recordings.

## 6. Demonstration and submission readiness

Primary ownership: lead/product storytelling; user owns public publication, terms and submission.

- [x] Rewrite `docs/DEMO.md` around2–3 minutes. Opening30 seconds: show a gameplay obstacle, pause, a genuine behavior edit, resume from the same location, and reach the ledge.
- [x] Middle: visual preview + outcome check of a terrain solution; a brief throw/transformation/bounce moment; direct edit followed by the agent using the new state; Undo. End with a clear playable outcome and creator control.
- [x] Rehearse/reset through actual controls. Prepare capture at1440×900 or larger,100% zoom and legible text. Prefer approved local Voicebox Heart for requested narration; check a short sample first. Do not use system speech silently, paid services without authorization, or fake live model results.
- [x] Retain an uncut evidence capture; any edited clip must disclose waiting-time compression and preserve request/result order. Keep prompts and changes reproducible in a resettable demo project.
- [x] Update README, attribution, project description, verification and limitations. Prepare exact public Clips publication/submission checklist and leave signed-out public-link verification for after user publication. Do not publish, accept terms or submit on the user's behalf without authorization.

Acceptance: high-resolution actual-app capture tells the core value quickly; each claimed capability appears and works; live/fixture evidence is distinguished; user has the complete publication/submission package. Published Clips and confirmed submission remain separate human completion gates.

## Definition of done and execution order

Implementation is ready for final judging review when safe edits preserve context; changes are visually understandable and undoable; one bounded agent workflow checks and demonstrates a real gameplay outcome; original gameplay remains complete; regression/reliability/security findings are accounted for; and demo materials accurately show the result. Group testing is waived by explicit user instruction; owner playtesting follows delivery. Public submission remains a separate user action.

Start with milestone1's safe player/atmosphere reconciliation and its browser assertion, then milestone2's pure diff preview. Those two slices improve everyday use even before reachability analysis is finished. Do not begin a shell redesign, extra content pack or new engine while these gates remain open.


## Delivered evidence and remaining human steps

Safe resume, visual previews/affected overlays, explicit Retry, terrain selection/checking, real inspect→propose→check capabilities, Apply-time rechecking and actual-runtime witness replay are implemented. The early Practice puff encounter teaches throw→spring→Lantern terrace; the current 16-entity starter reaches three-star victory without float. See [runtime evidence](evidence/improvement-runtime.md), [live checked-agent evidence](evidence/phase3-agent-capabilities.md), [verification](VERIFICATION.md), and [dependency review](DEPENDENCY-REVIEW.md).

The dependency review reduced 12 affected packages to four high package findings propagating one nested Zod advisory; no incompatible forced fix was retained. Group testing is waived. Owner playtesting, public Clips publication, legal acceptance, deployment access control and submission remain separate user actions. Recording status and exact artifacts are in VERIFICATION.md; no local recording is a public Clips URL.
