import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { AuthService } from "../services/authService";
import { BonusService } from "../services/bonusService";
import { CustomerService } from "../services/customerService";
import { ProductService } from "../services/productService";
import { ReportingService } from "../services/reportingService";
import { SettlementService } from "../services/settlementService";
import { TransactionService } from "../services/transactionService";
import { VoidService } from "../services/voidService";
import { prisma } from "../lib/prisma";
import { errorHandler } from "./errors/errorHandler";
import { authHook } from "./middleware/auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerBonRoutes } from "./routes/bons";
import { registerBonusRoutes } from "./routes/bonus";
import { registerCustomerRoutes } from "./routes/customers";
import { registerPdfRoutes } from "./routes/pdf";
import { registerProductRoutes } from "./routes/products";
import { registerReportRoutes } from "./routes/reports";
import { registerSettlementRoutes } from "./routes/settlements";
import type { ApiContext } from "./types";

export async function buildApp(options: { db?: PrismaClient; logger?: boolean } = {}) {
  const db = options.db ?? prisma;
  const auth = new AuthService(db);
  const ctx: ApiContext = {
    db,
    auth,
    customers: new CustomerService(db),
    products: new ProductService(db),
    transactions: new TransactionService(db, auth),
    settlements: new SettlementService(db, auth),
    bonus: new BonusService(db),
    reports: new ReportingService(db),
    voids: new VoidService(db, auth),
    cookieName: process.env.SESSION_COOKIE_NAME ?? "hl_session",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.SESSION_COOKIE_SECURE === "true",
      path: "/",
      maxAge: Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 12)
    }
  };

  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            redact: ["req.headers.cookie", "req.body.password", "req.body.ownerPin", "res.headers.set-cookie"]
          },
    genReqId: (request) => String(request.headers["x-request-id"] ?? randomUUID())
  });

  app.setErrorHandler(errorHandler);
  await app.register(cookie);
  await app.register(helmet);
  await app.register(cors, { origin: process.env.FRONTEND_ORIGIN ?? false, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await app.register(swagger, {
    openapi: {
      info: { title: "HL Backend API", version: "0.2.0" },
      components: {
        securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: ctx.cookieName } },
        schemas: {
          SuccessEnvelope: {
            type: "object",
            required: ["success", "data", "meta"],
            properties: {
              success: { type: "boolean", enum: [true] },
              data: {},
              meta: { type: "object", additionalProperties: true }
            }
          },
          ErrorEnvelope: {
            type: "object",
            required: ["success", "error"],
            properties: {
              success: { type: "boolean", enum: [false] },
              error: {
                type: "object",
                required: ["code", "message", "fields"],
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                  fields: { type: "object", additionalProperties: true }
                }
              }
            }
          }
        }
      }
    }
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.addHook("onRoute", (routeOptions) => {
    if (!routeOptions.url.startsWith("/api/v1")) return;
    const isLogin = routeOptions.url === "/api/v1/auth/login";
    routeOptions.schema = {
      ...routeOptions.schema,
      tags: routeOptions.schema?.tags ?? [openApiTag(routeOptions.url)],
      security: isLogin ? [] : [{ cookieAuth: [] }]
    };
  });
  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("X-Request-Id", request.id);
    return payload;
  });
  app.addHook("preHandler", authHook(ctx));
  app.get("/health", async () => ({ success: true, data: { status: "ok" }, meta: {} }));

  await registerAuthRoutes(app, ctx);
  await registerCustomerRoutes(app, ctx);
  await registerProductRoutes(app, ctx);
  await registerBonRoutes(app, ctx);
  await registerSettlementRoutes(app, ctx);
  await registerBonusRoutes(app, ctx);
  await registerReportRoutes(app, ctx);
  await registerPdfRoutes(app, ctx);

  return app;
}

function openApiTag(url: string) {
  if (url.includes("/auth/")) return "Authentication";
  if (url.includes("/customers")) return url.includes("bonus") ? "Bonus" : "Customers";
  if (url.includes("/products")) return "Products";
  if (url.includes("/bons")) return "Transactions";
  if (url.includes("/settlements") || url.includes("/payments")) return "Settlements";
  if (url.includes("/bonus")) return "Bonus";
  if (url.includes("/reports")) return "Reporting";
  if (url.includes("/pdf")) return "PDF";
  return "API";
}
