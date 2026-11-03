# Hosted release

- Play/editor: https://wonderbox-three.vercel.app
- Source: https://github.com/timothynice/wonderbox
- Hosting dashboard: https://vercel.com/timothynices-projects/wonderbox
- CI: https://github.com/timothynice/wonderbox/actions

The game and visual editor are public. Model-backed edits require the shared AI access code in the creative partner panel. The owner's initial code is stored locally in ignored `.vercel/ai-access-code` (mode0600). Share that code privately with trusted testers/judges, never in the public repository or Clips recording. The actual Gemini provider key remains only in server environment configuration. Rotating AI_ACCESS_CODE in Vercel and redeploying revokes the old shared code. Local-only code copy must be updated separately.

Main pushes trigger Vercel production builds; other branches use preview deployments. GitHub CI runs separately and is not a deployment approval gate: inspect both before announcing changes. Vercel standard protection may require login for generated preview URLs; production alias is publicly accessible.

Use Node24, npm ci, npm run dev for local development. Production uses the Vite CDN build and one serverless Express entry point preserving shared Agent-Native capabilities. Server variables and recreation steps are in README and .env.example. Do not use VITE_ secrets. A60second function limit accommodates the40second bounded agent budget; provider errors still apply no changes. The concurrency counter is per instance, not a global quota. Set provider quotas/budgets appropriate to your sharing audience.

Projects are browser-local. Existing localhost projects do not automatically appear at the hosted origin: export locally, then import on the hosted site. Clearing browser data removes local projects; export backups.

To release a change: run npm run typecheck, npm test, npm run check:dependencies and npm run test:critical; push; check CI and Vercel Ready; verify health, play/pause, direct edit/Undo, a real AI edit/Undo, and reload at the production alias. If a deployment breaks, use Vercel's deployment dashboard to roll production back to a previously verified deployment, then fix forward on main. Do not roll back to the initial function-startup failure.

Remaining submission actions: owner playtest; publish actual-app footage as a public Clips recording and check signed-out access; personally complete the hackathon form, disclosures, eligibility/legal terms and retain receipt. Deployment did not publish Clips or submit an entry. See DEMO.md and HACKATHON.md.
