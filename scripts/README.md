# Critical-path regression suite

The recommended repeatable check is now:

```sh
npx playwright install chromium --no-shell
npm run test:critical
```

Exactly three tests in `tests/e2e/critical-paths.spec.ts` exercise the production UI and actual API, using isolated browser contexts and ports4317/4318. The provider in `tests/e2e/server.ts` is a **test-only deterministic fixture**, never imported by the application. No API credits or real credentials are used. Gameplay uses an explicitly named imported diagnostic route after testing movement/jumping/pause in the original starter. This is a regression check, not live-AI or human play-study evidence.

Run `npm run test:critical:headed` to watch. `npx playwright show-report output/playwright/report` opens the report. Failure traces/screenshots live under `output/playwright/regression`; the runner also captures each final screen. The config refuses to reuse occupied test ports. The browser is Chromium; `PW_CHANNEL=chrome` optionally uses installed Google Chrome. The app is rebuilt by the npm scripts before tests, avoiding stale production assets.

[Coverage and latest audit](../docs/FEATURE-AUDIT.md). The older CLI callbacks below remain available for **live** provider checks.

# Browser verification callbacks

These scripts drive actual controls through Playwright CLI and inspect read-only project/runtime debug state. They do not inject a canned provider or alter runtime state. AI checks make real provider requests and may consume the configured API account quota.

Start a production build/server (or dev server) first. Then:

```sh
mkdir -p output/playwright
npx --yes --package @playwright/cli playwright-cli -s=check open http://127.0.0.1:3001
npx --yes --package @playwright/cli playwright-cli -s=check resize 1440 900
npx --yes --package @playwright/cli playwright-cli -s=check run-code --filename=scripts/browser-editor-check.js
npx --yes --package @playwright/cli playwright-cli -s=check run-code --filename=scripts/browser-persistence-check.js
npx --yes --package @playwright/cli playwright-cli -s=check run-code --filename=scripts/browser-ai-check.js
npx --yes --package @playwright/cli playwright-cli -s=check run-code --filename=scripts/browser-context-check.js
```

The AI callback resets the demo with confirmation, sets a manual float value, locks/unlocks, requires broad Apply, then checks stale edit rejection. Run context-check immediately afterward to check undoing the AI transaction and reading a new manual value. Provider availability can cause a truthful failure: inspect the chat and retry instead of claiming a passed test. Some controlled checkboxes save asynchronously, so scripts click then wait for revision rather than asserting synchronous native checkbox state.

The editor callback paints near the starter spawn, places/duplicates/deletes, undoes, and verifies typing isolation. Begin near the spawn with camera0 (fresh load/restart). Tests mutate the local browser's project; use a dedicated session and export personal work first.

See docs/RUNTIME-VERIFICATION.md for keyboard play routes and the distinction between isolated imported mechanic fixtures and the final live AI actual-starter run. No automated route result is a human enjoyment study.

## Current additional coverage

The same three tests now protect safe-edit resume, pure visual previews and Discard, stale preview invalidation, explicit Retry, shared route checking, Apply-time validation and labeled actual-runtime route replay. Unit suite:51 tests. Live-provider evidence is separate; the deterministic provider does not establish model availability. See docs/VERIFICATION.md and docs/evidence/phase3-agent-capabilities.md. Group studies are waived; use docs/PLAYTEST-CHECKLIST.md for owner testing.

## Remaining-issues follow-up

`npm run check:dependencies` runs a fresh production audit with one exact, visible reviewed exception; registry errors and new findings fail. This does not remove the remaining advisory. Current unit count58. The same three browser flows also protect mechanical step preview/Discard/Apply/Undo without model calls and exhausted-search Retry. See docs/evidence/followup-step-planning.md for separate genuine-model results.

GitHub CI runs the same three tests with `PW_CANVAS=1`, disabling browser WebGL so Phaser AUTO uses its real Canvas fallback on GPU-free Linux runners. Default local checks retain WebGL. No simulation or provider assertions are bypassed. The checkpoint route waits for landing before crossing its flag, avoiding airborne overshoot on slow renderers.
