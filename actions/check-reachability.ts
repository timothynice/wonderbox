import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { projectSchema } from '../src/shared/model';
import { checkRequestSchema, checkReachability } from '../src/shared/reachability';

export const checkReachabilityInput = z.object({ project: projectSchema, check: checkRequestSchema }).strict();

export default defineAction({
  description: 'Check a specified static terrain destination with the same player motion and collision functions as the runtime. Returns bounded mechanical evidence; no-route-found is not impossibility or human-play proof.',
  schema: checkReachabilityInput,
  readOnly: true,
  run: async ({ project, check }) => ({ evidence: checkReachability(project, check) }),
});
