# Release verification

Verified November 1, 2026 on this Mac with Node 26.10.0, npm 11.19.1 and Chromium via Playwright. Evidence consists of actual controls, read-only state assertions, screenshots, decoded recordings, provider requests and automated tests. No human play-study claims are made.

## Latest follow-up: checked step planning

The agent now receives bounded, mechanically verified step options from an additional read-only Agent-Native capability; it still makes genuine model requests and validates actual model output. The same tool is directly available without AI and is clearly labeled. Exhausted searches offer Retry; checked previews replace the stale baseline status and open at their heading for review. [Implementation and live evidence](evidence/followup-step-planning.md).

Current unit count: **58 tests /11 files**. The three browser paths additionally cover exhausted-search Retry and direct mechanical preview/Discard/Apply/Undo with zero model calls. Dependency API compatibility and the narrow audit exception are protected separately. `npm run check:dependencies` visibly reports the remaining four high findings and fails on new findings; it does not claim a clean audit. Current upstream framework versions still require the incompatible AG-UI/Zod migration described in [dependency review](DEPENDENCY-REVIEW.md).

Three completed live Gemini cases—original, manual patrol change and locked player—each returned a passing proposal with one model request, then reached the ledge via actual-runtime input replay and undid cleanly. An initial automation-only checkbox setup failure is retained and distinguished in the evidence. This small sample is not a success-rate claim.

Earlier sections retain historical evidence and earlier counts. Final follow-up test/recording results appear at the end.

## Current improvement release

The judging-feedback changes add safe in-place behavior/atmosphere reconciliation; readable pure previews and ghost geometry; explicit Retry; shared Agent-Native inspection, preview and static route-check capabilities; a genuine bounded propose/check loop; Apply-time rechecking; and labeled input replay through the actual Phaser runtime. Player/source/target/gravity constraints enforce the unchanged-character terrain promise.

**51 unit tests across 8 files** protect shared actions/history/import/persistence, impact classification, preview purity, bounded movement/checking, agent capabilities and dependency API compatibility. The same three production-browser tests now cover safe resume, preview/Discard/stale invalidation, retry and checked-route replay as well as their original critical paths. Deterministic test-provider evidence remains separate from live Gemini evidence.

Actual live inspect→propose→check→Apply evidence (including a rejected first candidate and successful second candidate) is in [phase3 capabilities](evidence/phase3-agent-capabilities.md). Current starter keyboard completion and the new Practice puff throw/spring encounter are in [runtime improvement evidence](evidence/improvement-runtime.md). Current desktop1440×900 and narrow390×844 screenshots are `output/playwright/improved-layout-1440.png` and `improved-layout-390.png`: no horizontal overflow, zero page/console/network errors on fresh production load/pause, reduced-motion setting enabled. Desktop fits900px; narrow content scrolls vertically. Local results: `output/testing/improved-layout.json`.

Reviewed dependency overrides reduce12 affected packages to4 high findings propagating one nested Zod advisory. Critical/moderate/low findings are now zero. An incompatible AG-UI override was tested and reverted; [dependency review](DEPENDENCY-REVIEW.md) records remaining exposure and upstream requirements. This is not a vulnerability-free claim.

Group testing is explicitly waived by the user. [Owner self-test checklist](PLAYTEST-CHECKLIST.md) is ready for testing after delivery. No human study results are claimed.

Earlier verification below is historical baseline evidence; its test counts, restart semantics, dependency counts and recording resolution are superseded above and by the final release notes below.

## Follow-up regression audit

A fresh audit added **three repeatable production-browser tests** via `npm run test:critical`, alongside the existing25 unit tests. It also rechecked original-starter victory and all runtime/editor mechanic groups. Two fixes were made: removed checkpoints no longer survive as stale runtime references, and Gemini uses a compact constrained JSON grammar to reduce malformed combined-edit output. Live availability failures remain visible and safe. [Feature audit and exact rerun instructions](FEATURE-AUDIT.md) records current coverage, fixture boundaries and dependency advisories. Earlier release evidence below is retained as historical context.

