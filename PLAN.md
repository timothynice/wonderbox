# Wonderbox — implementation and release status

## Active improvement plan

The judging-feedback engineering improvements are implemented. See [docs/IMPROVEMENT-PLAN.md](docs/IMPROVEMENT-PLAN.md) and [current verification](docs/VERIFICATION.md).

- [x] Safe behavior/atmosphere edits preserve live context; structural restarts explain their cause.
- [x] Visual transaction previews, ghost geometry, affected-object feedback, last-change details and explicit safe Retry.
- [x] Shared inspection/preview/static reachability capabilities; genuine bounded checked-agent workflow; Apply-time recheck and actual-runtime input replay.
- [x] Original early pickup/throw/spring encounter, contextual guidance and reduced-motion feedback. Owner checklist prepared; group testing explicitly waived.
- [x] Dependency review/remediation and expanded three critical browser flows. 51 unit tests pass; release verification documented.
- [x] Updated demo script, project description, attribution and release instructions. Local capture evidence/status documented separately; public publication/terms/submission remain user actions.

The following baseline sections retain historical evidence. Current behavior and limitations supersede the earlier restart semantics, test counts, dependency counts and low-resolution recording notes.

## Verified baseline release status

All five implementation milestones are complete and verified locally. The release is runnable, the real AI connection changes gameplay through shared validated actions, and the original starter world and live-AI signature route reached victory in Chromium. Public Clips publication/submission remain human steps; no legal terms were accepted.

## Context verified

- Workspace initially empty: no pre-existing code, assets, git repository, remote, or deployment target.
- Official Builder.io pages checked November 1, 2026: Agent-Native functional app, pre-existing-work disclosure, public actual-app Clips demo, deadline November 9,2026 11:59 PM Pacific; judging40/20/20/20.
- Node 26.10.0/npm 11.19.1 available. Existing inherited GEMINI_API_KEY used server-side; no secret copied into project files or printed.
- Current Agent-Native action docs/package source, Phaser docs, React effects, Vite, Zod and Express docs checked. Dependency versions locked in package-lock.json.

## Milestones

- [x] M1 playable foundation: responsive movement, fixed-step collisions, camera, variable jumps, coyote/buffer, health/damage/death/checkpoint, original world, three-star gated victory.
- [x] M2 creation loop: pause/edit/resume, selection/drag, terrain rectangles/erase, placement, inspector components, spawn/exit positioning, world settings, locks, atomic undo/redo, local persistence, validated JSON import/export/reset.
- [x] M3 live agent: actual Gemini request, selected-state/recent context, Agent-Native defineAction shared by manual and AI, strict schema/locks/revisions, broad preview/Apply, stale rejection, provider/invalid-output errors, actual-model disclosure, configurable OpenAI adapter.
- [x] M4 signature mechanics: float, pickup/throw, hit transformation, bounce, portable light and light fear, moving platform rider transport, checkpoint/star gate. Tested individually and together in actual starter with live AI.
- [x] M5 polish/release: original procedural art/sound, health/mute/restart feedback, calm editor, desktop fit/mobile layout, readable controls, reduced decorative motion, clean production browser pass, docs/script/recordings, production build and51 tests pass in the current improvement release.

## Architecture and important decisions

React/TypeScript shell + Phaser 3.90 rendering + small Express API. Canonical v1 Zod project -> derived runtime. UI and AI use the same Agent-Native transaction capability; no arbitrary generated executable code. Agent-Native's full hosted chat/auth/database harness is deliberately not included. Browser-local single-user projects and session-local history/chat avoid accounts/infrastructure.

Pause and safe behavior/atmosphere edits preserve simulation and camera. Structural edits rebuild transient bodies at a safe checkpoint/spawn, preserve valid progress, and explain the restart. Full restart clears progress. Terrain editing operates on authored rectangles; erasing removes a rectangle and Undo restores it. New/invalid user levels are schema checked, not guaranteed solvable.

Gemini 2.5 Flash is the default after repeated availability failures from 3.5. Strong numeric instructions yield the requested three-star gate in final live tests. Optional single503 fallback identifies the actual model. Transient503 also occurred on 2.5 and surfaced honestly; explicit retry succeeded. No canned-response mode exists.

## Issues found and fixed

- Zod4 partial defaults silently resetting unrelated behavior/world fields -> explicit no-default patch schemas + regression tests.
- Locked object replacement/terrain-ID bypasses -> original-ID protections in action layer.
- Click selection generating move/history/restart -> drag threshold and no-op suppression.
- Spring launch cut by variable-height jump release -> only voluntary jumps receive jump cut.
- Bounce780 insufficient and perch directly overhead -> bounce 900 and side perch 1720.
- Thrown decorations/post-hit projectiles not continuing -> generic residual-velocity physics.
- Paused platform phase drifting -> frozen simulation time in Edit.
- Typing while an earlier key was held -> clear held inputs during form focus.
- Desktop lower controls below fold -> fixed-height desktop workspace; panels scroll without overflow-induced text reflow.

