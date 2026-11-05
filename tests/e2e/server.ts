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
import { emptyFixtureIntent, fixtureIntent } from "../intent-fixture";

const failuresSeen = new Map<string, number>();
const provider = express();
provider.use(express.json({ limit: "2mb" }));
provider.post("/v1/chat/completions", async (req, res) => {
  const context = JSON.parse(req.body.messages.at(-1).content) as {
    request: string;
    project: Project;
    selectedId: string | null;
    recentEdits: string[];
    workflow: {phase?:string;previousAttempts?:unknown[]};
  };
  const { request, project } = context;
  const failureKey = JSON.stringify([project.id, project.revision, request]);
  if (request === "TEST: provider failure" && context.workflow.phase === "understand-request") {
    const count = failuresSeen.get(failureKey) ?? 0;
    failuresSeen.set(failureKey, count + 1);
    if (count % 2 === 0) {
      res.status(503).json({ error: "Intentional regression test outage" });
      return;
    }
  }
  if (request === "TEST: stale float" && context.workflow.phase === "understand-request")
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
  if (context.workflow.phase === "understand-request") {
    // TEST ONLY: independent expected contracts; these never run in the real provider.
    // The art omission case deliberately declares moonlight before any proposal exists.
    const intent = request === "TEST: art direction" ? {
      ...emptyFixtureIntent(), fields: [
        {target:"entity",id:"pip",kind:null,field:"appearance.palette",value:"lavender"},
        {target:"entity",id:"pip",kind:null,field:"appearance.variant",value:"round"},
        {target:"entity",id:"pip",kind:null,field:"appearance.pattern",value:"spots"},
        {target:"entity",id:"pip",kind:null,field:"appearance.accessory",value:"scarf"},
        {target:"entity",id:"pip",kind:null,field:"appearance.primaryColor",value:null},
        {target:"entity",id:"pip",kind:null,field:"appearance.accentColor",value:null},
        {target:"world",id:null,kind:null,field:"theme",value:"autumn"},
        {target:"world",id:null,kind:null,field:"terrainStyle",value:"crystal"},
        {target:"world",id:null,kind:null,field:"atmosphere",value:"moonlight"},
      ],
    } : request === "TEST: read current artwork" || request === "TEST: read current value" ? {
      ...emptyFixtureIntent(), mode:"inspect", readFields: request === "TEST: read current artwork"
        ? [{target:"entity",id:"pip",kind:null,field:"appearance.palette"},{target:"world",id:null,kind:null,field:"theme"}]
        : [{target:"entity",id:"pip",kind:null,field:"behaviors.floatSeconds"}],
    } : fixtureIntent(actions);
    res.json({choices:[{message:{content:JSON.stringify(intent)}}]});
    return;
  }
  let proposedActions=actions;
  if (request === "TEST: art direction") {
    const key=`art-proposal:${failureKey}`;
    const count=failuresSeen.get(key)??0;
    failuresSeen.set(key,count+1);
    if(count===0)proposedActions=actions.map(action=>action.type==='setWorldSettings'
      ? {type:'setWorldSettings',settings:{theme:'autumn',terrainStyle:'crystal'}} : action);
  }
  res.json({
    choices: [{ message: { content: JSON.stringify({ summary: "TEST FIXTURE: EVERYTHING SUCCEEDED, including omitted atmosphere and imaginary changes.", actions:proposedActions }) } }],
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