## Automated checks

`npm run typecheck`, `npm test`, and `npm run build` pass. The final test suite has **25 tests across 3 files**:

| Suite | Count | Protected behavior |
|---|---:|---|
| Shared project/actions/history | 10 | Versioned imports, strict shape, unique IDs/bounds/singletons, atomic rollback, partial edits preserving siblings, AI lock enforcement including ID bypasses, monotonic revisions, undo/redo, persistence round trip |
| AI and HTTP boundary | 12 | Real Agent-Native action execution, structured proposals, mandatory broad Apply, locked edits, stale revision boundary, unsupported requests, missing credentials, bad input/output, quota/network/timeout errors, OpenAI transport, explicit503 model fallback |
| Production physics helpers | 3 | Stable terrain landing, side collision, moving-platform top crossing |

The build succeeds with two harmless warnings about upstream Zod comment annotations. Output is approximately 1.58MB JavaScript / 446 KB gzip plus 17 KB CSS. No secrets are included in the client bundle. The application uses the inherited server Gemini key; no credential is stored in project files or exports.

## Actual browser checks

| Check | Result / evidence |
|---|---|
| Baseline game | No-float original world reached victory through keyboard movement/jumps, all 3 stars and checkpoint. Death/recovery exercised. `output/playwright/runtime-victory.png` |
| Integrated live AI signature | Actual starter, live Gemini 2.5 six-action preview + Apply, float ledge, newly throwable Turnip, actual Mossling transformation/bounce onto actual side perch, lantern retreat,3 stars and victory. Authored spawn unchanged. `live-ai-actual-bounce.png`, `live-ai-actual-victory.png` |
| Moving platform | Keyboard rider retained exact horizontal offset 14.2031404 before/after 700 ms, grounded both times; actual runtime, isolated imported fixture |
| Mechanics isolation | Float ledge, thrown collision/transformation, sustained spring velocity and side-perch landing, lantern carry/fear tested with explicitly identified imported fixtures before the actual-starter integration run |
| Direct editor | Terrain painting/undo, object placement, duplicate, delete/undo; regression confirms click-select does not create a move. `scripts/browser-editor-check.js` |
| Live AI controls | Locked player did not mutate; broad star/gate proposal left state untouched until Apply; exact gate requirement 3 applied; slow live response rejected after manual atmosphere edit. `scripts/browser-ai-check.js` |
| Shared current state | Undo AI transaction, manual float adjustment to 1.2, live agent correctly reports 1.2 with no actions. Integrated run separately repeated this at 0.4. `scripts/browser-context-check.js`, `live-ai-manual-context.png` |
| Persistence | Downloaded JSON, edited world, imported downloaded file, restored exact authored values, reloaded same revision; version99 import rejected without mutation. `scripts/browser-persistence-check.js` |
| Keyboard focus | Typing A/D/E/Space in the composer did not move Pip. Held keys also clear when a form has focus |
| Desktop |1440×900 viewport/document dimensions match; canvas 1002×456; game/status/settings/footer fit without page scrolling. `release-final-desktop.png`, `release-final-moonlight-edit.png` |
| Narrow layout |390×844 viewport, document width 390, canvas 312×328; no horizontal overflow. `mobile-layout.png` |
| Production console/network | Fresh production-served load plus manual moonlight edit and selection: zero page/console errors, failed requests, or HTTP errors |
| Frame cadence sample |120 rAF callbacks in local headless Chromium: mean 16.66ms, p95 ~16.8ms. This is a short environment-specific cadence sample, not full profiling or input latency evidence |

