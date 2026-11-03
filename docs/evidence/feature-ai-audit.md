# Genuine AI and production dependency audit

This is the initial audit record. The subsequent phase 3 update added shared inspect/preview/check capabilities and remediated the compatible dependency findings; see [phase3-agent-capabilities.md](phase3-agent-capabilities.md) and [DEPENDENCY-REVIEW.md](../DEPENDENCY-REVIEW.md). The original 12-package finding count below is retained as historical evidence; the follow-up production audit reports four high findings from one remaining nested Zod advisory.

Audit scope: the actual Gemini integration through the running local HTTP API on port 3001, plus the supplied production npm audit report at `/tmp/wonderbox-audit.json`. Baseline and final smoke tests used the actual API. Intermediate experiments wrapped genuine outgoing Gemini requests to capture model text and supply a candidate decoder grammar; provider responses were not replaced or fabricated. The lead engineer then integrated the verified grammar into the server, followed by a fresh actual API check. No credentials were printed, dependencies upgraded, or browser-saved project overwritten. This auditor edited only this evidence document and used isolated starter-project snapshots and temporary scripts.

## Live integration results

Verified on November 1, 2026, finishing at 23:41:38 UTC. Health reported a configured real Gemini connection using `gemini-2.5-flash`. Health configuration alone was not counted as a successful model test; every successful row below includes an actual model response and shared-action validation.

| Actual HTTP API check | Observed result |
| --- | --- |
| Player selected; brief float request | HTTP 200; `setBehavior` targeted `pip`, set `floatSeconds:0.65`, and applied successfully as one revision. |
| Selected enemy; transform after thrown-object hit | HTTP 200; targeted `mossling`, set `transformOnHit:true`, and applied. |
| Moonlight plus lantern fear for all three enemies | HTTP 200; four actions; preview required. A commit without approval returned 422; explicit approval returned 200. Terrain, existing floating and prior transformation were preserved. |
| Add three stars and require them to open the exit | HTTP 200; exactly three new stars, gate requirement exactly three. Preview required, unapproved commit rejected 422, approved commit applied 200. |
| Unsupported multiplayer and voice chat | HTTP 200 with empty actions and an explanation of the limit. No authored change. |
| Ask AI to ignore a locked player's lock | Model attempted an edit; the action layer rejected it with HTTP 422 naming the lock. No project applied. |
| Apply an AI edit against an outdated revision | HTTP 422 with the current-state conflict message. |
| Invalid project body | HTTP 400; no model edit or authored mutation. |

The initial selected-plant request combined two supported changes: “Make this plant throwable, then move it 40 pixels to the right from its CURRENT authored position. Preserve its name and Y position.” The plant had been manually moved to x=380 and renamed “Manually moved audit sprout.” The first API response was HTTP 502 because the provider returned invalid output. The authored revision remained unchanged. This failure was investigated and fixed rather than counted as a pass.

### Defect found and fixed: JSON mode could return malformed output

An instrumented real-provider request captured only the model's response text, never request headers or keys. An exact-context repetition reproduced the failure: the model omitted the closing brace for the first action before starting the next action. The invalid fragment was:

```text
"behaviors": { "throwable": true }
,
{ "type": "moveEntity", "id": "demo-plant", "x": 420, "y": 580 }
```

The first action object itself had not been closed. Strict parsing correctly rejected the entire transaction. In three exact-context repeats before the fix, one was malformed and two returned valid edits. Narrower throwable-only and move-only requests also succeeded, including correct arithmetic from the manually updated x=380 to x=420.

A decoder schema with merely `actions.items:{type:"object"}` was tested and rejected as an implementation choice: Gemini returned HTTP 200 with `actions:[]` while its summary claimed the edit had happened. That experiment is not counted as working editing.

The applied fix supplies Gemini a compact `responseJsonSchema` derived from the canonical action schema: numeric/string/collection bounds, patterns, defaults and descriptions are omitted from the decoder grammar; the action union's properties are merged into one action object with a `type` enum. Existing nested `additionalProperties` rules are retained. The full strict action union, numeric limits, locks and transaction checks still run in Zod and the shared Agent-Native capability before any project can apply. No model-output repair, fixture response, arbitrary code execution or silent retry was added.

Before integration, the flattened grammar passed three repeated combined requests with real Gemini. A separate real-provider request suite using that exact request grammar passed all nine checks: seven supported examples (float, throwable, transformation, light fear, moonlight, three stars/gate, easier-jump terrain), one unsupported request, and a six-action signature edit. The six-action result required preview and correctly changed all six requested properties. This suite validated candidate grammar through a fetch wrapper; its provider responses were genuine and unmodified.

### Actual API verification after the fix

The source change was then tested through the reloaded API, without a fetch wrapper or response injection:

- Combined selected request, attempt 1: HTTP 200. Applied plant x=420, y=580, original manual name, and `throwable:true`.
- Combined selected request, attempt 2: provider HTTP 503. Explicit “temporarily unavailable; nothing changed” error; no applied project.
- Combined selected request, attempt 3: HTTP 200. The model used a single valid `updateEntity` patch instead of separate move and behavior actions. Applying it produced the same correct x=420, preserved y/name and throwable behavior.
- Broad three-star request: provider HTTP 503 on the first call. An explicit retry returned HTTP 200 with three added stars and a three-star gate. Unapproved apply returned 422; approved apply returned 200 with six total stars and a gate requirement of three.

