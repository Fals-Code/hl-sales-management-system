import type { FastifyInstance, FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

export function registerFrontendRoutes(app: FastifyInstance) {
  const distRoot = resolve(process.cwd(), process.env.FRONTEND_DIST_DIR ?? "frontend/dist");
  const indexPath = resolve(distRoot, "index.html");

  app.get("/", async (_request, reply) => sendFrontendFile(reply, indexPath, false));

  app.get("/*", async (request, reply) => {
    const wildcard = String((request.params as { "*"?: string })["*"] ?? "");

    if (isBackendPath(wildcard)) {
      return reply.code(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan.", fields: {} }
      });
    }

    let relativePath: string;
    try {
      relativePath = decodeURIComponent(wildcard).replace(/^[/\\]+/, "");
    } catch {
      return reply.code(400).send({
        success: false,
        error: { code: "INVALID_PATH", message: "Path tidak valid.", fields: {} }
      });
    }

    const candidate = resolve(distRoot, relativePath || "index.html");
    if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${sep}`)) {
      return reply.code(400).send({
        success: false,
        error: { code: "INVALID_PATH", message: "Path tidak valid.", fields: {} }
      });
    }

    const asset = await readOptional(candidate);
    if (asset) return sendBuffer(reply, candidate, asset, relativePath.startsWith("assets/"));

    if (extname(relativePath)) {
      return reply.code(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "File tidak ditemukan.", fields: {} }
      });
    }

    return sendFrontendFile(reply, indexPath, false);
  });
}

function isBackendPath(path: string) {
  return path === "health" || path === "favicon.ico" || path === "docs" || path.startsWith("docs/") || path === "api" || path.startsWith("api/");
}

async function sendFrontendFile(reply: FastifyReply, path: string, immutable: boolean) {
  const data = await readOptional(path);
  if (!data) {
    return reply.code(503).send({
      success: false,
      error: {
        code: "FRONTEND_NOT_BUILT",
        message: "Frontend production belum tersedia. Jalankan build frontend sebelum memulai server.",
        fields: {}
      }
    });
  }
  return sendBuffer(reply, path, data, immutable);
}

function sendBuffer(reply: FastifyReply, path: string, data: Buffer, immutable: boolean) {
  const type = MIME_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
  reply.type(type);
  reply.header("Cache-Control", immutable ? "public, max-age=31536000, immutable" : "no-cache");
  return reply.send(data);
}

async function readOptional(path: string) {
  try {
    return await readFile(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EISDIR") return null;
    throw error;
  }
}
