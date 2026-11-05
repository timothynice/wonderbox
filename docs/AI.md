# Creative partner integration

Wonderbox runs a live model behind a Node server. There is no canned-response mode. The local editor works without credentials; the AI panel reports that it needs a server key.

## Configuration

Copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and run `npm run dev`. An inherited environment key works too. Defaults are `AI_PROVIDER=gemini` when a Gemini key exists and `AI_MODEL=gemini-2.5-flash`. Explicit `AI_PROVIDER` wins. Never add `VITE_` to a secret variable.

For OpenAI or a compatible endpoint, set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and optionally `AI_MODEL` and `AI_BASE_URL`. The default OpenAI model is `gpt-4.1-mini` and base URL is `https://api.openai.com/v1`. The OpenAI adapter uses Chat Completions JSON mode; choose a model and compatible endpoint supporting it. Gemini was exercised live during release verification; the OpenAI adapter is covered at the HTTP boundary but requires a configured provider for a live test.

`GET /api/health` exposes connection configuration, provider and model names, never the key. A configured key is not proof that a provider request will succeed; the panel displays the result of actual requests.

## Agent-Native and shared actions

The server exposes four real `defineAction()` capabilities from `@agent-native/core/action`: inspect the authored project, preview a transaction, check a bounded route, and apply a transaction. Manual HTTP controls and the creative-partner workflow call these same `.run()` capabilities. They share canonical schemas, object locks, bounds, revisions and the atomic transaction implementation. There is no separate AI mutation implementation.

This intentionally minimal integration uses Agent-Native's typed action primitive directly. It does **not** run Agent-Native's full hosted agent harness, auto-discovered action routing, chat storage, MCP server, database, accounts or durable synchronization. Express explicitly mounts the API, and the browser owns the canonical project, command history and local persistence. The model gets the current project snapshot and selection on each request. This is a single-user local release.

`POST /api/action` accepts `{project,actions,expectedRevision,source,approved?,checkRequest?}` and returns `{project,evidence?}`. `source` is `manual` or `ai`. An action batch creates one project revision and one undo command. Broad AI edits (more than three actions), entity removal, terrain erasure, changes to world dimensions or gravity, and every checked AI proposal require explicit `approved:true` from the Apply preview. When `checkRequest` is present, the server recomputes the route on these exact current-revision actions and rejects the entire transaction if it does not pass. Client-supplied success flags are never accepted as evidence.

`POST /api/agent` accepts `{project,selectedId?,prompt,recentContext?,targetTerrainId?,sourceTerrainId?}`. Its result includes `{actions,summary,requiresApproval,baseRevision,affectedIds,provider,model,activity,preview?,checkRequest?,evidence?}`. The model cannot provide policy, preview, activity or evidence fields; capabilities compute them. Empty actions explain unsupported or unresolved requests. A proposal is validated against a clone, with no project persisted on the server. The UI checks `baseRevision` against its current revision before applying or previewing it. A manual edit during a request makes the proposal stale; ask again with current state.

The shared manual endpoints are `POST /api/inspect {project,selectedId?,targetTerrainId?,sourceTerrainId?}` (inspection snapshot), `POST /api/preview {project,actions,expectedRevision,source?}` (preview directly), and `POST /api/check {project,check:{targetTerrainId,sourceTerrainId?}}` (returns `{evidence}`). Their definitions live in `actions/inspect-project.ts`, `actions/preview-transaction.ts` and `actions/check-reachability.ts`.

## Checked route workflow

An explicit `targetTerrainId` activates the bounded outcome workflow. The server first inspects the project and checks the original route. If that check is unsupported/inconclusive, it reports that limit and prepares no edit. If it already finds a route, it reports the evidence without making an unnecessary change. Otherwise it asks the live model for a candidate, previews it atomically, and checks the candidate using the runtime's shared motion and collision functions. Failed evidence and previous candidate actions are supplied to the next model attempt against the original project snapshot.

There are at most three actual model requests total, including any alternate-model service recovery, within one 40-second budget. No candidate is committed during this search. A passing candidate returns a reviewable Apply preview and a replayable witness. If the budget is exhausted, the result contains no actions and says that no checked edit was prepared. Activity entries describe only capabilities that actually ran and the results they returned; they are not fabricated narration or private reasoning.

