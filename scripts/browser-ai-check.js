async (page) => {
  const read = () => page.evaluate(() => window.__wonderbox.getProject());
  const waitRevision = async (r) =>
    page.waitForFunction(
      (r) => window.__wonderbox.getProject().revision > r,
      r,
    );
  const report = [];
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset demo", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .count()
    .then(async (n) => {
      if (n)
        await page
          .getByRole("button", { name: "Clear selection", exact: true })
          .click();
    });
  await page
    .getByRole("button", { name: "◕ Pip · garden dreamer", exact: true })
    .click();
  let p = await read();
  await page.getByRole("spinbutton", { name: "Float duration (s)" }).fill("1");
  await page
    .getByRole("spinbutton", { name: "Float duration (s)" })
    .press("Tab");
  await waitRevision(p.revision);
  if (
    (await read()).entities.find((e) => e.id === "pip").behaviors
      .floatSeconds !== 1
  )
    throw Error("manual float failed");
  report.push("manual inspector float");
  p = await read();
  await page.getByRole("checkbox", { name: "Lock against AI edits" }).click();
  await waitRevision(p.revision);
  p = await read();
  const ask = async (text) => {
    await page
      .getByRole("textbox", { name: "Describe your game edit" })
      .fill(text);
    await page.getByRole("button", { name: "Send edit request" }).click();
    await page
      .locator(".thinking")
      .waitFor({ state: "hidden", timeout: 65000 });
  };
  await ask("Set Pip float duration to 1.5 seconds.");
  if ((await read()).revision !== p.revision)
    throw Error("AI lock allowed mutation");
  report.push("locked player live AI no mutation");
  await page.getByRole("checkbox", { name: "Lock against AI edits" }).click();
  await waitRevision(p.revision);
  p = await read();
  await ask(
    "Add three stars and require exactly three stars to open the exit. Preserve all existing objects.",
  );
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .waitFor();
  if ((await read()).revision !== p.revision)
    throw Error("broad edit applied before approval");
  report.push("broad preview no mutation");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await waitRevision(p.revision);
  let next = await read();
  if (
    next.entities.filter((e) => e.kind === "star").length !== 6 ||
    next.entities.find((e) => e.kind === "exit").behaviors.requiredStars !== 3
  )
    throw Error("broad apply incorrect");
  report.push("explicit Apply transaction");
  p = next;
  await page
    .getByRole("textbox", { name: "Describe your game edit" })
    .fill("Set Pip float duration to 1.1 seconds.");
  await page.getByRole("button", { name: "Send edit request" }).click();
  await page.getByRole("button", { name: "☾ Moonlight", exact: true }).click();
  await waitRevision(p.revision);
  await page.locator(".thinking").waitFor({ state: "hidden", timeout: 65000 });
  next = await read();
  if (next.entities.find((e) => e.id === "pip").behaviors.floatSeconds !== 1)
    throw Error("stale AI overwrote edit");
  await page
    .getByText(
      "Your garden changed while I was thinking. Ask again so I can use your latest edits.",
      { exact: true },
    )
    .waitFor();
  report.push("stale live response rejected");
  return {
    report,
    revision: next.revision,
    stars: next.entities.filter((e) => e.kind === "star").length,
  };
}
