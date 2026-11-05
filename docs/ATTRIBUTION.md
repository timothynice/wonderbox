# Provenance and attribution

The workspace was empty at the start of this build. No pre-existing application code, templates, levels, or artwork were imported.

## Original work

Wonderbox name treatment, interface, Moonlight Garden level, Pip character, moss creatures, plants, lantern, stars, checkpoint, gate, scenery and visual effects were created in code for this project. Phaser Graphics draws the artwork procedurally; there are no remote game assets or AI-generated image dependencies. Sounds are short original Web Audio oscillator tones produced locally. Collision geometry is independent of decorative art. No Nintendo artwork, characters, recordings, music or layouts are used.

## Third-party software

Versions are pinned by `package-lock.json`. Principal dependencies:

| Dependency | Purpose | License / upstream |
|---|---|---|
| Agent-Native core | Shared validated action definition | MIT · https://github.com/BuilderIO/agent-native |
| Phaser 3.90 | Game rendering/input/scene lifecycle | MIT · https://github.com/phaserjs/phaser |
| React / React DOM | Editor interface | MIT · https://github.com/facebook/react |
| Zod 4 | Schema and transaction validation | MIT · https://github.com/colinhacks/zod |
| Express | Local/production API | MIT · https://github.com/expressjs/express |
| Lucide React | Editor icons | ISC · https://lucide.dev/license |
| dotenv | Server environment loading | BSD-2-Clause · https://github.com/motdotla/dotenv |
| Vite, Vitest, TypeScript, tsx, concurrently | Build/test/development | MIT (TypeScript Apache-2.0) · respective package LICENSE files |

Transitive dependencies retain their upstream licenses in `node_modules`. Preserve those license notices when distributing bundled third-party code. `npm ci` reconstructs the exact dependency tree.

DM Sans and Manrope are requested from Google Fonts for interface typography, under SIL Open Font License 1.1. The interface has local sans-serif fallbacks and remains functional offline. Font upstreams: https://github.com/googlefonts/dm-fonts and https://github.com/sharanda/manrope . No font code is used as game artwork.

The Gemini/OpenAI APIs are optional remote model services subject to the account holder's provider terms; models/services are not redistributed. Secrets are never included in source or exports.

## Development tools

Implementation and review used AI coding assistance, official documentation, automated Vitest checks, and real Chromium interaction through Playwright. AI-generated code is new project work; third-party library use is disclosed above.

## Improvement release additions

Practice puff, teaching-encounter placement, throwable handles, landing/collection/transformation/light-response feedback, preview marks and route overlays are original procedural project work. No new external artwork or audio libraries were introduced. Updated dependency overrides and compatibility boundaries are documented in DEPENDENCY-REVIEW.md. Captioned local recordings use actual application footage and real provider requests; no synthetic narration was substituted when local Voicebox was unavailable.

The bounded geometric step planner and dependency policy are new original application code. No new runtime libraries or third-party assets were added in this follow-up.

## Artwork and phone expansion

New palettes, editable colors, silhouettes, patterns, accessories, theme miniatures and world/terrain variations are original procedural artwork. No external image-generation service or imported art was added. `qrcode` (MIT, https://github.com/soldair/node-qrcode) generates play-link QR codes; `@vercel/blob` (Apache-2.0, https://github.com/vercel/storage) stores private authored snapshots. Provider-fixture tests are labeled and are not actual model responses. The CLI-config override keeps this new dependency chain on its patched compatible release; the existing AG-UI nested Zod exception remains unchanged.
