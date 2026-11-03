import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { projectSchema } from '../src/shared/model';
import { applyTransaction, type Action } from '../src/shared/actions';
import { checkReachability, checkRequestSchema, type ReachabilityEvidence } from '../src/shared/reachability';
import { overlaps } from '../src/game/physics';
import previewTransaction from './preview-transaction';

const MAX_ATTEMPTS = 24;
const MAX_OPTIONS = 3;
export default defineAction({
  description: 'Find up to three mechanically checked, additive stepping-stone options in a bounded geometric search. This is a deterministic planning tool, not model output. It never changes the project. Uses the same static motion checker, locks, unchanged-character scope and preview boundary as Apply.',
  schema: z.object({ project: projectSchema, check: checkRequestSchema }).strict(),
  readOnly: true,
  run: async ({ project, check }) => {
    const baseline = checkReachability(project, check);
    const options: { actions: Action[]; evidence: ReachabilityEvidence; preview: Awaited<ReturnType<typeof previewTransaction.run>> }[] = [];
    let attempts = 0;
    if (baseline.status !== 'no-route-found') return { baseRevision: project.revision, options, attempts, maxAttempts: MAX_ATTEMPTS, baseline, summary: baseline.summary };
    const target = project.terrain.find(t => t.id === check.targetTerrainId)!;
    const player = project.entities.find(e => e.kind === 'player')!;
    const width = Math.max(80, Math.min(160, Math.ceil(player.width * 2.5 / 20) * 20));
    const snap = (n: number) => Math.round(n / 20) * 20;
    // Coordinates derive from the destination and player size; no starter IDs/layout constants.
    const xs = [target.x + target.width, target.x - width, snap(target.x + (target.width - width) / 2), snap(target.x + target.width + width / 2), snap(target.x - width * 1.5), snap(target.x + width)];
    const ys = [60, 80, 100, 120].map(gap => snap(target.y + gap));
    const seen = new Set<string>();
    for (const y of ys) for (const x of xs) {
      if (attempts >= MAX_ATTEMPTS || options.length >= MAX_OPTIONS) break;
      if (seen.has(`${x},${y}`)) continue;
      seen.add(`${x},${y}`);
      const rect = { x, y, width, height: 24 };
      if (x < 0 || y < player.height || x + width > project.world.width || y + rect.height > project.world.height || project.terrain.some(t => overlaps(t, rect)) || project.entities.some(e => overlaps(e, rect))) continue;
      let id = `step-${x}-${y}`, suffix = 0;
      while (project.terrain.some(t => t.id === id) || project.entities.some(e => e.id === id)) id = `step-${x}-${y}-${++suffix}`;
      const actions: Action[] = [{ type: 'paintTerrain', terrain: [{ id, ...rect }], eraseIds: [] }];
      attempts++;
      const candidate = applyTransaction(project, actions, { source: 'ai', expectedRevision: project.revision });
      const evidence = checkReachability(candidate, check);
      if (!evidence.passed) continue;
      const preview = await previewTransaction.run({ project, actions, source: 'ai', expectedRevision: project.revision, checkRequest: check });
      options.push({ actions, evidence, preview });
    }
    return { baseRevision: project.revision, options, attempts, maxAttempts: MAX_ATTEMPTS, baseline, summary: options.length ? `Found ${options.length} mechanically checked step options after ${attempts} bounded candidate checks. Nothing applied; preview and Apply are still required.` : `No checked step option found in ${attempts} candidate checks. This limited search does not prove impossibility. Try direct editing or a more specific request.` };
  },
});
