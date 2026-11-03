import { test, expect, type Page } from "@playwright/test";
import { createStarterProject, makeEntity } from "../../src/shared/starter";
import type { Project } from "../../src/shared/model";

// Debug API is read-only. All mutations use real controls, including JSON import.
const project = (page: Page): Promise<Project> =>
  page.evaluate(() => (window as any).__wonderbox.getProject());
const state = (page: Page) =>
  page.evaluate(() => (window as any).__wonderbox.getDebugState());
const revisionAfter = async (page: Page, revision: number) => {
  await expect
    .poll(async () => (await project(page)).revision)
    .toBeGreaterThan(revision);
};
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const player = async (page: Page) =>
  (await project(page)).entities.find((e) => e.id === "pip")!;
async function loadProject(page: Page, value: Project) {
  const before = await project(page);
  await page.locator("input[type=file]").setInputFiles({
    name: "diagnostic-project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await revisionAfter(page, before.revision);
}
async function ask(page: Page, prompt: string) {
  await page
    .getByRole("textbox", { name: "Describe your game edit" })
    .fill(prompt);
  await button(page, "Send edit request").click();
  await page.locator(".thinking").waitFor({ state: "hidden" });
}
async function selectPlayer(page: Page) {
  await button(page, "◕ Pip · garden dreamer").click();
}
async function number(page: Page, name: string, value: string) {
  const revision = (await project(page)).revision;
  await page.getByRole("spinbutton", { name, exact: true }).fill(value);
  await page.getByRole("spinbutton", { name, exact: true }).press("Tab");
  await revisionAfter(page, revision);
}
async function worldMouse(page: Page, x: number, y: number) {
  // Allow React effects and Phaser's input/resize step to settle before canvas input.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  const box = (await page.locator(".game-host canvas").boundingBox())!;
  const camera = (await state(page)).cameraX;
  await page.mouse.move(
    box.x + ((x - camera) * box.height) / 720,
    box.y + (y * box.height) / 720,
  );
}
async function moveTo(page: Page, x: number) {
  const key = (await state(page)).player.x < x ? "KeyD" : "KeyA";
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      ({ x, right }) => {
        const runtime = (window as any).__wonderbox.getDebugState();
        if (runtime.won) return true;
        const p = runtime.player;
        return right ? p.x >= x : p.x <= x;
      },
      { x, right: key === "KeyD" },
      { timeout: 12_000, polling: "raf" },
    );
  } finally {
    await page.keyboard.up(key);
  }
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(
    () => (window as any).__wonderbox?.getDebugState()?.player,
  );
  await page.evaluate(() => document.fonts.ready);
  // Retain errors as an assertion in every flow; expected HTTP rejection paths aren't JS exceptions.
  (page as any).appErrors = errors;
});
test.afterEach(async ({ page }, info) => {
  expect((page as any).appErrors).toEqual([]);
  await page.screenshot({ path: info.outputPath("final-state.png") });
});

