import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ApiContext, AuthenticatedRequest } from "../types";
import { send } from "./helpers";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) }).strict();
const pinSchema = z.object({ ownerPin: z.string().min(1) }).strict();

export function registerAuthRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.post("/api/v1/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const session = await ctx.auth.login(body.username, body.password);
    reply.setCookie(ctx.cookieName, session.token, { ...ctx.cookieOptions, expires: session.expiresAt });
    await ctx.notifications.publish({
      userId: session.userId,
      eventKey: "auth-login",
      category: "SECURITY",
      severity: "INFO",
      title: "Login berhasil",
      message: "Sesi pengguna berhasil dimulai.",
      targetUrl: "#/settings",
      entityId: "global",
      expiresAt: new Date(Date.now() + 7 * 86_400_000)
    }).catch(() => undefined);
    return send(reply, { userId: session.userId, expiresAt: session.expiresAt });
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const token = request.cookies[ctx.cookieName];
    const userId = (request as AuthenticatedRequest).userId;
    if (token) await ctx.auth.logout(token);
    await ctx.notifications.publish({
      userId,
      eventKey: "auth-logout",
      category: "SECURITY",
      severity: "INFO",
      title: "Logout berhasil",
      message: "Sesi pengguna telah diakhiri.",
      targetUrl: "#/settings",
      entityId: "global",
      expiresAt: new Date(Date.now() + 7 * 86_400_000)
    }).catch(() => undefined);
    reply.clearCookie(ctx.cookieName, { path: "/" });
    return send(reply, {});
  });

  app.get("/api/v1/auth/me", async (request, reply) => {
    const user = await ctx.db.user.findUniqueOrThrow({ where: { id: (request as AuthenticatedRequest).userId } });
    return send(reply, { id: user.id, username: user.username });
  });

  app.post("/api/v1/auth/verify-owner-pin", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const body = pinSchema.parse(request.body);
    await ctx.auth.validateOwnerPin((request as AuthenticatedRequest).userId, body.ownerPin);
    return send(reply, { valid: true });
  });
}
