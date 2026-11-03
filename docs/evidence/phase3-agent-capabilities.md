# Phase 3 shared capabilities and checked editing

The shared Agent-Native definitions now cover inspect, preview, bounded reachability check and atomic apply. Manual controls and the creative-partner workflow call the same `.run()` capabilities; Express mounts explicit endpoints. The integration remains a local, single-user application rather than a hosted Agent-Native chat harness.

## Genuine model outcome loop

[phase3-live-checked-agent.json](phase3-live-checked-agent.json) records a real Gemini 2.5 Flash run at 2026-11-02 01:35 UTC. No model response was mocked or substituted. The request was:

> Make this ledge reachable without changing my character or existing terrain. Add a stable intermediate step and preserve existing mechanics.

The target was `optional-float-ledge`, and all candidates were evaluated against the original authored revision 0:

1. The inspect capability read the actual project, terrain selection and locks.
2. The check capability found no route under its bounded static policies before editing. It did not claim the ledge was impossible.
3. The first live model candidate passed schema/lock validation but its route check returned `no-route-found`. The failed actions and check evidence were supplied as context to the next model request.
4. The second live model candidate added intermediate terrain at x=450, y=380, width=100, height=24. The check returned a stable four-jump witness: garden floor → first step → petal step → new step → optional ledge.
5. The result required an Apply preview. An explicit approved application recomputed evidence against the exact candidate revision and returned `route-found` at revision 1 with the same mechanics fingerprint.

The artifact retains the failed first-candidate activity and successful second-candidate activity, plus the final actions, actual preview diff, full witness inputs and budgets. Neither candidate was committed during the search. The model's final summary mentions replacing a prior attempted step; the actual validated diff correctly contains only one added authored platform, since the earlier candidate was never applied.

This is evidence of mechanical reachability and genuine evidence-driven revision by the model. It is not a human playtest, a claim of a fun difficulty level, or proof of arbitrary game solvability. Runtime witness replay is a separate visible check, and any new human-play results must be identified separately.

## Enforced promise at preview and Apply

The checked terrain workflow protects the full player entity, authored spawn, player behaviors, canonical source surface, destination surface and world dimensions/gravity. A reusable action-layer guard runs during preview and again at Apply, alongside schema, lock and revision checks. Changing the character's float ability, lowering the destination, moving the source floor or reducing gravity cannot be used to satisfy this terrain-edit promise. Normal behavior editing and a later manual check remain supported separately.

Apply accepts a `checkRequest`, not a trusted success flag. It recomputes the check after deriving the exact current-revision candidate, and discards that clone if either scope or reachability fails. The browser also rejects stale results before applying them. Evidence includes the authored revision and mechanics fingerprint; these are context bindings, not an authorization system.

The workflow uses at most three actual model requests in one 40-second budget. Alternate-model HTTP503 recovery, if configured and used, counts against the same limit. Unsupported or already satisfied checks prepare no edit. Exhausting the candidate budget prepares no edit and reports the limit. Activity is a factual capability log, not fabricated progress or private reasoning.

## Deterministic regression protection

`tests/agent-capabilities.test.ts` covers:

- Shared inspection, selection, locks and dry preview.
- Baseline check → unhelpful candidate → evidence feedback → passing candidate.
- Three-model-request exhaustion with no false solution claim.
- Unsupported/already satisfied checks without unnecessary model requests.
- Model shortcuts that change the player or target rejected and replanned into intermediate terrain.
- Apply-time rejection for altered character, target, automatic source or world physics.
- Apply-time recheck and fingerprint/revision binding; tampered and stale edits rejected.
- Actual manual HTTP inspect, preview and check routes; actual Apply scope guards and recomputation.

These model-boundary unit tests use explicitly mocked provider responses to reproduce success and failure deterministically; the linked live JSON evidence above uses genuine model responses. Existing `tests/agent.test.ts` protects provider transport/error handling and ordinary edits. The separate reachability tests protect witness replay and finite mechanical-check limits.

The reviewed dependency changes and remaining four high package findings from one nested Zod advisory are documented in [DEPENDENCY-REVIEW.md](../DEPENDENCY-REVIEW.md), with the fresh [production audit](phase3-production-audit.json).