test("1. play → pause → resume, interact, checkpoint and gated victory without corrupting the level", async ({
  page,
}) => {
  const authored = await project(page);
  await moveTo(page, 180);
  await page.keyboard.down("Space");
  await expect.poll(async () => (await state(page)).player.y).toBeLessThan(530);
  await page.keyboard.up("Space");
  await page.keyboard.press("Escape");
  const paused = await state(page);
  await page.waitForTimeout(250); // Assert simulation really stays frozen while paused.
  expect((await state(page)).player).toEqual(paused.player);
  expect(await project(page)).toEqual(authored);
  await selectPlayer(page);
  await number(page, "Float duration (s)", "0.8");
  const afterFloat = await state(page);
  expect(afterFloat.player).toEqual(paused.player);
  expect(afterFloat.cameraX).toBe(paused.cameraX);
  expect(afterFloat.health).toBe(paused.health);
  await button(page, "☾ Moonlight").click();
  await expect
    .poll(async () => (await project(page)).world.atmosphere)
    .toBe("moonlight");
  expect((await state(page)).player).toEqual(paused.player);
  await button(page, "Undo (⌘Z)").click();
  await button(page, "Undo (⌘Z)").click();
  expect((await player(page)).behaviors.floatSeconds).toBe(0);
  expect((await state(page)).player).toEqual(paused.player);
  await button(page, "Play").click();
  await expect
    .poll(async () => (await state(page)).player.y)
    .not.toBe(paused.player.y);
  await page.keyboard.press("Escape");

  // A labeled diagnostic level makes interaction/victory deterministic, not a claim of
  // starter-world human usability. Imported through the same validated public UI.
  const diagnostic = createStarterProject();
  diagnostic.name = "TEST FIXTURE · interaction route";
  diagnostic.terrain = [diagnostic.terrain[0]];
  diagnostic.entities = [
    diagnostic.entities[0],
    makeEntity("plant", 170, 580, "test-plant", {
      behaviors: { throwable: true },
    }),
    makeEntity("enemy", 370, 580, "test-enemy", {
      behaviors: { patrolSpeed: 0, patrolRange: 0, transformOnHit: true },
    }),
    makeEntity("checkpoint", 520, 556, "test-checkpoint"),
    makeEntity("star", 700, 580, "test-star"),
    makeEntity("exit", 1050, 516, "exit", { behaviors: { requiredStars: 1 } }),
  ];
  await loadProject(page, diagnostic);
  const saved = await project(page);
  await button(page, "Play").click();
  await moveTo(page, 140);
  await page.keyboard.press("KeyE");
  await moveTo(page, 260);
  await page.keyboard.press("KeyE");
  await expect
    .poll(
      async () =>
        (await state(page)).entities.find((e: any) => e.id === "test-enemy")
          .transformed,
    )
    .toBe(true);
  // Jump over the transformed spring so the ground route remains a short smoke check.
  await page.keyboard.down("Space");
  await moveTo(page, 500);
  await page.keyboard.up("Space");
  await moveTo(page, 580);
  // Observe landing before crossing the checkpoint: slow renderers can overshoot it in the air.
  await page.waitForFunction(() => (window as any).__wonderbox.getDebugState().player.grounded, null, { timeout: 12_000 });
  await moveTo(page, 520);
  await expect
    .poll(async () => (await state(page)).checkpoint)
    .toBe("test-checkpoint");
  await page.getByTitle("Restart at checkpoint", { exact: true }).click();
  await expect.poll(async () => (await state(page)).player.x).toBeLessThan(580);
  await moveTo(page, 750);
  await expect
    .poll(async () => (await state(page)).stars)
    .toContain("test-star");
  await moveTo(page, 1050);
  await expect.poll(async () => (await state(page)).won).toBe(true);
  expect(await project(page)).toEqual(saved);
  await button(page, "Edit").click();
  // Removing an active checkpoint must discard its runtime reference.
  await loadProject(page, {
    ...diagnostic,
    entities: diagnostic.entities.filter((e) => e.kind !== "checkpoint"),
  });
  expect((await state(page)).checkpoint).toBe(null);
  await button(page, "Restart level").click();
  await expect.poll(async () => (await state(page)).stars.length).toBe(0);
  expect((await state(page)).won).toBe(false);
  expect((await state(page)).checkpoint).toBe(null);
});

