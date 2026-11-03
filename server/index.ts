import "dotenv/config";
import express from "express";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import applyEdit from "../actions/apply-transaction";
import { proposeEdit, providerConfig, ProviderError } from "./agent";
import inspectProject from '../actions/inspect-project';
import previewTransaction from '../actions/preview-transaction';
import checkReachability from '../actions/check-reachability';
import planStaticStep from '../actions/plan-static-step';

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
// The release is a local, account-free editor. Do not expose a credentialed server publicly without access control.
app.use("/api", (req, res, next) => {
  const origin = req.get("origin");
  if (origin) {
    let hostname: string;
    try {
      hostname = new URL(origin).hostname;
    } catch {
      res.status(403).json({ error: "This request has an invalid origin." });
      return;
    }
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(hostname) &&
      process.env.ALLOWED_ORIGIN !== origin &&
      !(process.env.VERCEL && [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).some(host => origin === `https://${host}`))
    ) {
      res
        .status(403)
        .json({
          error: "This editor server only accepts its configured origin.",
        });
      return;
    }
  }
  next();
});
app.get("/api/health", (_req, res) => {
  const config = providerConfig();
  res.json({
    ok: true,
    configured: Boolean(config.apiKey),
    accessCodeRequired: Boolean(process.env.AI_ACCESS_CODE),
    provider: config.provider,
    model: config.model,
    framework: "@agent-native/core",
    version: "1.0.0",
  });
});
app.post("/api/action", async (req, res) => {
  try {
    res.json(await applyEdit.run(req.body));
  } catch (error) {
    res
      .status(422)
      .json({
        error:
          error instanceof Error
            ? error.message.slice(0, 600)
            : "The edit could not be applied. Nothing changed.",
      });
  }
});
for (const [endpoint, capability] of [
  ['/api/inspect', inspectProject], ['/api/preview', previewTransaction], ['/api/check', checkReachability], ['/api/step-options', planStaticStep],
] as const) {
  app.post(endpoint, async (req, res) => {
    try { res.json(await capability.run(req.body)); }
    catch (error) {
      res.status(422).json({ error: error instanceof Error ? error.message.slice(0, 600) : 'The capability could not complete. Nothing changed.' });
    }
  });
}
let inFlight = 0;
app.post("/api/agent", async (req, res) => {
  const accessCode = process.env.AI_ACCESS_CODE;
  const supplied = req.get("x-wonderbox-access-code") || "";
  if (accessCode && (Buffer.byteLength(supplied) !== Buffer.byteLength(accessCode) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(accessCode)))) {
    res.status(401).json({ error: "Enter the shared AI access code in the creative partner panel. Nothing changed." });
    return;
  }
  if (process.env.VERCEL && !accessCode) {
    res.status(503).json({ error: "The hosted AI is waiting for its access code configuration. Direct editing remains available." });
    return;
  }
  if (inFlight >= 3) {
    res
      .status(429)
      .json({
        error: "The creative partner is busy. Please try again shortly.",
      });
    return;
  }
  inFlight++;
  try {
    res.json(await proposeEdit(req.body));
  } catch (error) {
    const status =
      error instanceof ProviderError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    res
      .status(status)
      .json({
        error:
          error instanceof ProviderError
            ? error.message
            : error instanceof ZodError
              ? "The project or request is invalid. Nothing changed."
              : "The creative partner encountered an error. Nothing changed.",
        ...(error instanceof ProviderError && error.activity ? { activity: error.activity } : {}),
      });
  } finally {
    inFlight--;
  }
});
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "dist",
  );
  app.use(express.static(root));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(root, "index.html")),
  );
}
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const tooLarge =
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.too.large";
    res
      .status(tooLarge ? 413 : 400)
      .json({
        error: tooLarge
          ? "Project request exceeds 2 MB. Nothing changed."
          : "The server could not read this request. Nothing changed.",
      });
  },
);
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL)
  app.listen(
    Number(process.env.PORT || 3001),
    process.env.HOST || "127.0.0.1",
    () =>
      console.log(
        `Wonderbox API ready on http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3001}`,
      ),
  );