## Verification and evidence

See docs/VERIFICATION.md and docs/RUNTIME-VERIFICATION.md for exact results and evidence limits.51 automated tests pass in the current improvement release. Live model evidence is preserved in docs/evidence. Browser scripts are in scripts/ with reproduction instructions.

Browser checks: baseline no-float victory; original live-AI signature victory; moving platform exact rider offset; damage/checkpoint recovery; terrain/place/duplicate/delete/undo; live locks/broad Apply/stale rejection; undo AI/manual adjustment/agent reading current value; export/import/reload/invalid-import rollback; typing isolation; desktop1440×900 and mobile 390×844 no horizontal overflow; fresh production console/network clean. Final observed rAF cadence over 120callbacks averaged16.66ms,p95 ~16.8ms (environment-specific, not a device performance guarantee or input-latency test).

Local recordings in output/playwright (not source-control assets): continuous live signature 250.56s; cropped66%-time overview~165s. Both actual application, no fixtures in the integrated run, no narration. Public Clips link remains a human step.

## Known limitations and access-dependent steps

- No configured deployment target. Local preview uses npm run dev at 127.0.0.1:5173; production npm start serves 3001. README has exact deployment steps. No invented hosted URL.
- Public Clips publication, eligibility/rules acceptance, final submission/receipt require the user.
- OpenAI-compatible adapter is transport-tested with mocks, not live-tested; Gemini is verified live. Provider availability/intent remain probabilistic.
- Desktop keyboard/mouse primary. Narrow layout works; touch game controls, remapping, gamepad, and a screen-reader gameplay equivalent are not included.
- Browser localStorage only; no cross-device/cross-tab sync or persisted undo/chat history. Export for backups.
- No uncoached human play study. Automated keyboard completion and mechanic reachability do not establish enjoyment, novice learning, or universal accessibility.
- Build emits harmless upstream Zod comment-annotation warnings; build output succeeds.
- Current improved capture is1440×900. Public Clips publication remains a user step; older800×600 captures are historical evidence.
- No remaining implementation blocker identified in the tested release. Documentation deliberately retains evidence boundaries and external publication steps.

## Follow-up feature audit and regression suite — November 1, 2026

- Added exactly three Playwright production-browser tests, available with `npm run test:critical` (build included) or `test:critical:headed`. Config starts isolated local app/provider ports4317/4318 and refuses existing listeners. Every test uses fresh storage. Provider fixture is test-only, deterministic, and clearly labeled; actual server parsing, Agent-Native validation and transactions still run.
- Tests protect gameplay/pause/interactions/checkpoint/victory/authored separation; direct creation/undo/redo/export/import/reload/typing; and focused AI edits/locks/preview/current context/stale errors/provider failures.
- Re-audited original no-float Moonlight Garden to victory at revision0. Rechecked float, throw/transformation/bounce, portable light retreat, horizontal/vertical platform riding, pause, damage/death/checkpoint with diagnostic imports. Audited every palette type and exposed inspector behavior, drag/grid, spawn/exit, panel controls/reset and responsive layout.
- Fixed runtime checkpoint reference surviving removal/import; test1 now asserts checkpoint null after importing a project without it.
- Found intermittent malformed Gemini JSON on combined move/behavior requests. Added a compact native response grammar (full strict discriminated action schema remains authoritative). Successful real-provider combined and full signature requests reverified; temporary503s still surface truthfully and apply nothing.
- Final checks pass: typecheck,25 unit tests, production build and3/3 browser tests in16.2s. The same three browser tests also passed three consecutive runs (9/9 in45.5s), with retries disabled. See docs/FEATURE-AUDIT.md and fresh evidence files for final results, fixture distinctions and provider limitations.
- Historical audit surfaced12 affected packages. Reviewed overrides now reduce this to4 high findings propagating one nested Zod advisory; see docs/DEPENDENCY-REVIEW.md. No incompatible forced override retained.

## Final improvement verification

Frozen-source typecheck,51 unit tests, production build and3/3 critical browser tests passed; repeat-each3 passed9/9 with retries disabled. Current starter reaches victory withfloat0 and the early Practice encounter reaches Lantern terrace. Desktop/narrow production passes had0 page/console/network errors and no horizontal overflow. Live checked-agent preview/Apply/replay succeeded; bounded-search exhaustion also returned safely without mutation. Current audit has4 high findings tied to one nested advisory,0critical/moderate/low. See docs/VERIFICATION.md for recording metadata and evidence boundaries.

