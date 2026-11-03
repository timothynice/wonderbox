import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import applyEdit from "../actions/apply-transaction";
import { createStarterProject } from "../src/shared/starter";
import { proposeEdit, needsApproval, affectedObjects } from "../server/agent";
import type { Action } from "../src/shared/actions";
import { app } from "../server/index";

describe("Agent-Native shared mutation and creative partner boundary", () => {
  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-key-never-sent");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  const response = (value: unknown) =>
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(value) }] } },
          ],
        }),
        { status: 200 },
      ),
    );
  it("uses the real defineAction for the same manual and AI transaction", async () => {
    const project = createStarterProject();
    const player = project.entities.find((e) => e.kind === "player")!;
    const actions: Action[] = [
      { type: "setBehavior", id: player.id, behaviors: { floatSeconds: 0.65 } },
    ];
    const manual = await applyEdit.run({
      project,
      actions,
      expectedRevision: 0,
      source: "manual",
    });
    const ai = await applyEdit.run({
      project,
      actions,
      expectedRevision: 0,
      source: "ai",
    });
    expect(ai).toEqual(manual);
    expect(
      ai.project.entities.find((e) => e.id === player.id)?.behaviors
        .floatSeconds,
    ).toBe(0.65);
    expect(project.revision).toBe(0);
    await expect(
      applyEdit.run({ project, actions, expectedRevision: 99, source: "ai" }),
    ).rejects.toThrow(/changed/);
  });
  it("forwards current context and validates model edits without mutating the supplied project", async () => {
    const project = createStarterProject();
    const player = project.entities.find((e) => e.kind === "player")!;
    const actions: Action[] = [
      { type: "setBehavior", id: player.id, behaviors: { floatSeconds: 0.65 } },
    ];
    const fetcher = response({
      actions,
      summary: "Pip can float briefly while holding jump.",
    });
    const result = await proposeEdit(
      {
        project,
        selectedId: player.id,
        prompt: "Let me float.",
        recentContext: ["Moved the plant."],
      },
      fetcher,
    );
    expect(result.baseRevision).toBe(0);
    expect(result.requiresApproval).toBe(false);
    expect(result.affectedIds).toEqual([player.id]);
    expect(
      project.entities.find((e) => e.id === player.id)?.behaviors.floatSeconds,
    ).toBe(0);
    const requestBody = JSON.parse(fetcher.mock.calls[0][1]?.body as string);
    expect(requestBody.contents[0].parts[0].text).toContain("Moved the plant.");
    expect(requestBody.contents[0].parts[0].text).toContain(player.id);
    const grammar = requestBody.generationConfig.responseJsonSchema;
    expect(grammar.properties.actions.items.properties.type.enum).toContain(
      "setBehavior",
    );
    expect(grammar.properties.actions.items).not.toHaveProperty("oneOf");
    // Prompt retains the full, bounded schema; the decoder grammar is intentionally looser.
    expect(requestBody.systemInstruction.parts[0].text).toContain(
      '"maximum":2',
    );
  });
  it("rejects locked edits even when the model proposes one", async () => {
    const project = createStarterProject();
    const player = project.entities.find((e) => e.kind === "player")!;
    player.locked = true;
    await expect(
      proposeEdit(
        { project, prompt: "Float" },
        response({
          summary: "Float",
          actions: [
            {
              type: "setBehavior",
              id: player.id,
              behaviors: { floatSeconds: 1 },
            },
          ],
        }),
      ),
    ).rejects.toThrow(/locked/);
    expect(player.behaviors.floatSeconds).toBe(0);
  });
  it("rejects invalid output and never applies the valid prefix", async () => {
    const project = createStarterProject();
    await expect(
      proposeEdit(
        { project, prompt: "Change it" },
        response({
          summary: "A change",
          actions: [
            { type: "setWorldSettings", settings: { atmosphere: "day" } },
            { type: "executeCode", code: "evil" },
          ],
        }),
      ),
    ).rejects.toThrow(/invalid/);
    expect(project.revision).toBe(0);
  });
  it("handles unsupported requests, quotas and missing credentials truthfully", async () => {
    const project = createStarterProject();
    const result = await proposeEdit(
      { project, prompt: "Add multiplayer" },
      response({
        summary: "Multiplayer is unavailable. I can add another enemy.",
        actions: [],
      }),
    );
    expect(result.actions).toEqual([]);
    await expect(
      proposeEdit(
        { project, prompt: "Float" },
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("{}", { status: 429 })),
      ),
    ).rejects.toThrow(/quota/);
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(proposeEdit({ project, prompt: "Float" })).rejects.toThrow(
      /not connected/,
    );
  });
  it("requires preview for destructive and broad changes regardless of model claims", () => {
    expect(needsApproval([{ type: "removeEntity", id: "plant" }])).toBe(true);
    expect(
      needsApproval([
        { type: "paintTerrain", terrain: [], eraseIds: ["floor"] },
      ]),
    ).toBe(true);
    expect(
      needsApproval(
        Array.from({ length: 5 }, () => ({
          type: "setBehavior",
          id: "player",
          behaviors: { floatSeconds: 1 },
        })),
      ),
    ).toBe(true);
    expect(
      affectedObjects(
        [{ type: "setWorldSettings", settings: { atmosphere: "moonlight" } }],
        createStarterProject(),
      ).length,
    ).toBeGreaterThan(1);
  });
  it("refuses a broad AI commit without explicit Apply approval", async () => {
    const project = createStarterProject();
    const enemy = project.entities.find((e) => e.kind === "enemy")!;
    const actions: Action[] = [{ type: "removeEntity", id: enemy.id }];
    await expect(
      applyEdit.run({ project, actions, expectedRevision: 0, source: "ai" }),
    ).rejects.toThrow(/Apply preview/);
    const result = await applyEdit.run({
      project,
      actions,
      expectedRevision: 0,
      source: "ai",
      approved: true,
    });
    expect(result.project.entities.some((e) => e.id === enemy.id)).toBe(false);
  });
  it("handles timeouts without a transaction and supports the OpenAI adapter", async () => {
    const project = createStarterProject();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
    await expect(
      proposeEdit(
        { project, prompt: "Float" },
        vi.fn<typeof fetch>().mockRejectedValue(new Error("aborted")),
      ),
    ).rejects.toThrow(/too long/);
    vi.restoreAllMocks();
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("AI_BASE_URL", "https://example.invalid/v1");
    vi.stubEnv("AI_MODEL", "example-model");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Unsupported; I can move terrain instead.",
                  actions: [],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const result = await proposeEdit(
      { project, prompt: "Add multiplayer" },
      fetcher,
    );
    expect(result.provider).toBe("openai");
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://example.invalid/v1/chat/completions",
    );
    const options = fetcher.mock.calls[0][1]!;
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-openai-key",
    });
    expect(options.body).not.toContain("test-openai-key");
  });
  it("uses one real alternate request only on503 and identifies the actual model", async () => {
    vi.stubEnv("AI_MODEL", "unavailable-primary");
    vi.stubEnv("AI_FALLBACK_MODEL", "available-fallback");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        summary: "The fallback supports this edit.",
                        actions: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    const result = await proposeEdit(
      { project: createStarterProject(), prompt: "Float" },
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0][0])).toContain("unavailable-primary");
    expect(String(fetcher.mock.calls[1][0])).toContain("available-fallback");
    expect(result.model).toBe("available-fallback");
    expect(result.usedFallback).toBe(true);
    expect(result.primaryModel).toBe("unavailable-primary");
    expect(result.providerNotice).toContain("available-fallback");
    fetcher.mockClear().mockResolvedValue(new Response("{}", { status: 429 }));
    await expect(
      proposeEdit(
        { project: createStarterProject(), prompt: "Float" },
        fetcher,
      ),
    ).rejects.toThrow(/quota/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("HTTP API release boundary", () => {
  let server: Server;
  let base: string;
  const realFetch = globalThis.fetch;
  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, "127.0.0.1", (error) =>
        error ? reject(error) : resolve(),
      );
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  const post = (path: string, body: unknown) =>
    realFetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  it("health never returns credentials and missing configuration returns a clear 503", async () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    const health = await (await realFetch(`${base}/api/health`)).json();
    expect(health.configured).toBe(false);
    expect(health).not.toHaveProperty("apiKey");
    const response = await post("/api/agent", {
      project: createStarterProject(),
      prompt: "Float",
    });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("not connected");
  });
  it("rejects invalid projects and locked transactions with no state changes", async () => {
    const invalid = await post("/api/agent", { project: {}, prompt: "Float" });
    expect(invalid.status).toBe(400);
    const project = createStarterProject();
    project.entities[0].locked = true;
    const locked = await post("/api/action", {
      project,
      expectedRevision: 0,
      source: "ai",
      actions: [
        { type: "moveEntity", id: project.entities[0].id, x: 10, y: 10 },
      ],
    });
    expect(locked.status).toBe(422);
    expect((await locked.json()).error).toContain("locked");
    expect(project.revision).toBe(0);
  });
  it("returns provider failures, invalid model output and timeouts safely", async () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const stub = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 429 }));
    const quota = await post("/api/agent", {
      project: createStarterProject(),
      prompt: "Float",
    });
    expect(quota.status).toBe(429);
    expect((await quota.json()).error).toContain("quota");
    stub.mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: '{"actions":[{"type":"runCode"}],"summary":"Oops"}' },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const invalid = await post("/api/agent", {
      project: createStarterProject(),
      prompt: "Float",
    });
    expect(invalid.status).toBe(502);
    expect((await invalid.json()).error).toContain("invalid edit");
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
    stub.mockRejectedValue(new Error("aborted"));
    const timeout = await post("/api/agent", {
      project: createStarterProject(),
      prompt: "Float",
    });
    expect(timeout.status).toBe(504);
    expect((await timeout.json()).error).toContain("Nothing changed");
  });
});
