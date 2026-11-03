async (page) => {
  const read = () => page.evaluate(() => window.__wonderbox.getProject());
  const waitRevision = async (r) =>
    page.waitForFunction(
      (r) => window.__wonderbox.getProject().revision > r,
      r,
    );
  const report = [];
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  let p = await read();
  const canvas = page.locator(".game-host canvas");
  const b = await canvas.boundingBox();
  const scale = b.height / 720;
  const mouse = async (x, y) =>
    page.mouse.move(b.x + x * scale, b.y + y * scale);
  await page.getByRole("button", { name: "Terrain", exact: true }).click();
  await mouse(180, 400);
  await page.mouse.down();
  await mouse(260, 420);
  await page.mouse.up();
  await waitRevision(p.revision);
  let next = await read();
  if (next.terrain.length !== p.terrain.length + 1)
    throw Error("terrain paint failed");
  report.push("terrain paint");
  await page.getByRole("button", { name: "Undo (⌘Z)", exact: true }).click();
  if ((await read()).terrain.length !== p.terrain.length)
    throw Error("terrain undo failed");
  report.push("terrain undo");
  p = await read();
  await page.getByRole("button", { name: "Plant", exact: true }).click();
  await mouse(190, 550);
  await page.mouse.down();
  await page.mouse.up();
  await waitRevision(p.revision);
  next = await read();
  if (next.entities.length !== p.entities.length + 1)
    throw Error("plant placement failed");
  report.push("object placement");
  const placed = next.entities.find(
    (e) => !p.entities.some((a) => a.id === e.id),
  );
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await mouse(placed.x + 16, placed.y + 20);
  await page.mouse.down();
  await page.mouse.up();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await waitRevision(next.revision);
  if ((await read()).entities.length !== next.entities.length + 1)
    throw Error("duplicate failed");
  report.push("duplicate");
  p = await read();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await waitRevision(p.revision);
  if ((await read()).entities.length !== p.entities.length - 1)
    throw Error("delete failed");
  report.push("delete");
  await page.getByRole("button", { name: "Undo (⌘Z)", exact: true }).click();
  report.push("delete undo");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const before = await page.evaluate(
    () => window.__wonderbox.getDebugState().player.x,
  );
  await page
    .getByRole("textbox", { name: "Describe your game edit" })
    .fill("A D E Space typing focus check");
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyD");
  const after = await page.evaluate(
    () => window.__wonderbox.getDebugState().player.x,
  );
  if (Math.abs(before - after) > 1) throw Error("typing moved game");
  report.push("keyboard typing isolation");
  return { report, projectRevision: (await read()).revision };
}