Final demo:1440×900,158.16s(2:38), actual UI/liveGemini/original teaching encounter/checkedpreview/runtimeinputreplay/Undo. Chromium decode verified. Silent/captioned; includes an honest bounded-agent failure and successful specific follow-up. See docs/VERIFICATION.md. Owner testing and public Clips steps remain yours.

## Remaining issues follow-up — verified

- Rechecked current registry/advisory and Agent-Native/AG-UI exports. Compatible upstream versions still retain the nested Zod advisory; do not force a breaking major upgrade to remove an audit count.
- [x] Add bounded, mechanically checked step options as a shared read-only Agent-Native capability. Give the genuine model those options, without replacing model output or committing speculative terrain.
- [x] Expose the same mechanical option tool directly, with clear non-AI labeling, preview/Apply/Undo, revision and lock enforcement.
- [x] Improve exhausted-search retry and checked-preview feedback; verify live requests separately from fixtures.
- [x] Run final typecheck, unit/browser regressions, build, dependency audit and current rendered-app inspection. Group testing remains waived; no publication or submission is authorized.

Follow-up result:58 unit tests/11 files, typecheck and production build pass. Extended3-path browser pass plus9/9 repeated passes succeeded without retries. Three completed genuine Gemini contexts each chose a checked step in one model request and replayed it in the runtime. Direct mechanical preview/Discard/Apply/Undo makes0 model calls. Final desktop/narrow captures have no horizontal overflow or page/console/network errors. Local preview3031 restarted with the current API and build.

New local actual-app recording: `output/playwright/wonderbox-checked-step-release.webm`,120.24s,1440×900, Chromium decoded atreadyState4. Two real requests each used one model proposal; actual float/throw/bounce, current manual-state preservation, terrain preview/check/Apply/replay and Undo completed with0 page/HTTP errors. Silent/captioned, no fixtures or runtime injection.

The nested Zod advisory remains upstream-dependent. New `check:dependencies` fails on findings outside its precise, visibly reported exception. Group testing remains waived. Public Clips publication, legal terms, submission and hosting access control remain separate user steps.

## Deferred usability testing kit

The user's scheduling clarification is recorded: prepare the kit; testing happens later. `docs/USABILITY-TEST-KIT.md` now contains session setup, neutral tasks, an observation sheet and a results/fix template. The solo owner checklist remains available. No recruitment, sessions, consent, recordings or human findings are claimed; testing is deferred and is not reinstated as an engineering completion gate.

## GitHub and Vercel release setup — in progress

User authorized repository setup and Vercel publication. Authenticated GitHub/Vercel identity: timothynice. Adding CDN/frontend + shared serverless API routing, server-side provider settings, a memory-only shared AI access code, and GitHub CI. No Clips publication, competition submission or legal acceptance is included. Local machine instructions and generated evidence/recordings remain outside the repository. Deployment and hosted verification results follow after checks.

## GitHub and Vercel — completed

- Repository: https://github.com/timothynice/wonderbox (public, owned by timothynice). Production: https://wonderbox-three.vercel.app. Main pushes deploy automatically through the connected Vercel Git integration. Vercel project uses Node24.
- Server-side Gemini key and shared AI access code configured as secrets for Production/Preview. Public direct creation remains usable; credentialed AI calls require the code. Hosted AI fails closed when code configuration is absent. Code is memory-only in the browser; owner copy is in ignored `.vercel/ai-access-code` with mode0600. Never commit or publicly share it.
-59unit tests/12files, typecheck, build, dependency policy and3/3 local browser paths pass. Canvas fallback3/3 also passes. GitHub CI run41551391561 passed all gates on Linux with retries disabled. Linux uses the production Canvas fallback to avoid GPU emulation; local default and hosted checks retain WebGL. Checkpoint inputs now wait for landing before crossing the flag.
- Hosted keyboard/pause/runtime separation, manual float/reload, genuine Gemini float edit/Undo, terrain painting/Undo, placement/duplicate/delete/Undo, typing isolation, export/import/reload/invalid rollback all verified. Hosted desktop/narrow screenshots inspected; no horizontal overflow. Unauthorized AI401 and foreign-origin mutation403 verified.
- Native Node ESM imports corrected after detecting the first deployment's function startup failure. Earlier failing/obsolete CI/deployments remain history, not passing evidence. Local CLI callback trailing semicolons adjusted for the current runner parser.
- Known nested-Zod advisory remains:4high package findings, no new findings. Public Clips, owner testing and final competition submission/terms remain user steps. No competition entry submitted.

## Artwork, phone play and demo expansion — release verification

