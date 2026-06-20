import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ApiContext, AuthenticatedRequest } from "../types";
import { send } from "./helpers";

const categorySchema = z.enum(["TRANSACTION", "RECEIVABLE", "PAYMENT", "INVENTORY", "BONUS", "SECURITY", "SYSTEM"]);
const listSchema = z.object({
  mode: z.enum(["ALL", "UNREAD"]).optional(),
  category: categorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().optional()
}).strict();

export function registerNotificationRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/notifications", async (request, reply) => {
    const query = listSchema.parse(request.query);
    return send(reply, await ctx.notifications.list({
      userId: (request as AuthenticatedRequest).userId,
      ...query
    }));
  });

  app.post("/api/v1/notifications/:id/read", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.notifications.markRead((request as AuthenticatedRequest).userId, params.id));
  });

  app.post("/api/v1/notifications/read-all", async (request, reply) => {
    return send(reply, await ctx.notifications.markAllRead((request as AuthenticatedRequest).userId));
  });

  app.delete("/api/v1/notifications/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.notifications.dismiss((request as AuthenticatedRequest).userId, params.id));
  });

  app.get("/api/v1/notifications/stream", async (request, reply) => {
    const userId = (request as AuthenticatedRequest).userId;
    const origin = request.headers.origin;
    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...(origin ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin"
      } : {})
    });
    response.write("event: ready\ndata: {}\n\n");

    const unsubscribe = ctx.notifications.hub.subscribe(userId, (notification) => {
      response.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
    });
    const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 25_000);
    const close = () => {
      clearInterval(heartbeat);
      unsubscribe();
      if (!response.writableEnded) response.end();
    };
    request.raw.once("close", close);
    request.raw.once("aborted", close);
  });
}