Screenshots and recordings are in `output/playwright/`, retained locally rather than checked into source. Browser callbacks and reproduction instructions are in `scripts/`. Detailed keyboard coordinates and fixture distinctions are in [RUNTIME-VERIFICATION.md](RUNTIME-VERIFICATION.md). Gameplay hypotheses and evidence limits are in [GAMEPLAY.md](GAMEPLAY.md).

## Provider evidence

Actual request/response records are retained in [evidence/live-ai.json](evidence/live-ai.json), with earlier model results in `live-ai-3.5.json`. All seven final Gemini 2.5 requests succeeded in that sequential provider pass: float, throwable, transformation, moonlight/light fear, stars/gate, easier-jump terrain, and unsupported multiplayer. The browser separately verifies the real edit/apply behavior, locks and stale handling.

Gemini 3.5 produced repeated temporary503s during UI testing, so the stable default is 2.5. A later 2.5 state-reading request also got 503; it left the project unchanged, showed retry guidance, and succeeded on manual retry. The recording preserves this failure and recovery. Provider availability is not guaranteed; no canned response ever substituted for a failed model call. OpenAI-compatible transport is mocked in tests, not verified live.

## Recording verification

- `wonderbox-live-signature.webm`: 250.56s, 800×600; Chromium decoded it (`readyState4`). Actual application, original starter, live AI, real keyboard inputs; no runtime state injection.
- `wonderbox-demo-1.5x.webm`: 165.44s, 590×600, decoded in Chromium (`readyState4`). Same entire recording, unused right edge cropped and timestamps scaled to 66%. Silent/time-compressed engineering overview; original retained.

A higher-resolution public Clips capture is still needed for final submission. Neither local video is a public Clips URL. [DEMO.md](DEMO.md) has the two-to-three-minute narration/action script and exact publication sequence.

## Material limitations

Desktop keyboard/mouse creation is the release target. Responsive layout is usable, but touch gameplay controls, remapping/gamepad and a screen-reader gameplay equivalent are not included. Data is local to a browser; history/chat are session-local. Schema-valid user-authored levels may be unsolvable or place objects in collision. There is no account system, cloud sync, cross-tab coordination or credentialed public deployment protection. A hosted release requires access control around the server. No uncoached human study establishes enjoyment, novice completion or universal accessibility.

No configured deployment target existed. Local dev preview and production server were both verified; README provides deployment steps. Public Clips publication, legal acceptance, eligibility and hackathon submission remain user steps. Nothing was submitted or published on the user's behalf.

## Final improvement release gates

On November1,2026 local time (November2 UTC), final frozen-source checks passed:

- `npm run typecheck`
- `npm test`:51/51 tests,8 files
- `npm run test:critical`: production build plus3/3 browser paths,20.3s
- `npx playwright test --repeat-each=3`:9/9, about1 minute, retries disabled
- Fresh production audit:0 critical,4 high,0 moderate/low; retained report `output/testing/improvement-final-audit.json`
- Inherited provider-key comparison across44 source/documentation/built files:0 matches; no credential values printed. Local Markdown link check:0 broken links.

Build output is about1.61MB JavaScript /455KB gzip and20.7KB CSS; two harmless upstream Zod comment-annotation warnings remain. Current local production preview is http://127.0.0.1:3031 (the normal documented default remains3001). No hosted deployment is configured.

The live checked-agent workflow is probabilistic: one recording attempt exhausted three genuine model candidates and prepared no transaction. That truthful failure is retained in `output/playwright/improved-live-exhausted-budget.json` and its video. A subsequent complete live run succeeded with two user requests, no HTTP/page errors, and actual-runtime witness replay. The52.68s,1440×900 highlight (`wonderbox-improved-live-highlight.webm`) decoded in Chromium at readyState4. It shows the actual UI, real Gemini, safe resume, float landing, unchanged-character terrain preview/check/Apply, manual-context preservation, runtime replay and Undo. No project fixture or runtime injection was used. Captions identify the scripted-input replay. Its companion evidence is `improved-live-highlight-evidence.json`.

