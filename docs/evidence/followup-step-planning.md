# Checked step planning follow-up

Verified November1,2026 local / November2 UTC. The change addresses repeated geometric guesses without substituting canned AI responses.

`plan-static-step` is an actual read-only Agent-Native action. It derives candidate positions from the selected terrain and player dimensions, checks at most24 additive placements using production movement/collisions, and returns at most3 passing options with previews and input witnesses. It changes no authored state. It does not cover arbitrary terrain construction, dynamic encounters or human difficulty.

Both the editor's **Preview a checked step** and the live agent call that capability. The editor labels the deterministic result **Mechanical tool preview / no AI request**. The agent receives the mechanically verified options in its model context; the genuine model must still return structured actions, which are independently previewed/checked. Provider failure, empty output, invalid actions and exhausted search never commit a tool option automatically. Apply recomputes the exact candidate and preserves character/source/target/world constraints, locks and revision checks.

## Live actual-app checks

Three completed genuine Gemini2.5 Flash cases each used one proposal request and passed preview→Apply→actual-runtime witness replay→Undo:

- Original Moonlight Garden.
- Manual Mossling patrol-speed edit to35 before the request; agent preserved it.
- Player locked before the request; full entity list remained unchanged.

Sources: [original and manual-patrol runs](followup-live-step-planning.json), [locked-player run](followup-live-step-planning-locked.json). Each uses actual UI controls with fresh browser storage; read-only getters observe results. No provider fixture, authored fixture import or runtime injection was used. An initial locked-player setup attempt used Playwright's synchronous checkbox `.check()`, which rejected the asynchronously saved control; that attempt is retained in the first artifact and made no model request. The rerun uses click plus canonical-state polling and passed. These three successful requests are evidence, not a reliability percentage or guaranteed future provider availability.

The new local video is `output/playwright/wonderbox-checked-step-release.webm`; final duration/decoding is recorded in VERIFICATION.md. It retains actual requests, checked terrain, scripted-input replay labeling, original float/throw/spring play and Undo. Prior videos remain historical evidence of the previous implementation, including its bounded-budget failure.

## Deterministic regression checks

The three production-browser tests now also exercise exhausted-search Retry without mutation; mechanical preview/Discard/Apply/Undo; zero model requests for the direct tool; and the existing checked-agent/replay path. Unit cases verify bounded/pure options, unchanged locked entities, Apply-time stale rejection, exact production input replay, renamed/translated content, unsupported dynamics and already satisfied goals. A model-fixture unit test verifies the option context is supplied; the existing exhaustion test verifies no tool option silently replaces failed model output.

Desktop1440×900 and narrow390×844 manual-tool captures have no horizontal overflow, page/console/network errors or model requests. The preview opens at its heading/diff; the introductory panel copy collapses during work to leave review space. Screenshots and machine-readable layout report are in `output/playwright/followup-mechanical-*` and `output/testing/followup-layout.json`.