The final current-state checks inspect the resulting authored project, not a preferred model action shape. Both `moveEntity` plus `setBehavior` and an equivalent validated `updateEntity` patch are valid shared capabilities.

**Remaining live limitation:** provider availability remains intermittent even with Gemini 2.5 Flash. This audit observed two post-fix 503 responses. The syntax defect is addressed and successful current-state edits were verified; uninterrupted provider availability is not claimed. The application handled those failures without applying a partial edit. No fallback was used in these samples because the configured primary was already the default fallback model.

### What this evidence proves

This audit proves real model-backed authored edits, selected-object and manually updated state awareness, shared action validation, approval enforcement, lock rejection, stale revision rejection and truthful provider errors at the HTTP API boundary. It does not prove runtime platforming, human completion, browser selection visuals, undo UI, persistence UI, or end-to-end human play of newly generated geometry. Those require the separate browser/gameplay evidence. Timeout, missing-key and mocked-provider error paths belong to the deterministic integration tests; this live audit did not alter credentials or simulate a timeout.

The exploratory scripts and raw response captures were written only under `/tmp` (`wonderbox-feature-ai-audit-results.json`, `wonderbox-selected-ai-audit-results.json`, `wonderbox-combined-ai-audit-results.json`, `wonderbox-compact-schema-audit-results.json`, `wonderbox-full-compact-audit-results.json`, `wonderbox-final-api-ai-audit-results.json`). They are temporary session evidence, not bundled runtime fixtures or a promised permanent test harness. This document records their meaningful results, including failures.

## Production dependency findings

The supplied npm report lists **12 affected packages: 1 critical, 8 high, 2 moderate, 1 low**. These are package-level counts including propagated dependency findings, not 12 independent exploits. All reported paths are under the direct `@agent-native/core@0.222.2` dependency. The report does not flag Express, React or Phaser.

| Material finding | Installed affected dependency | Audit severity and consequence |
| --- | --- | --- |
| Better Auth OAuth state accepted as a magic link | Nested `better-auth@1.7.6` | Critical account impersonation issue; the advisory's fixed version is 1.7.7. [Advisory](https://github.com/advisories/GHSA-965c-763c-88jm). |
| Better Auth OAuth proxy trust and Drizzle rate-limit races | Same nested Better Auth and its Drizzle adapter | Additional high and low findings on the auth dependency tree. |
| MCP server validation resource exhaustion, shared transport state and request limits | `@modelcontextprotocol/server@2.0.0` | High availability and cross-client isolation findings. The audit range for these findings ends below 2.3.0; one request-limit advisory ends below 2.1.0. [Validation advisory](https://github.com/advisories/GHSA-46jr-4wx8-v453). |
| MCP client OAuth trust and cross-origin forwarding | `@modelcontextprotocol/client@2.0.0` | High credential-disclosure trust issue plus moderate cross-origin forwarding issue. [OAuth advisory](https://github.com/advisories/GHSA-6qxp-vccf-f47h). |
| Nested Zod constrained-collection resource exhaustion | `@ag-ui/core/node_modules/zod@3.25.76` | High; reported fix threshold 4.6.6. The application's separately installed top-level Zod is 4.6.7 and is not the flagged copy. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). |
| Anthropic memory-tool file permissions | `@anthropic-ai/sdk` through Agent-Native | Moderate filesystem permission issue; audit range 0.79.0–0.91.0, fixed 0.91.1. |
| Minimatch glob amplification | `minimatch` through Agent-Native | Moderate denial-of-service finding, reported affected range below 11.0.1. |

The high counts on `@agent-native/core`, AgentKit, AG-UI and WebMCP include inherited findings from the affected leaves. They should not be presented as separate new vulnerabilities in Wonderbox's game code.

### Exposure and remediation boundary

Source inspection confirms that this application uses the Agent-Native `action` export and explicitly mounts only its own Express `/api/health`, `/api/action` and `/api/agent` endpoints. It does not mount Better Auth routes, a hosted Agent-Native harness, an MCP HTTP server, an MCP OAuth client, the Anthropic filesystem memory tool, or an AG-UI chat integration. The server defaults to localhost binding. Those facts reduce the apparent exposure of the listed optional-feature vulnerabilities in this particular local configuration; they do **not** establish that the installed dependency tree is vulnerability-free. No exploitability test or complete transitive import/reachability audit was performed.

The application still has unresolved production dependency security debt. Before public credentialed hosting, resolve the upstream affected versions and retest the actual action API and integration. Keep the account-free server private meanwhile. Its origin check is not authentication, and it has no per-user spending quota.

The report's automatic fix suggestion is `@agent-native/core@0.157.8`, marked as a major change even though it is an older version than the installed 0.222.2. This is not evidence of a safe compatible upgrade. No `npm audit fix --force`, blanket Zod major-version override, or automatic downgrade was run. A remediation should use a compatible upstream release or narrowly reviewed overrides, with a fresh production audit and full regression checks.