Checked route editing has enforced scope: the complete player entity (including spawn and behavior), source surface, target surface, and world width/height/gravity must remain unchanged. The same reusable guard runs in the shared preview and again at Apply. A candidate cannot satisfy this terrain-edit promise by giving Pip floating, lowering the target, moving the source or changing global physics. Intermediate terrain can be added or adjusted. Ordinary behavior editing and manual checks of a world with changed abilities remain available separately.

The check is deliberately narrow: static terrain from the authored spawn or an explicit canonical source surface, with bounded search policies. Moving platforms, enemies, damage and bounce mechanics interfering in the corridor return unsupported evidence. `no-route-found` means the bounded policies did not find a route, not that a jump is impossible. A witness is mechanical reachability evidence, not proof that a person can complete the platforming. Evidence includes the authored revision, mechanics fingerprint, target/source, budgets and witness inputs. Apply reruns the capability rather than trusting an old witness or fingerprint.

The backend cannot know whether a browser-supplied snapshot is the browser's newest revision: the client revision check is essential. Local project revisions are not an authorization system.

## Structured editing and errors

The model receives the current authored world, selected ID, locked IDs, recent edit summaries and the full action JSON Schema. Both providers use native JSON response mode. Gemini additionally receives a compact responseJsonSchema: the action branches are flattened into one object grammar and numeric/string bounds are omitted from that decoder grammar. The complete nested union exceeded Gemini's decoder complexity, while JSON mode alone intermittently produced malformed JSON during a combined move/behavior request. The full strict schema remains in the prompt and authoritative Zod/action validation checks discriminators, fields, bounds and locks afterward; the compact grammar does not loosen the mutation boundary. Invalid JSON, unknown actions, unsupported fields, out-of-bounds geometry and failed action validation apply nothing. Model output never executes as code.

The Node server keeps keys in request headers only. The workflow times out after 40 seconds. Network errors, invalid output, quota errors and missing credentials produce actionable errors while retaining authored state. Up to three AI workflows can run concurrently per server. If a configured Gemini primary returns HTTP503, the server may make one genuine request to `AI_FALLBACK_MODEL` (default `gemini-2.5-flash`), within the same timeout and three-call budget. The fallback must differ from the primary; an empty value disables it. Returned `model` is the model that actually produced the edit, with `usedFallback`, `primaryModel` and `providerNotice` disclosing recovery. There is no alternate-model recovery after authentication, quota, validation or invalid-output errors. Explicit checked workflows can revise an invalid or unsuccessful candidate within their bounded candidate budget; ordinary unqualified edits still surface invalid output without silently repairing it. Other retries are manual.

Locked entities cannot be changed, removed, unlocked or modified through a later action in the same AI transaction. Only manual actions can change locks. Runtime play state is not included in the authored edit context; collection, enemy transformation and temporary positions do not alter the saved project.

## Supported components

| Component | Range / effect |
| --- | --- |
| Player `floatSeconds` | 0–2 seconds of reduced airborne gravity while holding jump |
| Plant `throwable` | Boolean; pick up and throw with E |
| Lantern `portableLight` / `lightRadius` | Boolean / 40–400 pixels |
| Enemy `fearsLight` | Retreat from a nearby portable light |
| Enemy `transformOnHit` | Become a bouncing platform after a thrown-object hit |
| Enemy `bounceSpeed` | 300–1100 pixels/second |
| Enemy `patrolSpeed` / `patrolRange` | 0–180 pixels/second / 0–500 pixels |
| Moving platform `moveAxis` | `x` or `y` |
| Moving platform `moveDistance` / `moveSpeed` | 0–500 pixels / 0–200 pixels/second |
| Exit `requiredStars` | Integer 0–30 |
| World `atmosphere` / `gravity` | `day` or `moonlight` / 700–2200 pixels/second² |

These are composable typed parameters. Arbitrary scripts, new executable mechanics, multiplayer, image generation and new engines are outside this release.

## Deployment boundary

`npm run build` then `npm start` serves the built UI and API together on port 3001. The server binds to `127.0.0.1` by default. `HOST`, `PORT` and `ALLOWED_ORIGIN` are configurable. Keep the Node process running and provide environment secrets through your hosting provider. Static-only hosting cannot run the AI API.

