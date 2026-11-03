import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { projectSchema } from "../src/shared/model";
import { actionSchema, applyTransaction } from "../src/shared/actions";
import { needsApproval } from "./approval";
import { checkRequestSchema } from '../src/shared/reachability';
import checkRoute from './check-reachability';
import { assertCheckedTerrainIntent } from './checked-intent';

/** The single authored mutation boundary for direct manipulation and the model. */
export const applyTransactionInput = z
  .object({
    project: projectSchema,
    actions: z.array(actionSchema).min(1).max(100),
    expectedRevision: z.number().int().nonnegative(),
    source: z.enum(["manual", "ai"]),
    approved: z.boolean().default(false),
    checkRequest: checkRequestSchema.optional(),
  })
  .strict();

export default defineAction({
  description:
    "Apply an atomic Wonderbox level edit. Validates components, world bounds, revisions and AI locks. Both the editor and creative partner use this capability.",
  schema: applyTransactionInput,
  run: async ({ project, actions, expectedRevision, source, approved, checkRequest }) => {
    if (source === "ai" && (needsApproval(actions) || checkRequest) && !approved)
      throw new Error(
        "This broad or destructive edit needs the Apply preview confirmation.",
      );
    const next = applyTransaction(project, actions, { expectedRevision, source });
    // Recompute against these exact current-revision actions. Client/model-supplied
    // evidence is never trusted, and a failed check discards the derived clone.
    if (checkRequest) {
      assertCheckedTerrainIntent(project, next, checkRequest);
      const { evidence } = await checkRoute.run({ project: next, check: checkRequest });
      if (!evidence.passed) throw new Error(`The edit did not pass its required route check. ${evidence.summary}`);
      return { project: next, evidence };
    }
    return { project: next };
  },
});
