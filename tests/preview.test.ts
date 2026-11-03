import { describe, it, expect } from "vitest";
import { createStarterProject } from "../src/shared/starter";
import { buildTransactionPreview } from "../src/shared/preview";

describe("pure, readable transaction previews", () => {
  it("shows a focused behavior diff without applying or changing authored values", () => {
    const project = createStarterProject(),
      original = structuredClone(project);
    const result = buildTransactionPreview(project, [
      { type: "setBehavior", id: "pip", behaviors: { floatSeconds: 0.8 } },
    ]);
    expect(project).toEqual(original);
    expect(result.baseRevision).toBe(0);
    expect(result.impact.mode).toBe("preserve");
    expect(result.affectedIds).toEqual(["pip"]);
    expect(result.changes).toContain(
      "Pip · garden dreamer · Float duration: 0 → 0.8",
    );
  });
  it("keeps before/after geometry for render-only ghosts and announces a restart", () => {
    const project = createStarterProject();
    const result = buildTransactionPreview(project, [
      { type: "moveEntity", id: "demo-plant", x: 300, y: 580 },
      {
        type: "paintTerrain",
        terrain: [
          { id: "checked-step", x: 480, y: 420, width: 120, height: 24 },
        ],
        eraseIds: [],
      },
    ]);
    expect(result.impact.mode).toBe("restart");
    expect(result.impact.entityChanges[0].before?.x).toBe(250);
    expect(result.impact.entityChanges[0].after?.x).toBe(300);
    expect(result.impact.terrainChanges[0].before).toBe(null);
    expect(result.changes).toContain("Add platform at 480, 420 · 120 × 24");
  });
  it("rejects locked, stale and invalid proposals with no partial preview result", () => {
    const project = createStarterProject();
    project.entities[0].locked = true;
    expect(() =>
      buildTransactionPreview(project, [
        { type: "setBehavior", id: "pip", behaviors: { floatSeconds: 1 } },
      ]),
    ).toThrow(/locked/);
    expect(() =>
      buildTransactionPreview(
        project,
        [{ type: "setWorldSettings", settings: { atmosphere: "moonlight" } }],
        { expectedRevision: 99 },
      ),
    ).toThrow(/changed/);
    expect(() =>
      buildTransactionPreview(project, [
        { type: "setWorldSettings", settings: { gravity: 99999 } },
      ]),
    ).toThrow();
    expect(project.revision).toBe(0);
  });
});
