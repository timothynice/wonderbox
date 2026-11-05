// TEST ONLY: deterministic model transport fixture. Never imported by the app.
// The real server still parses/validates these proposals and executes shared actions.
import express from "express";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const shareDirectory = mkdtempSync(path.join(tmpdir(), "wonderbox-e2e-shares-"));
process.env.SHARE_DIRECTORY = shareDirectory;
for (const name of ["BLOB_READ_WRITE_TOKEN", "BLOB_STORE_ID", "VERCEL", "AI_ACCESS_CODE", "AI_PUBLIC_UNTIL"]) delete process.env[name];
process.once("exit", () => rmSync(shareDirectory, {recursive:true,force:true}));
import type { Action } from "../../src/shared/actions";
import type { Project } from "../../src/shared/model";

const failuresSeen = new Map<string, number>();
const provider = express();
provider.use(express.json({ limit: "2mb" }));
provider.post("/v1/chat/completions", async (req, res) => {
  const context = JSON.parse(req.body.messages.at(-1).content) as {
    request: string;
    project: Project;
    selectedId: string | null;
    recentEdits: string[];
  };
  const { request, project } = context;
  const failureKey = JSON.stringify([project.id, project.revision, request]);
  if (request === "TEST: provider failure") {
    const count = failuresSeen.get(failureKey) ?? 0;
    failuresSeen.set(failureKey, count + 1);
    if (count % 2 === 0) {
      res.status(503).json({ error: "Intentional regression test outage" });
      return;
    }
  }
  if (request === "TEST: stale float")
    await new Promise((r) => setTimeout(r, 1500));
  if (request === "TEST: exhaust ledge search") {
    const count = failuresSeen.get(failureKey) ?? 0;
    failuresSeen.set(failureKey, count + 1);
    const actions: Action[] = count % 4 < 3 ? [] : [{ type: "paintTerrain", terrain: [{ id: `retry-step-${project.revision}`, x: 480, y: 420, width: 120, height: 24 }], eraseIds: [] }];
    res.json({ choices: [{ message: { content: JSON.stringify({ summary: "TEST FIXTURE: bounded candidate attempt.", actions }) } }] });
    return;
  }
  const actions: Action[] = request === "TEST: art direction"
    ? [
        { type: "updateEntity", id: "pip", patch: { appearance: {palette:"lavender", variant:"round", pattern:"spots", accessory:"scarf",primaryColor:null,accentColor:null} } },
        { type: "setWorldSettings", settings: {theme:"autumn",terrainStyle:"crystal",atmosphere:"moonlight"} },
      ]
    : request === "TEST: read current artwork"
      ? []
      : request.includes("Make this ledge reachable")
    ? [
        {
          type: "paintTerrain",
          terrain: [
            {
              id: `test-checked-step-${project.revision}`,
              x: 480,
              y: 420,
              width: 120,
              height: 24,
            },
          ],
          eraseIds: [],
        },
      ]
    : request === "TEST: broad preview"
      ? [{ type: "removeEntity", id: "demo-plant" }]
      : request === "TEST: read current value"
        ? []
        : [
            {
              type: "setBehavior",
              id: "pip",
              behaviors: { floatSeconds: 0.8 },
            },
          ];
  const summary =
    request === "TEST: read current artwork"
      ? `TEST FIXTURE: current palette ${project.entities.find(e=>e.id==='pip')!.appearance.palette}; theme ${project.world.theme}; selection ${context.selectedId}; recent edits ${context.recentEdits.length}.`
      : request === "TEST: read current value"
      ? `TEST FIXTURE: current float is ${project.entities.find((e) => e.id === "pip")!.behaviors.floatSeconds}; selection ${context.selectedId}; recent edits ${context.recentEdits.length}.`
      : "TEST FIXTURE: validated gameplay proposal.";
  res.json({
    choices: [{ message: { content: JSON.stringify({ summary, actions }) } }],
  });
});
const listener = provider.listen(49118, "127.0.0.1");
process.env.NODE_ENV = "production";
process.env.PORT = "49117";
process.env.HOST = "127.0.0.1";
process.env.AI_PROVIDER = "openai";
process.env.AI_BASE_URL = "http://127.0.0.1:49118/v1";
process.env.AI_MODEL = "deterministic-test-fixture";
process.env.OPENAI_API_KEY = "local-test-fixture-no-real-credential";
process.env.AI_FALLBACK_MODEL = "";
await import("../../server/index");
process.on("SIGTERM", () => {
  listener.close();
  process.exit(0);
});
