import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

// Resolve from the actual framework consumers so nested/hoisted installation
// differences do not accidentally test an unrelated top-level package copy.
const core = createRequire(path.resolve('node_modules/@agent-native/core/package.json'));
const agentkit = createRequire(path.resolve('node_modules/@agent-native/agentkit/package.json'));

describe('Reviewed security override compatibility', () => {
  it('keeps the named minimatch APIs used by Agent-Native', () => {
    const { minimatch, Minimatch, GLOBSTAR } = core('minimatch');
    expect(minimatch('src/game/index.ts', 'src/**/*.ts', { dot: true, nocase: true })).toBe(true);
    expect(new Minimatch('src/**/*.ts').match('src/game/index.ts')).toBe(true);
    expect(typeof GLOBSTAR).toBe('symbol');
  });
  it('retains AgentKit EventSchemas and metadata parsing instead of forcing incompatible AG-UI1', () => {
    const { EventType, EventSchemas } = agentkit('@ag-ui/core');
    expect(EventSchemas.safeParse({ type: EventType.RUN_STARTED, threadId: 'audit', runId: 'run', metadata: { source: 'compatibility-test' } }).success).toBe(true);
  });
  it('loads reviewed same-major auth/MCP and first-fixed Anthropic entry points', () => {
    expect(typeof core('better-auth').betterAuth).toBe('function');
    expect(typeof core('@modelcontextprotocol/client').Client).toBe('function');
    expect(typeof core('@modelcontextprotocol/server').McpServer).toBe('function');
    expect(typeof core('@anthropic-ai/sdk').Anthropic).toBe('function');
  });
});
