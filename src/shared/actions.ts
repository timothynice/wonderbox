import { z } from "zod";
import {
  behaviorPatchSchema,
  appearancePatchSchema,
  entitySchema,
  projectSchema,
  terrainSchema,
  worldPatchSchema,
  cloneProject,
  type Project,
} from "./model.js";

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("addEntity"), entity: entitySchema }).strict(),
  z
    .object({
      type: z.literal("updateEntity"),
      id: z.string(),
      patch: entitySchema
        .omit({ id: true, kind: true, locked: true, behaviors: true, appearance: true })
        .partial()
        .extend({
          locked: z.boolean().optional(),
          behaviors: behaviorPatchSchema.optional(),
          appearance: appearancePatchSchema.optional(),
        }),
    })
    .strict(),
  z
    .object({
      type: z.literal("moveEntity"),
      id: z.string(),
      x: z.number(),
      y: z.number(),
    })
    .strict(),
  z.object({ type: z.literal("removeEntity"), id: z.string() }).strict(),
  z
    .object({
      type: z.literal("paintTerrain"),
      terrain: z.array(terrainSchema).max(200),
      eraseIds: z.array(z.string()).max(200).default([]),
    })
    .strict(),
  z
    .object({
      type: z.literal("setBehavior"),
      id: z.string(),
      behaviors: behaviorPatchSchema,
    })
    .strict(),
  z
    .object({ type: z.literal("setWorldSettings"), settings: worldPatchSchema })
    .strict(),
]);
export const transactionSchema = z
  .object({
    actions: z.array(actionSchema).min(1).max(100),
    summary: z.string().min(1).max(600),
  })
  .strict();
export type Action = z.infer<typeof actionSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type ActionSource = "manual" | "ai";
export function applyTransaction(
  project: Project,
  input: readonly Action[] | unknown,
  options: { expectedRevision?: number; source?: ActionSource } = {},
): Project {
  if (
    options.expectedRevision !== undefined &&
    options.expectedRevision !== project.revision
  )
    throw new Error(
      "The project changed while this edit was prepared. Ask again using the current world.",
    );
  const actions = z.array(actionSchema).min(1).max(100).parse(input);
  const next = cloneProject(project);
  for (const action of actions) {
    if ("id" in action) {
      const entity = next.entities.find((e) => e.id === action.id);
      if (!entity) throw new Error(`Object ${action.id} no longer exists.`);
      // Check the original as well so an AI cannot unlock an object and modify it in one transaction.
      if (
        options.source === "ai" &&
        (entity.locked ||
          project.entities.find((e) => e.id === action.id)?.locked)
      )
        throw new Error(`${entity.name} is locked against AI edits.`);
      if (action.type === "updateEntity") {
        if (options.source === "ai" && action.patch.locked !== undefined)
          throw new Error("Only you can change object locks.");
        const { behaviors, appearance, ...properties } = action.patch;
        Object.assign(entity, properties);
        if (behaviors) Object.assign(entity.behaviors, behaviors);
        if (appearance) Object.assign(entity.appearance, appearance);
      }
      if (action.type === "moveEntity") {
        entity.x = action.x;
        entity.y = action.y;
      }
      if (action.type === "setBehavior")
        Object.assign(entity.behaviors, action.behaviors);
      if (action.type === "removeEntity") {
        if (entity.kind === "player" || entity.kind === "exit")
          throw new Error(
            "Move the player spawn or exit instead of deleting it.",
          );
        next.entities = next.entities.filter((e) => e.id !== action.id);
      }
    } else if (action.type === "addEntity") {
      if (options.source === "ai" && action.entity.locked)
        throw new Error("Only you can change object locks.");
      if (
        [
          ...project.entities,
          ...project.terrain,
          ...next.entities,
          ...next.terrain,
        ].some((e) => e.id === action.entity.id)
      )
        throw new Error("New objects must have a fresh unique ID.");
      next.entities.push(action.entity);
    } else if (action.type === "paintTerrain") {
      const entityIds = new Set(
        [...project.entities, ...next.entities].map((e) => e.id),
      );
      if (
        [...action.eraseIds, ...action.terrain.map((t) => t.id)].some((id) =>
          entityIds.has(id),
        )
      )
        throw new Error("Terrain edits cannot target object IDs.");
      const replace = new Set([
        ...action.eraseIds,
        ...action.terrain.map((t) => t.id),
      ]);
      next.terrain = next.terrain.filter((t) => !replace.has(t.id));
      next.terrain.push(...action.terrain);
    } else if (action.type === "setWorldSettings")
      Object.assign(next.world, action.settings);
  }
  next.revision = project.revision + 1;
  return projectSchema.parse(next);
}
