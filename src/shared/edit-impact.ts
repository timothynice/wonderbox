import type { Entity, Project, Terrain, WorldSettings } from "./model";

export type ObjectChange<T extends { id: string }> = {
  id: string;
  before: T | null;
  after: T | null;
  fields: string[];
};
export type EditImpact = {
  baseRevision: number;
  nextRevision: number;
  mode: "preserve" | "restart";
  reason: string;
  affectedIds: string[];
  entityChanges: ObjectChange<Entity>[];
  terrainChanges: ObjectChange<Terrain>[];
  worldChanges: {
    field: keyof WorldSettings;
    before: number | string;
    after: number | string;
  }[];
};
export type ReconcileOptions = {
  forceRestart?: boolean;
  resetProgress?: boolean;
  reason?: string;
};
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
function changedObjects<T extends { id: string }>(
  before: T[],
  after: T[],
): ObjectChange<T>[] {
  const old = new Map(before.map((e) => [e.id, e]));
  const next = new Map(after.map((e) => [e.id, e]));
  return [...new Set([...old.keys(), ...next.keys()])].flatMap((id) => {
    const a = old.get(id),
      b = next.get(id);
    if (equal(a, b)) return [];
    const fields =
      a && b
        ? [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(
            (key) => {
              const av = a[key as keyof T],
                bv = b[key as keyof T];
              if (equal(av, bv)) return [];
              if (key === "behaviors")
                return Object.keys(av as object)
                  .filter(
                    (field) =>
                      !equal(
                        (av as Record<string, unknown>)[field],
                        (bv as Record<string, unknown>)[field],
                      ),
                  )
                  .map((field) => `behaviors.${field}`);
              return [key];
            },
          )
        : [a ? "removed" : "added"];
    return [
      {
        id,
        before: a ? structuredClone(a) : null,
        after: b ? structuredClone(b) : null,
        fields,
      },
    ];
  });
}
/** Classify validated authored snapshots, never model-provided intent labels.
 * Motion/geometry changes rebuild conservatively. Cosmetic and bounded component
 * toggles can be copied onto existing live bodies without refilling run state.
 */
export function deriveEditImpact(
  before: Project,
  after: Project,
  options: ReconcileOptions = {},
): EditImpact {
  const entityChanges = changedObjects(before.entities, after.entities);
  const terrainChanges = changedObjects(before.terrain, after.terrain);
  const worldChanges = (Object.keys(before.world) as (keyof WorldSettings)[])
    .filter((field) => before.world[field] !== after.world[field])
    .map((field) => ({
      field,
      before: before.world[field],
      after: after.world[field],
    }));
  let reason: string | null =
    options.forceRestart || options.resetProgress
      ? options.reason || "Project replacement restarts the simulation."
      : null;
  if (!reason && before.id !== after.id)
    reason = "A different project starts a fresh simulation.";
  if (!reason && worldChanges.some((c) => c.field !== "atmosphere"))
    reason =
      "World size or gravity changed; restart at a valid checkpoint or spawn.";
  if (!reason && terrainChanges.length)
    reason = "Terrain changed; restart at a valid checkpoint or spawn.";
  if (!reason)
    for (const change of entityChanges) {
      if (
        !change.before ||
        !change.after ||
        change.fields.some((f) =>
          ["kind", "x", "y", "width", "height"].includes(f),
        )
      ) {
        reason =
          "Object geometry changed; restart at a valid checkpoint or spawn.";
        break;
      }
      const motionFields =
        change.after.kind === "platform"
          ? ["moveAxis", "moveDistance", "moveSpeed"]
          : change.after.kind === "enemy"
            ? ["patrolSpeed", "patrolRange"]
            : [];
      if (
        change.fields.some((f) =>
          motionFields.some((m) => f === `behaviors.${m}`),
        )
      ) {
        reason =
          "Motion parameters changed; restart to keep moving bodies and riders aligned.";
        break;
      }
    }
  return {
    baseRevision: before.revision,
    nextRevision: after.revision,
    mode: reason ? "restart" : "preserve",
    reason:
      reason ||
      "Resume here. Position, progress, health, and moving-platform phase are preserved.",
    affectedIds: [
      ...new Set([...entityChanges, ...terrainChanges].map((c) => c.id)),
    ],
    entityChanges,
    terrainChanges,
    worldChanges,
  };
}
