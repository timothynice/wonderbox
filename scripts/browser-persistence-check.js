async (page) => {
  const read = () => page.evaluate(() => window.__wonderbox.getProject());
  const report = [];
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset demo", exact: true })
    .last()
    .click();
  let original = await read();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project JSON", exact: true })
    .click();
  const download = await pending;
  await download.saveAs("output/playwright/exported-project.json");
  report.push("export download");
  await page.getByRole("button", { name: "☾ Moonlight", exact: true }).click();
  await page.waitForFunction(
    (r) => window.__wonderbox.getProject().revision > r,
    original.revision,
  );
  let changed = await read();
  if (changed.world.atmosphere !== "moonlight")
    throw Error("atmosphere edit failed");
  await page
    .locator("input[type=file]")
    .setInputFiles("output/playwright/exported-project.json");
  await page.waitForFunction(
    (r) => window.__wonderbox.getProject().revision > r,
    changed.revision,
  );
  let restored = await read();
  if (
    restored.world.atmosphere !== original.world.atmosphere ||
    restored.entities.length !== original.entities.length
  )
    throw Error("import mismatch");
  report.push("validated export/import round trip");
  await page.reload();
  await page.waitForFunction(() => window.__wonderbox?.getProject());
  let reloaded = await read();
  if (reloaded.revision !== restored.revision)
    throw Error("reload lost revision");
  report.push("reload durable project");
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/invalid-project.json");
  await page
    .getByText(
      "Import rejected. Use a valid Wonderbox v1 project under 2 MB. Your garden is unchanged.",
      { exact: true },
    )
    .waitFor();
  if ((await read()).revision !== restored.revision)
    throw Error("invalid import mutated state");
  report.push("invalid import rollback");
  return { report, revision: restored.revision };
};
