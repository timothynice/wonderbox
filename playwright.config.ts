import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 90_000,
  expect: { timeout: 8_000 },
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/playwright/report", open: "never" }],
  ],
  outputDir: "output/playwright/regression",
  use: {
    baseURL: "http://127.0.0.1:4317",
    viewport: { width: 1440, height: 900 },
    browserName: "chromium",
    channel: process.env.PW_CHANNEL || "chromium",
    // Hosted Linux runners have no GPU. Exercise Phaser's real Canvas fallback there.
    launchOptions: process.env.PW_CANVAS === "1" ? { args: ["--disable-webgl"] } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx tsx tests/e2e/server.ts",
    url: "http://127.0.0.1:4317/api/health",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
