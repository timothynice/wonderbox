import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { projectSchema, behaviorSchema } from '../src/shared/model';

export const inspectProjectInput = z.object({
  project: projectSchema,
  selectedId: z.string().max(100).nullable().optional(),
  targetTerrainId: z.string().max(100).optional(),
  sourceTerrainId: z.string().max(100).optional(),
}).strict();

export default defineAction({
  description: 'Inspect the current authored Wonderbox project, selection, locked objects, and supported component limits before editing or checking a route.',
  schema: inspectProjectInput,
  readOnly: true,
  run: async ({ project, selectedId, targetTerrainId, sourceTerrainId }) => ({
    projectId: project.id,
    revision: project.revision,
    world: project.world,
    selectedEntity: project.entities.find(e => e.id === selectedId) ?? null,
    selectedTerrain: project.terrain.find(t => t.id === selectedId) ?? null,
    targetTerrain: project.terrain.find(t => t.id === targetTerrainId) ?? null,
    sourceTerrain: project.terrain.find(t => t.id === sourceTerrainId) ?? null,
    lockedIds: project.entities.filter(e => e.locked).map(e => e.id),
    counts: { entities: project.entities.length, terrain: project.terrain.length, stars: project.entities.filter(e => e.kind === 'star').length },
    supportedComponents: z.toJSONSchema(behaviorSchema),
    limitations: ['Authored state only; transient runtime positions are excluded.', 'Reachability checks are bounded static-terrain mechanical searches, not proof of human completion.'],
  }),
});
