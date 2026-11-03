# Dependency security review

The production dependency audit initially reported 12 affected packages: 1 critical, 8 high, 2 moderate and 1 low. The phase 3 review reduced this to **4 high, 0 critical, 0 moderate and 0 low**. The four remaining package findings all propagate one nested Zod advisory. This is not a vulnerability-free dependency tree.

The direct Agent-Native release remains `0.222.2`, the current published version verified during this review. Its automatic audit suggestion to downgrade to `0.157.8` was rejected. No `npm audit fix --force` was used. Project scripts, direct framework version, React and Phaser dependencies were preserved.

## Reviewed overrides

The overrides are scoped beneath `@agent-native/core` in `package.json`; the lockfile records the installed versions.

| Dependency | Before | Installed override | Reason and compatibility boundary |
| --- | --- | --- | --- |
| `better-auth` and `@better-auth/core` | 1.7.6 | 1.7.15 | Same minor-series patch update; removes critical OAuth-state impersonation, OAuth proxy and adapter findings. Auth/core versions remain aligned; auth's own adapter dependencies resolve to its matching patch. |
| `@modelcontextprotocol/client` and `@modelcontextprotocol/server` | 2.0.0 | 2.4.0 | Same major-series update; addresses OAuth trust/redirect, shared transport, request-bound and validation findings. The package entry points used by the framework remain available. |
| `@anthropic-ai/sdk` | 0.90.x | 0.91.1 | First fixed release for the filesystem memory-tool permission advisory, rather than moving to the unrelated latest 1.x SDK. The `Anthropic` constructor export remains available. |
| `minimatch` | 10.x | 11.0.3 | Required major-series change to resolve the glob-amplification advisory. Review found the framework uses named `minimatch`, `Minimatch` and `GLOBSTAR` APIs; regression tests exercise those exact APIs. The installed version supports the project's Node runtime. |

Upstream references checked: [Better Auth 1.7.15](https://github.com/better-auth/better-auth/releases/tag/v1.7.15), [MCP SDK 2.4.0](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.4.0), [Anthropic SDK 0.91.1](https://github.com/anthropics/anthropic-sdk-typescript/releases/tag/sdk-v0.91.1), [Minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Remaining nested Zod finding

The remaining chain is `@agent-native/core` → `@agent-native/agentkit` → `@ag-ui/core@0.0.59` → `zod@3.25.76`. The audit flags constrained-collection memory exhaustion below Zod 4.6.6. Wonderbox's own schemas use its separate patched top-level `zod@4.6.7`. [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

A candidate AG-UI 1.0.3 override removed the audit findings but failed a compatibility probe: it no longer exports `EventSchemas`, which installed AgentKit imports. That override was reverted. Forcing Zod 4 beneath AG-UI 0.0.59 was also rejected after inspecting its use of the Zod 3 single-argument `z.record(...)` API. No unreviewed major-version override or vendored library patch was left in the release.

The retained compatible AG-UI parser was verified with `RUN_STARTED` including metadata. An upstream compatible AgentKit/AG-UI combination or a reviewed upstream patch is still required to remove this final advisory safely.

The application does not expose AG-UI input routes, Better Auth, an MCP server/client transport, or the Anthropic memory tool. It uses explicit Express routes and Agent-Native's typed action primitive. The server binds to localhost by default and limits JSON requests to 2 MB. These facts reduce the apparent exposure in this local configuration; they do not replace an exploitability assessment. No public credentialed deployment is claimed or authorized.

## Verification

- `tests/dependency-compatibility.test.ts`: retained AG-UI metadata parsing; framework-consumed Minimatch APIs; reviewed auth/MCP/Anthropic entry point exports.
- `tests/agent.test.ts` and `tests/agent-capabilities.test.ts`: real Agent-Native definitions and HTTP boundary, locks, atomic preview/apply, revision checks, provider failures, bounded propose/check workflow and apply-time recheck.
- `npm run build`: typecheck and production client build passed after the override changes.
- Fresh production audit: [phase3-production-audit.json](evidence/phase3-production-audit.json). Re-run with `npm audit --omit=dev` to inspect current registry advisories.

These checks cover Wonderbox's actual integration and selected preserved exports. They are not a claim that every optional feature in Agent-Native's full hosted framework has been exercised with the overridden dependency tree.

## Follow-up review and regression guard

Current stable Agent-Native core/AgentKit remain0.222.2, verified against the registry again. AG-UI1.0.3 exports EventSchemas from its separate `/schemas` entry, while installed AgentKit imports it from the root. Adopting it requires a reviewed protocol migration, not just replacing a version number. No package patch, breaking major override or audit suppression was introduced. The current audit suggests a downgrade to0.178.1; that was not applied. The four high findings remain. [Current upstream Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

`npm run check:dependencies` now runs a fresh production audit and fails on any new package/advisory, additional vulnerable installation path, direct Zod exposure, severity increase, malformed report or registry failure. Its only exception is the exact documented four-package path and advisory URL. It reports the remaining high findings visibly; it does not report a clean audit or fix the advisory. Offline unit cases protect this narrow exception and rejection behavior.

The HTTP boundary is additionally regression-tested for malformed JSON and payloads above2MB: both are rejected as concise JSON errors before action/provider execution. Wonderbox still does not expose AG-UI parsers as API routes, and its own project schemas use patched Zod4. None of these mitigations removes the upstream installation finding.
