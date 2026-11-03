# Wonderbox usability session kit

Status: prepared for later use. No sessions or participant results are recorded. This kit does not make group testing a release requirement; the owner can start with the separate [solo checklist](PLAYTEST-CHECKLIST.md).

## Purpose and setup

Observe whether someone can discover play, change a playable rule, understand the result, and retain control. Allow about20 minutes per session. Desktop keyboard/mouse is the intended creation experience. Note platformer and level-editor familiarity so different experience levels are distinguishable.

Use a disposable browser profile/project. Export personal work first, confirm the server and live AI are configured, and reset Moonlight Garden through the app's confirmation. Explain that AI calls use the configured provider. Keep secrets and unrelated tabs out of view. Ask permission before recording or retaining identifiable quotations; notes without names are sufficient. Participants can stop at any time.

Opening script: “We’re testing the application. Please say what you expect and what seems unclear. I’ll mostly watch; ask for help whenever you need it.”

## Tasks

Present one at a time. Do not explain the controls or demonstrate the solution beforehand. Start a timer when the task is presented. Give help if requested, recording when and what help was needed.

| Task | Neutral prompt | Observe |
|---|---|---|
| Discover play | Explore the garden and work out its goal. Try interacting with something you find. | Movement/jump discovery, star goal, recognition of throwable objects, pickup/throw confusion and recovery. Allow4 minutes; full victory is optional here. |
| Make a direct edit | Change something in the world directly, then play to see what happened. | Finding Edit, selection, inspector or terrain tools, meaningful authored change, and returning to play. Record time to first successful change. |
| Change behavior with AI | Ask the creative partner to change how something plays, then try the result. | Choosing a supported request, selection/context, provider wait/error interpretation, preview review and Apply where required. Distinguish model/provider failures from interface confusion. |
| Explain and undo | Explain what changed and what stayed the same. Restore the earlier version. | Whether the explanation matches authored changes, discovery of Undo, and whether Undo restores the intended edit. Ask before coaching. |
| Keep and recover work | Save a transferable copy, reload, and find your work again. | Export discovery, persistence expectations, authored/runtime distinction and any data-loss concern. Use their exported file if testing import. |

Optional extension: select a difficult ledge and compare “Make this ledge reachable” with the mechanical “Preview a checked step” tool. Ask what each checked result establishes. Observe whether the participant distinguishes AI from deterministic analysis and mechanical reachability from human difficulty.

If stuck for about90 seconds, ask “What are you looking for?” before giving a hint. Record independent completion separately from completion after assistance. Do not count an automated route replay as the participant completing a platforming route.

## Observation sheet — copy per session

Participant code: ___  Date: ___  Browser/OS: ___
Platformer familiarity: ___  Editor familiarity: ___
Recording/quotation consent, if applicable: ___

| Task | Independent / assisted / incomplete | Elapsed time | Retries or errors | Exact confusion, expectation or quotation | Assistance given |
|---|---|---|---|---|---|
| Discover play | | | | | |
| Direct edit | | | | | |
| AI behavior edit | | | | | |
| Explain/Undo | | | | | |
| Keep/recover | | | | | |

Record provider/model and visible error separately: ___
Reproduction steps for any defect: ___
Expected versus actual behavior: ___
Project export/screenshot reference, with permission: ___

Closing questions:

- What felt most satisfying or useful?
- Where did you lose confidence or feel unsure what would happen?
- What would you want to create next?

## Results and fix template

Leave blank until actual sessions occur. For each finding record: observed behavior, affected task, independent/assisted completion, evidence reference, severity, proposed fix, and retest outcome. Prioritize data loss or broken flow first, then repeated confusion, then cosmetic friction. Separate gameplay skill difficulty, interface discoverability and provider reliability.

Summarize counts with their denominator and assistance level; retain failed tasks and negative feedback. Small samples do not establish population-wide usability or enjoyment. Report only measured timing and consented quotations. Feed reproducible defects into PLAN.md and the existing regression paths when appropriate.