User authorized priorities1–3 and specialist agents. Build richer shared original artwork customization (theme, terrain, palette/exact colors, silhouette, patterns/accessories), compose through canonical validated actions and AI previews without changing collision geometry; add unlisted QR/link player with touch controls and explicitly sent revision snapshots; improve actual-app demo. No accounts/native app or arbitrary image/code generation in this slice.

- [x] Shared appearance schema/default migration/patches/locks/preview plus genuine model grammar/context.
- [x] Original procedural rendering, calm inspector/art-direction controls, safe resume.
- [x] Durable phone snapshot sharing with separate owner token, expiry/revocation, update prompt, mobile player/touch.
- [x] Unit/browser checks, demo materials and deployment/hosted verification. Live artwork check remains access-blocked (provider credits), explicitly documented.

Private Vercel Blob store provisioned and linked to existing Hobby project for authored snapshots; no upgrade or public bucket. Existing content retained. Secrets remain server-only. New Blob SDK dependency exposed a patched same-line CLI-config update; verify audit returns only existing reviewed upstream advisory. Local share files will be ignored; private owner tokens never appear in the QR link or public project JSON.

Implementation complete: shared original art with six palettes/exact independent colors, three silhouettes/patterns and four accessories; four world themes/three terrain finishes/density/light; preserved runtime/hitboxes; inspector and art-direction dialog. Phone links have7day expiry, independent owner capability, private durable storage, atomic CAS, revoke and explicit version/restart. Local filesystem alternative is durable on a single Node host. No accounts/native app/arbitrary generated imagery.

Current checks:72 unit tests/15files, typecheck/build/dependency policy pass; expanded exactly3 browser paths passed WebGL and Canvas with retries disabled. Actual private Blob roundtrip/CAS/revoke passed after fixing compressed weakETags without weakening concurrency. Genuine new AI artwork remains blocked by providerHTTP402 depleted credits; pending owner credential/credit response. Manual demo capture and final deployment/hosted check in progress. Physical-device/Safari and group testing remain owner followups.

Final frozen-source repeat: the same three browser tests passed9/9 across three runs (2.2min), retries disabled. Secret comparison across95 repository/source files and built assets found0 credential matches; `git diff --check` clean. Hosted expansion verification follows deployment.

Hosted expansion0b36c74 verified at https://wonderbox-three.vercel.app: actual entity palette/scarf and world theme/terrain edits, preserved paused runtime/geometry, Undo; private durable QR snapshot in a separate mobile browser context, touch movement, version2 send, unchanged paused run until explicit restart, revoke/fresh404, reload.0 page exceptions; desktop console had0 errors/warnings (Chrome informational form DOM notices only). Fresh revoked-link404 was expected. Test link revoked. GitHub CI41947971438 passed and Vercel deploymentReady. No new hosted live AI request is claimed.

New manual feature highlight: `output/playwright/art-phone-manual-demo.webm`,126.709s (2:07),1440×900,24fps,VP9,silent (~2.91MB). Actual UI on the original starter shows artwork/float landing/world mood/QR/two-finger responsive-browser play/explicit version2 restart. No model calls, fixtures or runtime injection. It omits Undo and physical-phone/live-AI proof; the final10second held frame explicitly says so. Raw provenance and harness failures are retained in `art-phone-manual-evidence.json`; no application failure is hidden as a passing assertion. Root inspected the final frame. The existing earlier actual live-AI recording remains separate. Capture links removed locally; no Clips publication.

Release status: priorities1–3 implemented, tested and deployed. Remaining access-dependent verification: restore provider credits for genuine artwork request and final live artwork/behavior demo; owner physical-phone/Safari and deferred usability sessions; public Clips, terms and submission. No new hosted URL invented, no competition entry submitted.

## Restored live artwork verification — November4,2026

Owner restored provider access. Hosted genuine Gemini2.5Flash passed focused lavender/scarf/spots plus float0.8, actual held-jump rise over160px, authored/runtime separation, broad autumn/crystal preview before Apply, locked Pip/terrain preservation, standalone moonlight, manually edited #456abc/float0.8 read-only context, and Undo restoring original art/behavior. No canned provider or authored fixture. Two combined world requests omitted atmosphere despite claiming moonlight; both were undone and a separate genuine lighting request succeeded. This limitation remains explicit; the earlier HTTP402 blocker is resolved. Sanitized responses and evidence: `docs/evidence/live-artwork-verification.json`. Existing manual recording stays labeled manual; a new live artwork recording/public Clips, physical-phone/Safari and deferred human sessions remain separate steps. Only documentation/evidence changed in this follow-up; the previously passing72-unit and three-path regression source is unchanged.
