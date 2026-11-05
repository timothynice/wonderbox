# Wonderbox

[Play Wonderbox](https://wonderbox-three.vercel.app) · [GitHub](https://github.com/timothynice/wonderbox)


**Imagine it. Make it. Play it.**

An original 2D game playground. Play Moonlight Garden, pause, select an object, change its properties or ask the creative partner, then play the result. Direct edits and model proposals use one Agent-Native transaction action.

## Run locally

Requires Node.js 22.22+ and npm. Tested with Node 26.10.0.

```sh
npm ci
cp .env.example .env
# Add GEMINI_API_KEY to .env, or inherit it from your shell.
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on 127.0.0.1:3001. The game and manual editor do not require a model key; a running API is required for authored mutations. AI is always a real provider request; there is no canned demo mode. Missing credentials produce a clear setup message. See [AI setup and protocol](docs/AI.md).

```sh
npm run typecheck
npm test
npm run build
npm run check:dependencies
npm start
```

The production command serves the built application and API together at **http://127.0.0.1:3001**. Keep this process running while using the app.

## Repeatable regression checks

```sh
npx playwright install chromium --no-shell  # once per machine
npm run test:critical
```

This builds production and runs **three browser tests**: play/interact/win; direct editing/artwork/save/import/phone sharing; and AI transaction safety. It starts isolated local servers on ports 49117/49118 and uses fresh browser storage. No existing server or model credentials are needed. The AI test uses an explicitly labeled deterministic provider fixture through the real server and shared actions; it does not prove live model availability. The gameplay test starts in Moonlight Garden then imports a short diagnostic route through the normal import control.

`npm run check:dependencies` audits production dependencies and rejects findings outside the precisely reviewed nested Zod exception. A passing gate with that exception is **not** a clean audit; see the dependency review.

Failures retain screenshots/traces and an HTML report in `output/playwright/`. Use `npm run test:critical:headed` to watch, or `npx playwright test --repeat-each=3` to check repeatability after a build. Run `npm test` for the 82 unit tests. See [feature audit and coverage](docs/FEATURE-AUDIT.md).

## Play and create

- **A/D or arrows:** move. **Space / Up / W:** jump. Hold for height and any enabled float ability.
- **E:** pick up a nearby throwable plant or portable lantern; press again to throw in the direction you face.
- **Escape:** pause into Edit. Click Play to resume.
- Reach the three stars, touch the checkpoint bell, and enter the gate. Purple creatures cause a checkpoint restart; jump over them, throw a plant, or reshape the route.
- **Toolbox:** select and drag objects; drag terrain rectangles; click terrain with Erase; choose an object and click to place it. Placement and movement snap to a 20 px grid.
- **Inspector:** edit X/Y, relevant component parameters, and AI locks. Enter or blur commits a number. Manual editing remains available on AI-locked objects.
- **Artwork:** expand Appearance in an entity inspector for palettes, exact colors, silhouette, pattern and accessories. Art direction changes the world theme, terrain finish, light and scenery density. Both manual controls and AI use validated actions; visual edits preserve collision geometry and the current run. These are original procedural art variations, not arbitrary image generation.
- **Play on phone:** create a QR/link, open it on a phone, then use touch movement, held jump and pick/throw. After editing, choose Send latest version; the player explicitly chooses Restart with latest. Links expire after seven days and can be revoked. Anyone with a link can play that snapshot; keep private content out of shared levels.
- **Undo / redo:** toolbar or Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z. Both manual and AI transactions are atomic history entries.
- **Edit navigation:** scroll over the canvas to pan horizontally. Select spawn/exit through the World Explorer, or click them in the world.
- **Export / import:** header download/upload icons. Import validates the entire versioned JSON before replacing anything. Reset restores the known demo after confirmation and is itself undoable.

Pausing preserves the live simulation and camera. Safe behavior, artwork, lock, metadata and atmosphere changes reconcile in place, retaining position, health, stars, checkpoint, carried items and platform phase. Structural changes (terrain, positions, patrol/platform movement, gravity or world dimensions) restart transient simulation at a safe checkpoint/spawn and explain why. Full level restart clears progress. Import/reset clears runtime progress; runtime bodies never overwrite authored data.

Select terrain in the garden or World Explorer to **Check this jump**, choose a start surface, or ask **Make this ledge reachable**. The agent first receives bounded, mechanically checked stepping-stone options, then proposes and checks up to three real-model candidates. The options are deterministic tool results; a genuine model still chooses the AI transaction, and failed output is never silently replaced. Review ghost terrain, readable before/after differences and the route witness before Apply. Apply rechecks the exact candidate. **Replay checked route** starts a fresh scripted-input test run and pauses at completion; it is labeled and does not establish human usability. The bounded checker supports static terrain and shared movement physics; dynamic encounters are explicitly unsupported. “No route found” is not proof of impossibility.

**Preview a checked step** uses the same read-only planning capability directly, without a model key or AI request. It previews the first verified additive option; Apply rechecks it and Undo restores the original terrain. The search tries at most24 placements and returns at most3 options, keeps the character and existing terrain unchanged, and may find none. It is labeled a mechanical tool throughout.

Failed AI requests (including exhausted checked searches) retain their text for explicit Retry against the latest state. Revision changes invalidate pending previews. **View last change** explains applied edits; all authored changes use the same undo history.

## Architecture

- `src/shared/model.ts`: strict Zod v4 schema, v1 project format, bounded typed behaviors, unique stable IDs and required spawn/exit.
- `src/shared/actions.ts`: pure mutations, atomic clone/validate/commit, revision checks and AI lock enforcement.
- `actions/apply-transaction.ts`: actual `@agent-native/core/action` **defineAction** capability. Both `/api/action` for direct manipulation and model proposal validation call its validated `.run()`. Inspection, preview and route-checking are also actual read-only Agent-Native capabilities.
- `server/agent.ts`: selected entity, full bounded project, locked objects, parameter schema and recent edit context sent to a configurable model; response parsed and validated through the same action.
- `src/shared/history.ts`: bounded snapshot undo/redo, monotonic revisions, localStorage save/load. Authored data survives reload; undo history and chat are session-local.
- `src/shared/movement.ts` and `reachability.ts`: production movement shared with the bounded static route checker.
- `src/shared/edit-impact.ts` and `preview.ts`: safe reconciliation classification and pure validated visual diffs.
- `src/game/`: Phaser rendering and original procedural art, 120 Hz deterministic collision step, derived runtime entities. React never drives frame updates.
- `src/main.tsx`: editor, history, persistence, AI preview and stale-response protection. Failed requests leave the project unchanged.

The Agent-Native use is intentionally small: shared validated actions, not its full hosted chat/auth/database harness. The provider adapter creates structured level actions, never executable code. Broad geometry/removal or more than three actions require a visible Apply preview. Locked objects are protected in the mutation layer, including remove/re-add and terrain-ID bypasses.

## Deployment

Production deployment uses Vercel: the Vite build is served from its CDN and `api/index.ts` exports the same Express/Agent-Native API as a single Node function. `vercel.json` routes `/api/*` there and allows up to60seconds for checked AI requests. Node24 is pinned for reproducible hosting; local Node26 was also verified.

1. Connect this repository to your Vercel project, or run `vercel link` and `vercel --prod`.
2. Configure **Production** server variables: `AI_PROVIDER=gemini`, `AI_MODEL=gemini-2.5-flash`, `GEMINI_API_KEY`, `AI_ACCESS_CODE` (a strong shared secret), and `ALLOWED_ORIGIN` (the exact HTTPS production origin). Add Preview variables separately if needed.
3. Enter the shared **AI access code** in the creative partner panel. It stays in memory and is sent only to `/api/agent`. Visitors can play and edit without it. It is not a provider API key. Hosted model calls fail closed if this variable is missing, except during an explicitly configured public window. Rotate it in Vercel and redeploy to revoke access. For temporary judging access, `AI_PUBLIC_UNTIL` accepts a UTC ISO timestamp and bypasses the code until that time. Production is public through November27,2026, then automatically requires the retained code at **November28 midnight Pacific** (`2026-11-28T08:00:00Z`). Preview remains protected. Remove the variable and redeploy to end public access early. The existing provider usage cap is the spending boundary; no new application spending limiter was added. The process-local3-request concurrency guard remains.
4. Push `main` to deploy automatically after Git integration is connected. GitHub Actions runs type checking, unit tests, dependency policy and the three critical browser paths. Vercel Git deployment and CI run independently; check both before sharing a new release.
5. Connect a **private Vercel Blob store** to Production/Preview; Vercel supplies server-only `BLOB_READ_WRITE_TOKEN`. Hosted sharing fails closed without storage. On a conventional Node host, durable local `SHARE_DIRECTORY` (default `.wonderbox-shares`) is sufficient; back it up and restrict its permissions. Never use ephemeral serverless disk for shares.
6. Verify `/api/health`, play, a manual edit/Undo, an authorized AI change/Undo and a reload on the production URL. Authored projects remain browser-local; shared play snapshots are separately stored server-side. Export before changing origins or clearing browser storage. Owner update/revoke capabilities remain in this browser’s localStorage; losing them loses control of that link until expiry.

For a conventional Node server, run `npm ci && npm run build`, set `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3001` and the same provider/origin variables, then `npm start` behind HTTPS. `AI_ACCESS_CODE` is optional locally. Vercel preview URLs may require Vercel login under the platform's standard protection; the production alias is intended for public play.

Do not put provider keys in Vite variables, client bundles, JSON exports, or git. See [.env.example](.env.example). No paid provider or cloud service is required for manual editing; model usage follows your provider account.

## Release materials

- [Owner self-test checklist](docs/PLAYTEST-CHECKLIST.md)
- [Dependency review and remaining advisory](docs/DEPENDENCY-REVIEW.md)
- [Demo walkthrough and recording sequence](docs/DEMO.md)
- [Hackathon description and requirement notes](docs/HACKATHON.md)
- [Asset and dependency provenance](docs/ATTRIBUTION.md)
- [Verification and limitations](docs/VERIFICATION.md)
- [Browser check reproduction](scripts/README.md)
- [Implementation status](PLAN.md)

## Current limits

- Live Gemini artwork verification passed after credits were restored: character artwork+float, world themes/terrain, moonlight, manual-state context and Undo. Two combined world requests omitted lighting despite their summary; a separate moonlight request succeeded. Review actual preview differences. See [live evidence](docs/evidence/live-artwork-verification.json). Direct artwork editing and phone sharing require no model credits.
- QR play is browser-based, with explicit snapshot updates; there are no accounts, automatic editor sync or native app. Create phone links from the hosted editor: localhost links only work on the same computer.
- Touch-emulated Chromium portrait/landscape is tested; physical-device/Safari testing remains yours. Desktop remains the primary creation experience.
- Owner update/revoke permission lives in this browser’s localStorage. Revocation prevents future loads but cannot erase copies already loaded. Expiry blocks reads after seven days; expired objects are removed on their next read, with no scheduled storage sweeper. Rate limits are process-local, not global quotas.
- The reviewed upstream nested Zod advisory remains (four high package findings); the dependency gate passes only its narrow documented exception. Group play studies are deferred. Public Clips publication, legal acceptance and final submission remain user steps.
