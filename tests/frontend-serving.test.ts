import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Fastify from "fastify";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerFrontendRoutes } from "../src/api/frontend";

let distRoot = "";
let previousDistDir: string | undefined;

beforeEach(async () => {
  previousDistDir = process.env.FRONTEND_DIST_DIR;
  distRoot = await mkdtemp(join(tmpdir(), "hl-frontend-"));
  await mkdir(join(distRoot, "assets"), { recursive: true });
  await writeFile(join(distRoot, "index.html"), "<!doctype html><html><body>HL APP</body></html>");
  await writeFile(join(distRoot, "assets", "app.js"), "console.log('hl');");
  process.env.FRONTEND_DIST_DIR = distRoot;
});

afterEach(async () => {
  if (previousDistDir === undefined) delete process.env.FRONTEND_DIST_DIR;
  else process.env.FRONTEND_DIST_DIR = previousDistDir;
  await rm(distRoot, { recursive: true, force: true });
});

describe("production frontend serving", () => {
  it("serves the SPA entry point at root", async () => {
    const app = Fastify();
    registerFrontendRoutes(app);

    const response = await app.inject({ method: "GET", url: "/" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.body).toContain("HL APP");
    await app.close();
  });

  it("serves hashed assets with immutable caching", async () => {
    const app = Fastify();
    registerFrontendRoutes(app);

    const response = await app.inject({ method: "GET", url: "/assets/app.js" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/javascript");
    expect(response.headers["cache-control"]).toContain("immutable");
    await app.close();
  });

  it("falls back to index.html for client-side routes", async () => {
    const app = Fastify();
    registerFrontendRoutes(app);

    const response = await app.inject({ method: "GET", url: "/reports" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("HL APP");
    await app.close();
  });

  it("does not turn missing API paths into frontend HTML", async () => {
    const app = Fastify();
    registerFrontendRoutes(app);

    const response = await app.inject({ method: "GET", url: "/api/v1/missing" });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
    await app.close();
  });
});
