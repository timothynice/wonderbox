import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { projectSchema } from '../src/shared/model';
import { actionSchema, applyTransaction } from '../src/shared/actions';
import { buildTransactionPreview } from '../src/shared/preview';
import { checkRequestSchema } from '../src/shared/reachability';
import { assertCheckedTerrainIntent } from './checked-intent';

export const previewTransactionInput = z.object({
  project: projectSchema,
  actions: z.array(actionSchema).min(1).max(100),
  expectedRevision: z.number().int().nonnegative(),
  source: z.enum(['manual', 'ai']).default('manual'),
  checkRequest: checkRequestSchema.optional(),
}).strict();

export default defineAction({
  description: 'Validate and preview an authored Wonderbox transaction without applying it. Returns a human-readable diff, affected objects, revision and runtime impact, using the same preview as direct editing.',
  schema: previewTransactionInput,
  readOnly: true,
  run: async ({ project, actions, expectedRevision, source, checkRequest }) => {
    if (checkRequest) {
      const candidate = applyTransaction(project, actions, { expectedRevision, source });
      assertCheckedTerrainIntent(project, candidate, checkRequest);
    }
    return buildTransactionPreview(project, actions, { expectedRevision, source });
  },
});