Local Voicebox0.5.0 was found, but its local API did not become available after launch; no narration was generated and system speech was not substituted. Recordings are silent and captioned. The owner can record the approved Heart narration later if desired. Public Clips publication and signed-out link validation remain user steps.

### Final full-resolution rehearsal

`output/playwright/wonderbox-improved-live-uncut.webm`: **158.16s (2:38),1440×900**, decoded by Chromium at readyState4. Companion `improved-live-evidence.json` records0 page errors,0 HTTP errors, real Gemini responses, unchanged paused state and successful actual-runtime witness replay. Captured pickup/throw/Practice transformation/bounce to Lantern terrace, live float landing, manual patrol edit, checked preview/Apply and Undo. No authored fixture or runtime injection was used.

This uncut take honestly includes a bounded three-candidate failure with no mutation, followed by a more specific user-authored terrain request that succeeds. It must not be described as autonomous first-attempt success. The earlier52.68s highlight separately shows a successful general request. Neither is public or narrated. The original longer full-signature victory remains historical baseline evidence.

## Final remaining-issues follow-up gates

- Frozen-source `npm run typecheck`,58 unit tests/11 files, production build and3/3 critical browser flows passed. The same3 flows passed9/9 repeated runs with retries disabled.
- Fresh `npm run check:dependencies` passed the narrow reviewed policy and explicitly reported4 remaining high findings; this is not a clean-audit claim. JSON parser/body-size boundary tests passed.
- Genuine Gemini2.5 Flash: three completed world/manual-edit/locked-player cases each returned a passing proposal in one model request, applied/replayed/undid in the actual app. Evidence: [follow-up report](evidence/followup-step-planning.md).
- Current desktop1440×900 and narrow390×844 mechanical-tool captures:0 page/console/network errors,0 model requests, no horizontal overflow, authored state unchanged before Apply. Preview heading/diff is initially visible; intro copy collapses while reviewing.
- New uncut recording: `output/playwright/wonderbox-checked-step-release.webm`, **120.24s,1440×900**, Chromium readyState4. Companion `followup-live-evidence.json`:0 page/HTTP errors; two actual Gemini requests each used one model proposal; successful runtime route replay. It includes genuine float editing/landing, Practice pickup/throw/transformation/bounce, Undo, a manual patrol change, checked terrain preview/Apply, current-state preservation, replay and Undo. Captioned/silent; no model fixture, authored-fixture import or runtime injection. Its capture precedes only the final panel-intro space adjustment, which is separately browser-tested.

The previous2:38 take documents the earlier failed-budget workflow and remains historical evidence. The new2:00 take demonstrates the mechanically grounded planning revision. Neither is publicly published. Provider uncertainty, bounded static-search limits and the upstream dependency advisory remain explicit; no human study or guaranteed AI success is claimed.

## Hosted release verification

GitHub: https://github.com/timothynice/wonderbox. Production: https://wonderbox-three.vercel.app. Git integration deploys main automatically. Both accounts verified as timothynice. Vite CDN + one Node24 Express function; native ESM imports fixed after the first function startup failed.

Current production returned health200/configuredGemini2.5Flash. Chromium actual-UI smoke verified keyboard movement/jump/pause, runtime/authored separation, manual float edit and reload persistence, genuine hosted Gemini float0.8 edit and Undo to0.4. Desktop1440×900 and narrow390×844 screenshots inspected; narrow has no horizontal overflow. Smoke had0page exceptions/HTTP errors, and fresh console check0errors/warnings. Unauthorized agentPOST401 and wrong-origin actionPOST403. Shared AI access code stays in browser memory and Vercel server secrets; no provider key is exposed. No Clips publication or competition submission occurred.

Local59unit tests/12files, typecheck, build and3critical browser paths pass after the native-ESM correction. GitHub CI run41551391561 passed all gates, including3/3 browser paths on the production Canvas fallback with retries disabled. The initial GPU-free Linux run exposed airborne checkpoint overshoot and exceeded the third flow's duration; it is retained as failing history. Corrected route waits for landing before crossing the checkpoint. Local Canvas fallback3/3 also passed.

