import { describe, expect, it } from "vitest";
import { createStarterProject } from "../src/shared/starter";
import { deriveEditImpact } from "../src/shared/edit-impact";

describe("safe authored edit impact", () => {
  it("preserves float, light, throw, atmosphere and metadata changes without mutating snapshots", () => {
    const before = createStarterProject(),
      after = structuredClone(before),
      saved = JSON.stringify(before);
    after.revision++;
    after.world.atmosphere = "moonlight";
    after.entities[0].behaviors.floatSeconds = 0.8;
    after.entities[0].locked = true;
    after.entities[1].behaviors.throwable = true;
    after.entities[1].name = "Little possibility";
    const result = deriveEditImpact(before, after);
    expect(result.mode).toBe("preserve");
    expect(result.entityChanges[0].fields).toContain("behaviors.floatSeconds");
    expect(result.affectedIds).toContain(after.entities[1].id);
    result.entityChanges[0].after!.name = "Preview clone";
    expect(after.entities[0].name).not.toBe("Preview clone");
    expect(JSON.stringify(before)).toBe(saved);
  });
  it("requires restart for geometry, terrain, gravity and occupied platform motion", () => {
    const before = createStarterProject();
    const variants = [
      (p: typeof before) => p.entities[0].x++,
      (p: typeof before) => p.terrain[0].height--,
      (p: typeof before) => p.world.gravity++,
      (p: typeof before) =>
        p.entities.find((e) => e.kind === "platform")!.behaviors.moveSpeed++,
      (p: typeof before) =>
        p.entities.find((e) => e.kind === "enemy")!.behaviors.patrolRange++,
    ];
    for (const mutate of variants) {
      const after = structuredClone(before);
      mutate(after);
      expect(deriveEditImpact(before, after).mode).toBe("restart");
    }
  });
  it("describes added, moved and removed geometry for pure visual overlays", () => {
    const before = createStarterProject(),
      after = structuredClone(before);
    after.terrain.shift();
    after.terrain[0].x += 20;
    after.terrain.push({
      id: "preview-step",
      x: 600,
      y: 400,
      width: 80,
      height: 20,
    });
    const result = deriveEditImpact(before, after);
    expect(
      result.terrainChanges.find((c) => c.id === "garden-floor")?.after,
    ).toBeNull();
    expect(
      result.terrainChanges.find((c) => c.id === "first-step")?.fields,
    ).toContain("x");
    expect(
      result.terrainChanges.find((c) => c.id === "preview-step")?.before,
    ).toBeNull();
  });
  it("classifies undo symmetrically and forces explicit import/reset restart", () => {
    const before = createStarterProject(),
      after = structuredClone(before);
    after.entities[0].behaviors.floatSeconds = 1;
    expect(deriveEditImpact(after, before).mode).toBe("preserve");
    expect(
      deriveEditImpact(before, before, {
        forceRestart: true,
        resetProgress: true,
        reason: "Imported project",
      }),
    ).toMatchObject({ mode: "restart", reason: "Imported project" });
    expect(deriveEditImpact(before, before, { resetProgress: true }).mode).toBe(
      "restart",
    );
  });
  it("does not restart for a revision-only change or irrelevant motion component", () => {
    const before = createStarterProject(),
      after = structuredClone(before);
    after.revision++;
    expect(deriveEditImpact(before, after).entityChanges).toEqual([]);
    after.entities[0].behaviors.moveSpeed++;
    expect(deriveEditImpact(before, after).mode).toBe("preserve");
  });
});