The release has no accounts or per-user quotas. The authorized Vercel production deployment keeps play/direct editing public and protects model calls with a memory-only shared AI access code; missing hosted code configuration fails closed. Origin checks are a browser protection, not authentication; nonbrowser callers can bypass them. `ALLOWED_ORIGIN` permits an exact external origin. Configure provider quotas/budgets as well: process-local request limits are not a global spending cap. See README for deployment and private phone-snapshot storage.

## Verification

`tests/agent.test.ts` exercises the real Agent-Native action, live-provider-shaped JSON transport, locked edits, stale revisions, invalid model output, provider failure, missing credentials, unsupported requests and mandatory broad-change approval. `output/verification/live-ai.json` records actual Gemini requests and validated responses from the release session, with `fixture:false`; it is an evidence artifact, not a runtime fixture. It contains no credentials.

Development passes exercised Gemini2.5 and3.5 Flash. The3.5 pass initially succeeded but subsequent UI requests repeatedly returned provider HTTP503, so the release default returned to the more available2.5 model. Its earlier interpretation of 'three stars' as all six existing/new stars was addressed by placing an explicit numeric rule after the action schema; the exact request then produced a three-star gate in live verification. `output/verification/live-ai-3.5.json` retains the earlier3.5 evidence, including a503 and its successful retry. The final `live-ai.json` records the2.5 release pass. Model intent interpretation and provider availability remain probabilistic: inspect summaries and broad-change previews, retry provider failures when appropriate, and use undo when needed.

Official references checked during implementation: [Agent-Native actions](https://www.agent-native.com/docs/actions-defining/), [Gemini generateContent REST API](https://ai.google.dev/api/generate-content), [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai).

Phase 3 live evidence: [phase3-live-checked-agent.json](evidence/phase3-live-checked-agent.json) records an actual Gemini workflow where the original route check failed, the first candidate failed, the second candidate produced a route witness, and Apply-time recomputation passed. No fixture model output was used. The dependency review and its remaining transitive advisory are documented in [DEPENDENCY-REVIEW.md](DEPENDENCY-REVIEW.md).

## Mechanically grounded step planning

`actions/plan-static-step.ts` is a read-only Agent-Native capability, exposed through `/api/step-options`. Given the canonical project and source/target check request, it derives up to24 additive placements from destination/player geometry, evaluates them with production movement, and returns at most3 passing options with real evidence and pure previews. It preserves all existing entities/terrain and observes the same checked-intent/lock boundary. Unsupported/already-satisfied cases return no proposed additions. It is bounded assistance, not an exhaustive construction solver.

The live agent receives these **deterministic mechanical tool results** before its normal model proposal. It may choose an option or propose another solution; its actual output must still validate and pass a fresh check. No tool option is substituted when the provider fails, returns invalid actions or exhausts its budget. Activity discloses the planning step. The direct `Preview a checked step` button calls the exact same capability without AI, explicitly labels the result mechanical, and requires Apply with revision/scope/check revalidation.

Exhausted searches now offer explicit Retry with saved request/context, just like provider failures. Checked proposals update the global status instead of leaving the earlier no-route message visible. Preview panels initially scroll to their heading/diff so review precedes Apply.

## Shared artwork customization

Entity `appearance` supports six original palettes, independent optional exact `#RRGGBB` primary/accent colors, classic/round/spiky silhouette, plain/spots/stripes pattern and none/leaf/crown/scarf accessory. World settings add garden/autumn/candy/aurora themes, moss/stone/crystal terrain artwork and bounded0–1 foliage/starlight density. Legacy version1 exports receive original defaults. Partial appearance patches merge without resetting other fields. Manual controls and AI use the same strict `updateEntity`/`setWorldSettings` transaction actions, preview, locks, revision checks and undo. Broad restyles require Apply; colors and decorative geometry never change hitboxes. Unsupported arbitrary sprite/image generation is explained rather than simulated.

After the owner restored credits on November4,2026, genuine hosted Gemini2.5Flash checks passed character lavender/scarf/spots +float0.8 (including actual held-jump play), broad autumn/crystal preview/Apply, standalone moonlight, locked-entity/terrain preservation, manual exact-color/current-float read-only context and Undo to original. Two combined world requests omitted atmosphere despite claiming moonlight; Undo and a separate genuine moonlight request were used. This is a model-intent limitation, not a first-attempt end-to-end success claim. Earlier HTTP402 and fixture results remain separate historical evidence. See [sanitized live evidence](evidence/live-artwork-verification.json).