Additional hosted direct-editor checks passed terrain painting/Undo, object placement/duplicate/delete/Undo and typing isolation; hosted persistence checks passed export/download, validated import round trip, reload and invalid-import rollback. Callback parser compatibility was fixed by removing trailing function-expression semicolons; no application workaround was needed.

## Artwork and phone expansion — November4,2026

- Typecheck,72 unit tests/15 files and production build pass. Dependency gate retains only the4 previously reviewed high package findings; no new advisory introduced. Blob’s CLI-config dependency is overridden to compatible patched0.3.6.
- Expanded exactly3 critical browser tests pass defaultWebGL3/3 (33.9s) and Canvas3/3 (47.5s), retries disabled. Coverage now includes appearance/exact-color editing, Undo/redo/reload/import; labeled AI-art fixtures with preview/locks/current context; QR and separate mobile browser context, actual multitouch movement/jump/pickup/throw, pause, explicit version sending/restart and revocation. Fixture results are not live AI evidence.
- Actual private Vercel Blob probe passed create/read/update/stale-ETag conflict/revoke. Testing uncovered compressed GET weak ETags breaking conditional writes; identity-encoding reads now preserve the exact strong storage ETag atomically with the body. Weak markers fail closed. Unit regression protects this boundary.
- Actual rendered desktop art-direction dialog and QR/player screens inspected. Touch-emulated Chromium tested portrait390×844 and landscape844×390, with no overflow/page exceptions or authored-state mutation. This is not physical-device/Safari or human play-study evidence.
- Live Gemini artwork attempt is currently blocked by HTTP402 depleted credits. Nothing applied; schema/grammar/error handling and labeled fixtures pass. Direct art editing and phone sharing require no model account.

Screenshots: `output/playwright/art-direction-polished.png`, `art-runtime-autumn.png`, `phone-share-dialog.png`, `phone-touch-portrait.png`, `phone-touch-landscape.png`. Group testing remains deferred. Clips publication and legal/submission steps remain with the user.

Final frozen-source repeat: the same three browser tests passed9/9 across three runs (2.2min), retries disabled. Secret comparison across95 repository/source files and built assets found0 credential matches; `git diff --check` clean. Hosted expansion verification follows deployment.

Hosted expansion0b36c74 verified at https://wonderbox-three.vercel.app: actual entity palette/scarf and world theme/terrain edits, preserved paused runtime/geometry, Undo; private durable QR snapshot in a separate mobile browser context, touch movement, version2 send, unchanged paused run until explicit restart, revoke/fresh404, reload.0 page exceptions; desktop console had0 errors/warnings (Chrome informational form DOM notices only). Fresh revoked-link404 was expected. Test link revoked. GitHub CI41947971438 passed and Vercel deploymentReady. No new hosted live AI request is claimed.

New manual feature highlight: `output/playwright/art-phone-manual-demo.webm`,126.709s (2:07),1440×900,24fps,VP9,silent (~2.91MB). Actual UI on the original starter shows artwork/float landing/world mood/QR/two-finger responsive-browser play/explicit version2 restart. No model calls, fixtures or runtime injection. It omits Undo and physical-phone/live-AI proof; the final10second held frame explicitly says so. Raw provenance and harness failures are retained in `art-phone-manual-evidence.json`; no application failure is hidden as a passing assertion. Root inspected the final frame. The existing earlier actual live-AI recording remains separate. Capture links removed locally; no Clips publication.

Release status: priorities1–3 implemented, tested and deployed. Remaining access-dependent verification: restore provider credits for genuine artwork request and final live artwork/behavior demo; owner physical-phone/Safari and deferred usability sessions; public Clips, terms and submission. No new hosted URL invented, no competition entry submitted.
