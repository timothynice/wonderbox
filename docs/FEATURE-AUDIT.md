# Feature audit and repeatable critical paths

Audited November 1, 2026. The three Playwright tests run against the production build with real UI controls, the actual Express API, and Agent-Native shared validation. Each test receives fresh browser storage. Read-only debug getters observe results; they never move a runtime body or mutate project data.

## Latest follow-up coverage

The same three browser tests now include bounded-search exhaustion/explicit Retry, direct mechanical step preview/Discard/Apply/Undo, and zero model requests for that tool. Unit count58 across11 files. Genuine Gemini evidence on original/manual-edit/locked-player contexts is separate from fixtures: [follow-up evidence](evidence/followup-step-planning.md). Dependency checks now reject any finding outside the exact documented upstream exception; the four high findings remain visible.

## Improvement coverage

The suite remains exactly three rerunnable browser tests, extended rather than duplicated:

1. **Play and resume:** movement/jump/pause, exact position/camera/health preservation across safe behavior and atmosphere edits and Undo; diagnostic pickup/throw/checkpoint/gated victory; authored/runtime separation and reset.
2. **Create and persist:** paint/erase, place/select/duplicate/delete, inspector changes, Undo/Redo, validated export/import/reload, invalid-import rollback and held-key/form isolation.
3. **Agent safety and checked outcome:** selected/current-state context, locks, readable preview/ghosts/Discard/Apply, stale preview invalidation, stale response rejection, explicit provider Retry without duplicate mutation, manual route check, constrained checked terrain proposal, Apply-time check and actual-runtime witness replay with unchanged authored state.

Unit coverage is now51 tests in8 files. Genuine Gemini checked-agent evidence is retained separately in [phase3 evidence](evidence/phase3-agent-capabilities.md). Static search is bounded; replay proves the returned input witness, not human usability. The current16-entity starter's no-float victory and new Practice puff teaching encounter are keyboard-verified separately in [runtime evidence](evidence/improvement-runtime.md). Group testing was waived; [owner checklist](PLAYTEST-CHECKLIST.md) is ready.

## Run

```sh
npm ci
npx playwright install chromium --no-shell
npm test
npm run test:critical
```

`npm run test:critical` builds and starts isolated localhost servers4317/4318 automatically. It fails if either port is already occupied. It requires no provider key and does not alter projects in the normal dev/production browser origins. To watch: `npm run test:critical:headed`. To repeat after building: `npx playwright test --repeat-each=3`.

| Test | Critical path and assertions |
|---|---|
| 1. Gameplay | Original-starter movement/jump; pause really freezes simulation; imported diagnostic route pickup/throw transforms an enemy; checkpoint activation/restart; star collection and gated victory; play does not change authored data; removing an active checkpoint clears its runtime reference; full restart clears progress |
| 2. Creation and persistence | Paint/erase terrain; undo/redo; plant placement, selection, duplicate/delete; inspector float edit; actual JSON download/import round trip; exact reload persistence; invalid import rollback; typing and keys held before form focus do not move the character |
| 3. AI and action safety | Focused behavior change; undo; manually updated selection/context reaches provider; locked edits rejected; destructive preview unchanged until Apply; atomic undo; stale response rejected after a manual world edit; provider failure leaves project unchanged |

The provider fixture is **explicitly test-only**. It supplies deterministic model-shaped outputs to the real server transport. Strict schema parsing, approval policy, lock checks and mutation execution are the application's actual code. It avoids quota/availability flakiness; it does not test model intelligence or live network availability. The short imported gameplay route is a diagnostic fixture, separate from the original-starter audit below.

## Latest result

Historical baseline: all25 unit tests passed. After the checkpoint and provider grammar changes, the three browser tests passed **three consecutive runs (9/9)** in45.5 seconds, with no retries. Type checking and the production build pass. A first test-authoring failure identified an ambiguous checkpoint selector; a later erase check used a hard-coded coordinate near a grid boundary. The final tests use the specific restart control, the painted rectangle's observed center, and a Phaser-frame wait before canvas input.

## Feature coverage beyond the three tests

| Feature group | Current evidence |
|---|---|
| Original starter completion, damage and checkpoints | Fresh keyboard play audit; see [runtime audit](evidence/feature-runtime-audit.md) |
| Float, throw transformation, spring bounce, portable light/fear and moving-platform riders | Actual runtime checks with clearly identified diagnostic imports; details in runtime audit |
| Inspector | Current browser audit changed player float/spawn X/Y; plant throwable/portable light/radius; enemy fear/transformation/patrol speed/range/bounce; moving platform distance/speed/axis; exit position/star requirement |
| Direct editor | Selected and dragged a placed object by60px on the20px grid; placed creature/star/platform/checkpoint/lantern/flower; verified manual movement of AI-locked player |
| Workspace | Collapsed/reopened AI panel; toggled mute UI; reset confirmation cancel/confirm and undo;390px layout without horizontal overflow; no JS exceptions in this audit. Mute UI checks do not establish acoustic quality |
| Real AI | Fresh genuine-provider requests and compact grammar validation, with failures preserved; see [AI audit](evidence/feature-ai-audit.md) |
| Schema/actions/history/physics/API errors | Expanded51 unit tests, including rollback, strict imports, locks/bypasses, revisions, partial-property preservation, missing credentials, invalid outputs, quota and timeouts |

UI audit screenshots: `output/playwright/feature-audit-desktop.png` and `feature-audit-mobile.png`. Machine-readable local results: `output/testing/ui-feature-audit.json`. Regression failures retain traces/screenshots and the HTML report at `output/playwright/report` (`npx playwright show-report output/playwright/report`).

## Issues found and addressed

- Importing or editing away an active checkpoint left its ID in transient state. Runtime reset now retains only a matching checkpoint entity. Test1 asserts the removed checkpoint becomes null.
- Gemini JSON mode intermittently returned malformed JSON on a combined selected-object move/behavior edit. It was safely rejected without mutation. Added a compact native response grammar, retaining the full strict shared action schema as the authoritative validator. Real-provider combined and broader requests were rechecked; malformed-output rollback remains covered.

## Evidence limits and dependency follow-up

These are Chromium engineering checks, not an uncoached human play study or proof that every arbitrary authored level is solvable. Live model output/availability remain probabilistic; unavailable, unsupported or invalid requests must fail visibly and leave the project unchanged. Browser tests run against a diagnostic level and deterministic provider; the linked fresh audits distinguish original-world and live-provider results.

Current `npm audit --omit=dev` reports4 high package findings propagating one nested Zod advisory, with zero critical/moderate/low after reviewed overrides. See [dependency review](DEPENDENCY-REVIEW.md). Functional passes do not resolve the remaining advisory. Public deployment still requires hosting access control as documented in README.
