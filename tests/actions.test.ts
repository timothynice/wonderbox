import { describe, expect, it } from "vitest";
import { actionSchema, applyTransaction } from "../src/shared/actions";
import {
  ProjectHistory,
  loadProject,
  saveProject,
} from "../src/shared/history";
import { parseProject, serializeProject } from "../src/shared/model";
import { createStarterProject } from "../src/shared/starter";

describe("canonical project and atomic edits", () => {
  it("round-trips a complete original starter and rejects invalid imports", () => {
    const p = createStarterProject();
    expect(parseProject(serializeProject(p))).toEqual(p);
    expect(() => parseProject({ ...p, version: 2 })).toThrow();
    expect(() =>
      parseProject({ ...p, entities: [...p.entities, p.entities[0]] }),
    ).toThrow();
    expect(() =>
      parseProject({
        ...p,
        entities: p.entities.filter((e) => e.kind !== "player"),
      }),
    ).toThrow();
    expect(() => parseProject({ ...p, surpriseCode: "eval" })).toThrow();
  });
  it("rolls back the complete transaction when a later action fails", () => {
    const p = createStarterProject();
    const before = serializeProject(p);
    expect(() =>
      applyTransaction(p, [
        { type: "moveEntity", id: "pip", x: 220, y: 564 },
        { type: "setBehavior", id: "pip", behaviors: { floatSeconds: 90 } },
      ]),
    ).toThrow();
    expect(serializeProject(p)).toBe(before);
    expect(() =>
      applyTransaction(p, [{ type: "moveEntity", id: "pip", x: 6400, y: 564 }]),
    ).toThrow();
    expect(p.entities[0].x).toBe(100);
  });
  it("enforces locks in the action layer and allows a manual unlock", () => {
    const p = applyTransaction(createStarterProject(), [
      { type: "updateEntity", id: "pip", patch: { locked: true } },
    ]);
    expect(() =>
      applyTransaction(
        p,
        [{ type: "setBehavior", id: "pip", behaviors: { floatSeconds: 0.8 } }],
        { source: "ai" },
      ),
    ).toThrow(/locked/);
    expect(() =>
      applyTransaction(
        p,
        [
          { type: "updateEntity", id: "pip", patch: { locked: false } },
          { type: "moveEntity", id: "pip", x: 120, y: 564 },
        ],
        { source: "ai" },
      ),
    ).toThrow(/locked/);
    expect(
      applyTransaction(p, [
        { type: "updateEntity", id: "pip", patch: { locked: false } },
      ]).entities[0].locked,
    ).toBe(false);
  });
  it("rejects stale AI plans even after undo returns to a previous state", () => {
    const h = new ProjectHistory(createStarterProject());
    const revision = h.project.revision;
    h.execute([{ type: "moveEntity", id: "pip", x: 120, y: 564 }]);
    h.undo();
    expect(() =>
      h.execute(
        [{ type: "setWorldSettings", settings: { atmosphere: "moonlight" } }],
        { expectedRevision: revision, source: "ai" },
      ),
    ).toThrow(/changed/);
    expect(h.project.entities[0].x).toBe(100);
  });
  it("undos and redos an entire AI transaction atomically", () => {
    const h = new ProjectHistory(createStarterProject());
    h.execute(
      [
        { type: "setBehavior", id: "pip", behaviors: { floatSeconds: 0.8 } },
        { type: "setWorldSettings", settings: { atmosphere: "moonlight" } },
      ],
      { source: "ai", expectedRevision: 0 },
    );
    expect(h.project.entities[0].behaviors.floatSeconds).toBe(0.8);
    h.undo();
    expect(h.project.world.atmosphere).toBe("day");
    expect(h.project.entities[0].behaviors.floatSeconds).toBe(0);
    h.redo();
    expect(h.project.world.atmosphere).toBe("moonlight");
    expect(h.project.entities[0].behaviors.floatSeconds).toBe(0.8);
  });
  it("persists only authored data across storage round trips", () => {
    const data = new Map<string, string>();
    const storage = {
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
      getItem: (k: string) => data.get(k) ?? null,
    };
    expect(loadProject(storage)).toBeNull();
    const p = createStarterProject();
    saveProject(p, storage);
    expect(loadProject(storage)).toEqual(p);
  });
  it("keeps terrain replacement and singleton invariants predictable", () => {
    const p = createStarterProject();
    const next = applyTransaction(p, [
      {
        type: "paintTerrain",
        terrain: [{ id: "new-step", x: 200, y: 500, width: 64, height: 24 }],
        eraseIds: ["first-step"],
      },
    ]);
    expect(next.terrain.some((t) => t.id === "first-step")).toBe(false);
    expect(next.terrain.some((t) => t.id === "new-step")).toBe(true);
    expect(() =>
      applyTransaction(p, [{ type: "removeEntity", id: "exit" }]),
    ).toThrow();
  });
  it("preserves omitted behavior and world properties in partial edits", () => {
    let p = applyTransaction(createStarterProject(), [
      {
        type: "setBehavior",
        id: "pip",
        behaviors: { throwable: true, portableLight: true, lightRadius: 275 },
      },
      {
        type: "setBehavior",
        id: "mossling",
        behaviors: { transformOnHit: true, patrolSpeed: 73 },
      },
      {
        type: "setWorldSettings",
        settings: { width: 3400, height: 800, gravity: 1700 },
      },
    ]);
    expect(
      actionSchema.parse({
        type: "setBehavior",
        id: "pip",
        behaviors: { floatSeconds: 0.8 },
      }),
    ).toEqual({
      type: "setBehavior",
      id: "pip",
      behaviors: { floatSeconds: 0.8 },
    });
    expect(
      actionSchema.parse({
        type: "setWorldSettings",
        settings: { atmosphere: "moonlight" },
      }),
    ).toEqual({
      type: "setWorldSettings",
      settings: { atmosphere: "moonlight" },
    });
    p = applyTransaction(
      p,
      [
        { type: "setBehavior", id: "pip", behaviors: { floatSeconds: 0.8 } },
        {
          type: "setBehavior",
          id: "mossling",
          behaviors: { fearsLight: true },
        },
        { type: "setWorldSettings", settings: { atmosphere: "moonlight" } },
      ],
      { source: "ai" },
    );
    expect(p.entities[0].behaviors).toMatchObject({
      floatSeconds: 0.8,
      throwable: true,
      portableLight: true,
      lightRadius: 275,
    });
    expect(
      p.entities.find((e) => e.id === "mossling")?.behaviors,
    ).toMatchObject({
      transformOnHit: true,
      fearsLight: true,
      patrolSpeed: 73,
    });
    expect(p.world).toEqual({
      ...createStarterProject().world,
      width: 3400,
      height: 800,
      gravity: 1700,
      atmosphere: "moonlight",
    });
  });
  it("merges partial updateEntity behaviors without resetting a lock or siblings", () => {
    let p = applyTransaction(createStarterProject(), [
      { type: "updateEntity", id: "pip", patch: { locked: true } },
      { type: "setBehavior", id: "pip", behaviors: { portableLight: true } },
    ]);
    p = applyTransaction(p, [
      {
        type: "updateEntity",
        id: "pip",
        patch: { name: "New name", behaviors: { floatSeconds: 1 } },
      },
    ]);
    expect(p.entities[0].locked).toBe(true);
    expect(p.entities[0].behaviors).toMatchObject({
      floatSeconds: 1,
      portableLight: true,
    });
  });
  it("cannot bypass locks through terrain IDs or object replacement", () => {
    const p = applyTransaction(createStarterProject(), [
      { type: "updateEntity", id: "mossling", patch: { locked: true } },
    ]);
    expect(() =>
      applyTransaction(
        p,
        [{ type: "paintTerrain", terrain: [], eraseIds: ["mossling"] }],
        { source: "ai" },
      ),
    ).toThrow(/object IDs/);
    expect(() =>
      applyTransaction(
        p,
        [
          {
            type: "paintTerrain",
            terrain: [
              { id: "mossling", x: 100, y: 300, width: 80, height: 24 },
            ],
            eraseIds: [],
          },
        ],
        { source: "ai" },
      ),
    ).toThrow(/object IDs/);
    expect(() =>
      applyTransaction(
        p,
        [
          { type: "removeEntity", id: "mossling" },
          {
            type: "addEntity",
            entity: {
              ...p.entities.find((e) => e.id === "mossling")!,
              locked: false,
            },
          },
        ],
        { source: "ai" },
      ),
    ).toThrow(/locked/);
    expect(() =>
      applyTransaction(
        p,
        [
          { type: "removeEntity", id: "shadebug" },
          {
            type: "addEntity",
            entity: p.entities.find((e) => e.id === "shadebug")!,
          },
        ],
        { source: "ai" },
      ),
    ).toThrow(/fresh unique ID/);
  });
});