test("2. direct creation, undo/redo, export/import, reload and typing isolation", async ({
  page,
}) => {
  await button(page, "Edit").click();
  const original = await project(page);
  await button(page, "Terrain").click();
  await worldMouse(page, 180, 400);
  await page.mouse.down();
  await worldMouse(page, 260, 420);
  await page.mouse.up();
  await revisionAfter(page, original.revision);
  expect((await project(page)).terrain).toHaveLength(
    original.terrain.length + 1,
  );
  await button(page, "Undo (⌘Z)").click();
  await expect
    .poll(async () => (await project(page)).terrain.length)
    .toBe(original.terrain.length);
  await button(page, "Redo (⌘⇧Z)").click();
  await expect
    .poll(async () => (await project(page)).terrain.length)
    .toBe(original.terrain.length + 1);
  await button(page, "Erase").click();
  const painted = (await project(page)).terrain.find(
    (t) => !original.terrain.some((previous) => previous.id === t.id),
  )!;
  await worldMouse(
    page,
    painted.x + painted.width / 2,
    painted.y + painted.height / 2,
  );
  await page.mouse.down();
  await page.mouse.up();
  await expect
    .poll(async () => (await project(page)).terrain.length)
    .toBe(original.terrain.length);
  await button(page, "Plant").click();
  await worldMouse(page, 190, 550);
  await page.mouse.down();
  await page.mouse.up();
  await expect
    .poll(async () => (await project(page)).entities.length)
    .toBe(original.entities.length + 1);
  await button(page, "Select").click();
  await worldMouse(page, 205, 565);
  await page.mouse.down();
  await page.mouse.up();
  await button(page, "Duplicate").click();
  await expect
    .poll(async () => (await project(page)).entities.length)
    .toBe(original.entities.length + 2);
  await button(page, "Delete").click();
  await expect
    .poll(async () => (await project(page)).entities.length)
    .toBe(original.entities.length + 1);
  await selectPlayer(page);
  await number(page, "Float duration (s)", "0.6");
  expect((await player(page)).behaviors.floatSeconds).toBe(0.6);
  const saved = await project(page);
  const downloadPromise = page.waitForEvent("download");
  await button(page, "Export project JSON").click();
  const download = await downloadPromise;
  const path = (await download.path())!;
  await button(page, "☾ Moonlight").click();
  await expect
    .poll(async () => (await project(page)).world.atmosphere)
    .toBe("moonlight");
  await page.locator("input[type=file]").setInputFiles(path);
  await expect
    .poll(async () => (await project(page)).world.atmosphere)
    .toBe(saved.world.atmosphere);
  let restored = await project(page);
  expect(restored.entities).toEqual(saved.entities);
  expect(restored.terrain).toEqual(saved.terrain);
  await page.reload();
  await page.waitForFunction(() => (window as any).__wonderbox?.getProject());
  expect(await project(page)).toEqual(restored);
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/invalid-project.json");
  await expect(
    page.getByText(
      "Import rejected. Use a valid Wonderbox v1 project under 2 MB. Your garden is unchanged.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(await project(page)).toEqual(restored);
  await button(page, "Play").click();
  // A key held BEFORE form focus must also be ignored.
  await page.keyboard.down("KeyD");
  await page.getByRole("textbox", { name: "Describe your game edit" }).focus();
  await page.waitForTimeout(100);
  const before = (await state(page)).player;
  await page.keyboard.type("A D E ");
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  expect(Math.abs((await state(page)).player.x - before.x)).toBeLessThan(1);
});

test("3. AI shared actions: focused edit, locks, preview, undo, current context, stale response and failure rollback", async ({
  page,
}) => {
  await selectPlayer(page);
  await ask(page, "TEST: float");
  expect((await player(page)).behaviors.floatSeconds).toBe(0.8);
  await button(page, "Undo (⌘Z)").click();
  expect((await player(page)).behaviors.floatSeconds).toBe(0);
  await number(page, "Float duration (s)", "0.4");
  await ask(page, "TEST: read current value");
  await expect(
    page.locator('.chat.agent').getByText(
      /TEST FIXTURE: current float is 0.4; selection pip; recent edits/,
    ),
  ).toBeVisible();
  let revision = (await project(page)).revision;
  await page.getByRole("checkbox", { name: "Lock against AI edits" }).click();
  await revisionAfter(page, revision);
  const locked = await project(page);
  await ask(page, "TEST: float");
  expect(await project(page)).toEqual(locked);
  await expect(
    page
      .locator(".chat")
      .filter({ hasText: /locked/i })
      .last(),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Lock against AI edits" }).click();
  await revisionAfter(page, locked.revision);
  const beforePreview = await project(page);
  await ask(page, "TEST: broad preview");
  await expect(button(page, "Apply changes")).toBeVisible();
  await expect(
    page.getByText("Remove Turnip sprout", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Canvas change legend")).toBeVisible();
  expect(await project(page)).toEqual(beforePreview);
  const beforeDiscard = await state(page);
  await button(page, "Show in garden").click();
  await button(page, "Discard").click();
  expect(await project(page)).toEqual(beforePreview);
  expect((await state(page)).player).toEqual(beforeDiscard.player);
  await ask(page, "TEST: broad preview");
  await button(page, "Apply changes").click();
  await revisionAfter(page, beforePreview.revision);
  expect(
    (await project(page)).entities.some((e) => e.id === "demo-plant"),
  ).toBe(false);
  await button(page, "Undo (⌘Z)").click();
  expect(
    (await project(page)).entities.some((e) => e.id === "demo-plant"),
  ).toBe(true);
  await ask(page, "TEST: broad preview");
  await expect(button(page, "Apply changes")).toBeVisible();
  await button(page, "☾ Moonlight").click();
  await expect
    .poll(async () => (await project(page)).world.atmosphere)
    .toBe("moonlight");
  await expect(button(page, "Apply changes")).toHaveCount(0);
  expect(
    (await project(page)).entities.some((e) => e.id === "demo-plant"),
  ).toBe(true);
  revision = (await project(page)).revision;
  await page
    .getByRole("textbox", { name: "Describe your game edit" })
    .fill("TEST: stale float");
  const request = page.waitForRequest("**/api/agent");
  await button(page, "Send edit request").click();
  await request;
  await button(page, "☀ Daydream").click();
  await revisionAfter(page, revision);
  await page.locator(".thinking").waitFor({ state: "hidden" });
  await expect(
    page.getByText(
      "Your garden changed while I was thinking. Ask again so I can use your latest edits.",
      { exact: true },
    ),
  ).toBeVisible();
  expect((await player(page)).behaviors.floatSeconds).toBe(0.4);
  const beforeFailure = await project(page);
  await ask(page, "TEST: provider failure");
  await expect(page.getByText(/temporarily unavailable/i)).toBeVisible();
  expect(await project(page)).toEqual(beforeFailure);
  await expect(button(page, "Retry request")).toBeVisible();
  await button(page, "Retry request").click();
  await page.locator(".thinking").waitFor({ state: "hidden" });
  await expect
    .poll(async () => (await player(page)).behaviors.floatSeconds)
    .toBe(0.8);
  expect((await project(page)).revision).toBe(beforeFailure.revision + 1);

  // A checked proposal uses a deterministic MODEL fixture, but real shared
  // inspection, preview, static checking, approval and Apply capabilities.
  await button(page, "Clear selection").click();
  await page.locator(".terrain-list summary").click();
  await button(page, "optional float ledge").click();
  await button(page, "Check this jump").click();
  await expect(page.locator(".route-evidence").first()).toBeVisible();
  // Restore base player ability so this path genuinely needs a terrain solution.
  await button(page, "Clear selection").click();
  await selectPlayer(page);
  await number(page, "Float duration (s)", "0");
  await button(page, "Clear selection").click();
  await page.locator(".terrain-list summary").click();
  await button(page, "optional float ledge").click();
  await button(page, "Check this jump").click();
  await expect(
    page.getByText("No route found in this check", { exact: true }),
  ).toBeVisible();
  const beforeExhaustion = await project(page);
  await ask(page, "TEST: exhaust ledge search");
  await expect(page.locator('.chat.agent').last()).toContainText('No checked edit was prepared');
  await expect(button(page, "Retry request")).toBeVisible();
  expect(await project(page)).toEqual(beforeExhaustion);
  await button(page, "Retry request").click();
  await expect(button(page, "Apply changes")).toBeVisible();
  await button(page, "Discard").click();
  expect(await project(page)).toEqual(beforeExhaustion);
  // The same deterministic mechanical planner is directly usable without a model.
  const beforeMechanical = await project(page);
  let modelCalls = 0;
  const countModelCalls = (request: import('@playwright/test').Request) => { if (request.url().endsWith('/api/agent')) modelCalls++; };
  page.on('request', countModelCalls);
  await button(page, "Preview a checked step").click();
  await expect(page.locator('.preview > strong')).toContainText('Mechanical tool preview');
  await expect(page.locator('.preview')).toContainText('no AI request');
  expect(await project(page)).toEqual(beforeMechanical);
  await button(page, "Discard").click();
  expect(await project(page)).toEqual(beforeMechanical);
  await button(page, "Preview a checked step").click();
  await button(page, "Apply changes").click();
  await revisionAfter(page, beforeMechanical.revision);
  expect((await project(page)).terrain).toHaveLength(beforeMechanical.terrain.length + 1);
  expect((await player(page)).behaviors.floatSeconds).toBe(0);
  await button(page, "Undo (⌘Z)").click();
  await expect.poll(async () => (await project(page)).terrain.length).toBe(beforeMechanical.terrain.length);
  expect(modelCalls).toBe(0);
  page.off('request', countModelCalls);
  const beforeChecked = await project(page);
  await button(page, "Make this ledge reachable").click();
  await page.locator(".thinking").waitFor({ state: "hidden" });
  await expect(button(page, "Apply changes")).toBeVisible();
  await expect(
    page.locator(".preview .route-evidence.route-found"),
  ).toBeVisible();
  await expect(page.getByLabel("Completed agent steps")).toBeVisible();
  expect(await project(page)).toEqual(beforeChecked);
  await button(page, "Apply changes").click();
  await revisionAfter(page, beforeChecked.revision);
  expect((await player(page)).behaviors.floatSeconds).toBe(0);
  expect((await project(page)).terrain).toHaveLength(
    beforeChecked.terrain.length + 1,
  );
  const checkedProject = await project(page);
  await button(page, "Replay checked route").click();
  await expect
    .poll(async () => (await state(page)).lastReplayResult, { timeout: 25000 })
    .toBe("reached");
  expect((await state(page)).mode).toBe("edit");
  expect((await state(page)).player.y).toBe(264);
  expect((await state(page)).player.grounded).toBe(true);
  expect(await project(page)).toEqual(checkedProject);
});
