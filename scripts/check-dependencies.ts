import { spawnSync } from 'node:child_process';
import { reviewDependencyAudit } from './dependency-policy';
const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
try {
  if (result.error || (result.status !== 0 && result.status !== 1)) throw Error('Could not complete npm audit. Check network/registry access.');
  console.log(reviewDependencyAudit(JSON.parse(result.stdout)).summary);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Dependency review failed.');
  process.exitCode = 1;
}
