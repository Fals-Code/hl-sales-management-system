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
import { CustomerNotificationService } from "../services/customerNotificationService";
import { NotificationDomainService } from "../services/notificationDomainService";
import { NotificationService } from "../services/notificationService";
import { ProductNotificationService } from "../services/productNotificationService";
import { ReportingService } from "../services/reportingService";
import { SettlementNotificationService } from "../services/settlementNotificationService";
import { TransactionNotificationService } from "../services/transactionNotificationService";
import { VoidNotificationService } from "../services/voidNotificationService";
import { prisma } from "../lib/prisma";
import { errorHandler } from "./errors/errorHandler";
import { authHook } from "./middleware/auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerBonRoutes } from "./routes/bons";
import { registerBonusRoutes } from "./routes/bonus";
import { registerBootstrapRoutes } from "./routes/bootstrap";
import { registerCustomerRoutes } from "./routes/customers";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerPdfRoutes } from "./routes/pdf";
import { registerProductRoutes } from "./routes/products";
import { registerReportRoutes } from "./routes/reports";
import { registerSettlementRoutes } from "./routes/settlements";
import type { ApiContext } from "./types";

export async function buildApp(
  options: { db?: PrismaClient; logger?: boolean } = {},
) {
  const db = options.db ?? prisma;
  const auth = new AuthService(db);
  const notifications = new NotificationService(db);
  const notificationDomain = new NotificationDomainService(db, notifications);
  const ctx: ApiContext = {
    db,
    auth,
    customers: new CustomerNotificationService(db, notificationDomain),
    products: new ProductNotificationService(db, notificationDomain),
    transactions: new TransactionNotificationService(db, auth, notificationDomain),
    settlements: new SettlementNotificationService(db, auth, notificationDomain),
    bonus: new BonusService(db),
    reports: new ReportingService(db),
    voids: new VoidNotificationService(db, auth, notificationDomain),
    notifications,
    cookieName: process.env.SESSION_COOKIE_NAME ?? "hl_session",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.SESSION_COOKIE_SECURE === "true",
      path: "/",
      maxAge: Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 12),
    },
  };

  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            redact: [
              "req.headers.cookie",
              "req.body.password",
              "req.body.ownerPin",
              "res.headers.set-cookie",
            ],
          },
    genReqId: (request) =>
      String(request.headers["x-request-id"] ?? randomUUID()),
  });

  const configuredFrontendOrigins = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setErrorHandler(errorHandler);
  await app.register(cookie);
  await app.register(helmet);
  await app.register(cors, {
    origin: (origin, callback) => {
      if (
        !origin ||
        configuredFrontendOrigins.includes(origin) ||
        isLocalDevelopmentOrigin(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await app.register(swagger, {
    openapi: {
      info: { title: "HL Backend API", version: "0.3.0" },
      components: {
        securitySchemes: {
          cookieAuth: { type: "apiKey", in: "cookie", name: ctx.cookieName },
        },
        schemas: {
          SuccessEnvelope: {
            type: "object",
            required: ["success", "data", "meta"],
            properties: {
              success: { type: "boolean", enum: [true] },
              data: {},
              meta: { type: "object", additionalProperties: true },
            },
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
                  fields: { type: "object", additionalProperties: true },
                },
              },
            },
          },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.addHook("onRoute", (routeOptions) => {
    if (!routeOptions.url.startsWith("/api/v1")) return;
    const isLogin = routeOptions.url === "/api/v1/auth/login";
    routeOptions.schema = {
      ...routeOptions.schema,
      tags: routeOptions.schema?.tags ?? [openApiTag(routeOptions.url)],
      security: isLogin ? [] : [{ cookieAuth: [] }],
    };
  });
  app.addHook("onSend", (request, reply, payload, done) => {
    reply.header("X-Request-Id", request.id);
    done(null, payload);
  });
  app.addHook("preHandler", authHook(ctx));

  app.get("/", () => ({
    success: true,
    data: {
      service: "HL Sales Management API",
      status: "running",
      health: "/health",
      documentation: "/docs",
      openapi: "/docs/json",
    },
    meta: {},
  }));
  app.get("/health", () => ({
    success: true,
    data: { status: "ok" },
    meta: {},
  }));
  app.get("/favicon.ico", (_request, reply) => reply.status(204).send());

  registerAuthRoutes(app, ctx);
  registerBootstrapRoutes(app, ctx);
  registerCustomerRoutes(app, ctx);
  registerProductRoutes(app, ctx);
  void registerBonRoutes(app, ctx);
  void registerSettlementRoutes(app, ctx);
  void registerBonusRoutes(app, ctx);
  registerNotificationRoutes(app, ctx);
  registerReportRoutes(app, ctx);
  void registerPdfRoutes(app, ctx);

  return app;
}

function isLocalDevelopmentOrigin(origin: string) {
  if (process.env.NODE_ENV === "production") return false;

  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = url.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;

    const private172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    return private172 !== null && Number(private172[1]) >= 16 && Number(private172[1]) <= 31;
  } catch {
    return false;
  }
}

function openApiTag(url: string) {
  if (url.includes("/auth/")) return "Authentication";
  if (url.includes("/bootstrap")) return "Bootstrap";
  if (url.includes("/notifications")) return "Notifications";
  if (url.includes("/customers"))
    return url.includes("bonus") ? "Bonus" : "Customers";
  if (url.includes("/products")) return "Products";
  if (url.includes("/bons")) return "Transactions";
  if (url.includes("/settlements") || url.includes("/payments"))
    return "Settlements";
  if (url.includes("/bonus")) return "Bonus";
  if (url.includes("/reports")) return "Reporting";
  if (url.includes("/pdf")) return "PDF";
  return "API";
}
