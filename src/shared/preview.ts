import { applyTransaction, type Action, type ActionSource } from "./actions";
import type { Project } from "./model";
import { deriveEditImpact, type EditImpact } from "./edit-impact";

export type TransactionPreview = {
  baseRevision: number;
  impact: EditImpact;
  affectedIds: string[];
  changes: string[];
};
const labels: Record<string, string> = {
  floatSeconds: "Float duration",
  throwable: "Pick up & throw",
  portableLight: "Portable light",
  lightRadius: "Light radius",
  fearsLight: "Retreat from light",
  transformOnHit: "Hit → bouncing platform",
  bounceSpeed: "Bounce strength",
  patrolSpeed: "Patrol speed",
  patrolRange: "Patrol distance",
  moveAxis: "Travel axis",
  moveDistance: "Travel distance",
  moveSpeed: "Travel speed",
  requiredStars: "Stars to unlock",
  atmosphere: "Atmosphere",
  gravity: "Gravity",
  width: "Width",
  height: "Height",
  x: "X",
  y: "Y",
  name: "Name",
  locked: "AI lock",
};
const value = (v: unknown) =>
  typeof v === "boolean" ? (v ? "on" : "off") : String(v);
const at = (object: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (v, key) =>
        v && typeof v === "object"
          ? (v as Record<string, unknown>)[key]
          : undefined,
      object,
    );
export function describeEditImpact(impact: EditImpact): string[] {
  const changes: string[] = [];
  for (const e of impact.entityChanges) {
    if (!e.before && e.after)
      changes.push(`Add ${e.after.name} at ${e.after.x}, ${e.after.y}`);
    else if (e.before && !e.after) changes.push(`Remove ${e.before.name}`);
    else if (e.before && e.after) {
      for (const field of e.fields) {
        if (field === "behaviors") {
          for (const key of Object.keys(e.after.behaviors)) {
            const before = at(e.before.behaviors, key),
              after = at(e.after.behaviors, key);
            if (before !== after)
              changes.push(
                `${e.after.name} · ${labels[key] ?? key}: ${value(before)} → ${value(after)}`,
              );
          }
        } else {
          const key = field.replace(/^behaviors\./, "");
          changes.push(
            `${e.after.name} · ${labels[key] ?? key}: ${value(at(e.before, field))} → ${value(at(e.after, field))}`,
          );
        }
      }
    }
  }
  for (const t of impact.terrainChanges) {
    if (!t.before && t.after)
      changes.push(
        `Add platform at ${t.after.x}, ${t.after.y} · ${t.after.width} × ${t.after.height}`,
      );
    else if (t.before && !t.after)
      changes.push(`Remove platform at ${t.before.x}, ${t.before.y}`);
    else if (t.before && t.after)
      changes.push(
        `Platform ${t.id}: ${t.before.x}, ${t.before.y} → ${t.after.x}, ${t.after.y} · ${t.after.width} × ${t.after.height}`,
      );
  }
  for (const world of impact.worldChanges)
    changes.push(
      `${labels[world.field] ?? world.field}: ${value(world.before)} → ${value(world.after)}`,
    );
  return changes;
}
/** Pure clone/validate/diff. Never touches history, persistence or runtime. */
export function buildTransactionPreview(
  project: Project,
  actions: readonly Action[],
  options: { source?: ActionSource; expectedRevision?: number } = {},
): TransactionPreview {
  const candidate = applyTransaction(project, actions, {
    source: options.source ?? "ai",
    expectedRevision: options.expectedRevision ?? project.revision,
  });
  const impact = deriveEditImpact(project, candidate);
  return {
    baseRevision: project.revision,
    impact,
    affectedIds: impact.affectedIds,
    changes: describeEditImpact(impact),
  };
}
