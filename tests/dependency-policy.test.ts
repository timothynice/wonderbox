import { it, expect } from 'vitest';
import { reviewDependencyAudit } from '../scripts/dependency-policy';
import baseline from '../docs/evidence/phase3-production-audit.json';
it('permits only the explicitly documented upstream path and a completely resolved audit', () => {
  expect(reviewDependencyAudit(baseline).reviewedFindings).toBe(4);
  expect(reviewDependencyAudit({ vulnerabilities: {}, metadata: { vulnerabilities: { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0 } } }).reviewedFindings).toBe(0);
});
it('fails closed on another advisory, newly exposed copy, severity increase or registry failure', () => {
  for (const mutate of [
    (a: any) => a.vulnerabilities.zod.via.push({ url: 'https://example.test/new', severity: 'high' }),
    (a: any) => a.vulnerabilities.zod.nodes.push('node_modules/zod'),
    (a: any) => a.vulnerabilities.zod.severity = 'critical',
    (a: any) => a.vulnerabilities.zod.isDirect = true,
    (a: any) => a.error = { code: 'REGISTRY_ERROR' },
  ]) { const audit = structuredClone(baseline); mutate(audit); expect(() => reviewDependencyAudit(audit)).toThrow(); }
});
