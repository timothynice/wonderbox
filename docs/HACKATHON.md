# Wonderbox — project description

**Imagine it. Make it. Play it.**

Wonderbox turns a playable world into a conversation between a person and an AI creative partner. Explore the original Moonlight Garden as Pip, a small garden dreamer. Pause, choose something, and change it directly or describe what you imagine. Give Pip a short float, turn a plant into a throwable tool, transform a creature into a springboard, or make shy creatures retreat from a portable lantern. Resume immediately and feel the result.

The innovation is a shared game capability model: the UI and the agent operate on the same typed components through an Agent-Native `defineAction` transaction. Model output changes actual physics and interactions; it cannot generate executable code. Every proposal is validated against parameter bounds, object locks, and the current revision. Focused changes apply as one undoable step; broad edits receive a preview. Authored worlds remain separate from play state and can be saved locally or exchanged as versioned JSON.

For a selected ledge, ask “Make this reachable without changing my character.” Shared Agent-Native capabilities inspect the current world, preview bounded terrain actions and check candidates using the production movement code. The genuine agent can revise a failed proposal before offering Apply. A trajectory and named differences explain the result; Apply checks the exact candidate again. A labeled scripted-input replay demonstrates the returned route in the real runtime. Static checking is bounded and does not claim arbitrary solvability or human usability. Safe behavior edits preserve the paused run, while structural changes explain their restart.

Compound requests receive independent typed requirements before actions are proposed. Shared capabilities check every requested field/count, reject unrelated changes, and allow one bounded repair. The maker sees actual before/after differences; success summaries are computed from validated changes rather than trusting model prose. Read-only answers take values from current authored state, including manual edits. Interpretation remains probabilistic; the contract verifies bounded requirements, not arbitrary natural-language semantics.

Artwork is editable game data too. Curated original color palettes, custom primary/accent colors, creature silhouettes, patterns and accessories work through the same validated mutations as gameplay rules. Garden, autumn, candy and aurora art directions can change scenery, terrain finish, foliage and background stars while retaining collision geometry. The feature customizes original procedural art; it does not claim arbitrary image or sprite-sheet generation.

A QR code or unlisted play link takes an authored snapshot to a clean phone player with touch movement, held jump and pick/throw controls. Creators explicitly send later versions; players choose when to restart into them, preserving the current run until then. Share links expire and can be revoked. The experience needs no player account or App Store install and does not expose the creative partner's credentials or editor update permission. This is versioned playtesting, not multiplayer or account synchronization.

Built with TypeScript, React, Phaser and Agent-Native. All character, world art, layout, procedural sounds, starter content, and application code were created for this project in the initially empty workspace. See ATTRIBUTION.md for third-party libraries and font licenses. No Nintendo assets, music, characters, or level layouts are included.

## Requirements verified November 1, 2026

Official sources:
- https://www.builder.io/hackathon
- https://www.builder.io/hackathon/rules
- https://www.agent-native.com/docs/
- https://www.agent-native.com/docs/actions-defining/

Deadline: November 9, 2026, 11:59 PM Pacific (November 10, 07:59 UTC). Judging: usefulness/execution40%; creativity/design20%; innovation20%; cleverness/use of Agent-Native20%.

A working Agent-Native application and a **public Clips recording of the actual application**, viewable without login or access request, are required. Submission also requires project/creator/contact details, pre-existing-work disclosure, rules acceptance, eligibility confirmation, and confirmation of receipt. A public repository or hosted app is encouraged, not mandatory.

## Human completion steps

1. Review the project and verification limitations.
2. Record/publish the final actual-app demo in Clips: https://clips.agent-native.com . A local evidence video does not itself satisfy the public Clips requirement.
3. Verify the public clip in a signed-out browser; copy its URL.
4. Supply creator/team and contact information in the linked official form, review/accept terms and confirm eligibility personally, submit before the deadline, and retain receipt.

No entry has been submitted, public recording published, or terms accepted by the agent.

## Artwork and phone release evidence boundary

The new shared appearance boundary, procedural rendering and phone player are implemented and subject to the release verification summary. During implementation, a new genuine artwork-agent request received an HTTP402 credit/billing response; no live artwork success is claimed from that attempt. Earlier real-model gameplay and checked-terrain evidence remains historical evidence of those capabilities. The final showcase script in DEMO.md explicitly separates a future live take from a manual-controls take. Touch browser automation is not a physical-device usability study. Public Clips publication and submission are still outstanding human actions.

### Manual artwork and phone showcase

A new local actual-app highlight is available at `output/playwright/art-phone-manual-demo.webm` (2:07, silent captions), with evidence in `output/playwright/art-phone-manual-evidence.json`. It shows direct artwork/behavior controls, a keyboard float landing, QR sharing, responsive touch play and explicit version delivery. It makes no model calls and does not establish live AI artwork or physical-phone testing; Undo is omitted and the final frame is explicitly held. It is not a public Clips upload. See `docs/DEMO.md` for capture provenance and the full planned showcase.

## Restored live artwork verification — November4,2026

Owner restored provider access. Hosted genuine Gemini2.5Flash passed focused lavender/scarf/spots plus float0.8, actual held-jump rise over160px, authored/runtime separation, broad autumn/crystal preview before Apply, locked Pip/terrain preservation, standalone moonlight, manually edited #456abc/float0.8 read-only context, and Undo restoring original art/behavior. No canned provider or authored fixture. Two combined world requests omitted atmosphere despite claiming moonlight; both were undone and a separate genuine lighting request succeeded. This limitation remains explicit; the earlier HTTP402 blocker is resolved. Sanitized responses and evidence: `docs/evidence/live-artwork-verification.json`. Existing manual recording stays labeled manual; a new live artwork recording/public Clips, physical-phone/Safari and deferred human sessions remain separate steps. Only documentation/evidence changed in this follow-up; the previously passing72-unit and three-path regression source is unchanged.


## Current submission evidence

The restored-credit blocker is resolved. Complete autumn/moonlight/crystal and combined character artwork/float requests now pass genuine model checks; independent request-contract verification and canonical summaries address the earlier omissions.82unit tests, typecheck/build and the existing3browser paths pass. A fresh 2:47 narrated actual-app walkthrough is ready, with retained raw takes, manual-state readback, request verification, actual keyboardfloat play, checkedterrain preview/Apply/runtime replay and Undo. Follow [CLIPS-GUIDE.md](CLIPS-GUIDE.md) to upload the MP4 and verify explicit public sharing; neither the local artifact nor Vercel publication substitutes for the required public Clips URL. Physical-phone/Safari and deferred human studies remain owner checks.
