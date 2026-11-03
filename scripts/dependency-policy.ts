// A narrow, visible exception for one reviewed upstream advisory, not an audit bypass.
const knownPaths: Record<string, { via: string; node: string; direct: boolean }> = {
  '@agent-native/core': { via: '@agent-native/agentkit', node: 'node_modules/@agent-native/core', direct: true },
  '@agent-native/agentkit': { via: '@ag-ui/core', node: 'node_modules/@agent-native/agentkit', direct: false },
  '@ag-ui/core': { via: 'zod', node: 'node_modules/@agent-native/agentkit/node_modules/@ag-ui/core', direct: false },
  zod: { via: 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5', node: 'node_modules/@agent-native/agentkit/node_modules/zod', direct: false },
};
export function reviewDependencyAudit(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw Error('Invalid audit report.');
  const audit = raw as any;
  if (audit.error || !audit.vulnerabilities || !audit.metadata?.vulnerabilities) throw Error('Audit did not complete.');
  const findings = Object.entries(audit.vulnerabilities) as [string, any][];
  const unexpected: string[] = [];
  for (const [name, finding] of findings) {
    const policy = knownPaths[name];
    if (!policy || finding.severity !== 'high' || finding.isDirect !== policy.direct || !Array.isArray(finding.nodes) || finding.nodes.length !== 1 || finding.nodes[0] !== policy.node || !Array.isArray(finding.via) || finding.via.length !== 1) { unexpected.push(name); continue; }
    const via = finding.via[0];
    if (name === 'zod' ? !via || via.url !== policy.via || via.severity !== 'high' : via !== policy.via) unexpected.push(name);
  }
  if (unexpected.length) throw Error(`Unreviewed dependency findings: ${unexpected.join(', ')}. Review npm audit before release.`);
  if (Object.values(audit.metadata.vulnerabilities).some((n: any) => typeof n !== 'number' || n < 0) || audit.metadata.vulnerabilities.total !== findings.length) throw Error('Inconsistent audit report.');
  if (['info', 'low', 'moderate', 'high', 'critical'].reduce((sum, severity) => sum + audit.metadata.vulnerabilities[severity], 0) !== findings.length) throw Error('Inconsistent audit severity counts.');
  return { reviewedFindings: findings.length, summary: findings.length ? `${findings.length} remaining high package findings match the one reviewed nested Zod advisory. NOT vulnerability-free. See docs/DEPENDENCY-REVIEW.md. No new findings detected.` : 'No production dependency findings reported.' };
}
