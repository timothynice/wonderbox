import type { Project } from '../src/shared/model';
import { checkReachability, type CheckRequest } from '../src/shared/reachability';

/** A checked terrain-edit promise has a fixed meaning independent of the prompt.
 * It cannot be satisfied by moving the goal, changing the character or changing
 * global physics. Ordinary behavior edits and manual checks remain separate. */
export function assertCheckedTerrainIntent(before: Project, after: Project, request: CheckRequest): void {
  const playerBefore = before.entities.find(e => e.kind === 'player');
  const playerAfter = after.entities.find(e => e.kind === 'player');
  if (JSON.stringify(playerBefore) !== JSON.stringify(playerAfter)) throw new Error('Checked terrain edits must preserve the player, spawn and all character behaviors. Use a regular behavior edit separately.');
  for (const key of ['width', 'height', 'gravity'] as const) {
    if (before.world[key] !== after.world[key]) throw new Error(`Checked terrain edits must preserve world ${key}.`);
  }
  const sourceId = request.sourceTerrainId ?? checkReachability(before, request).sourceTerrainId;
  for (const [label, id] of [['target', request.targetTerrainId], ['source', sourceId]] as const) {
    if (!id) throw new Error(`A checked terrain edit needs an existing canonical ${label} surface.`);
    const original = before.terrain.find(t => t.id === id);
    const candidate = after.terrain.find(t => t.id === id);
    if (!original || !candidate || JSON.stringify(original) !== JSON.stringify(candidate)) throw new Error(`Checked terrain edits must preserve the ${label} surface (${id}). Add or adjust intermediate terrain instead.`);
  }
}
