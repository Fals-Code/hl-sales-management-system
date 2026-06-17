import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApiContext } from "../types";
import { unauthorized } from "../errors/httpErrors";

export function authHook(ctx: ApiContext) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.url.startsWith("/api/v1")) return;
    if (request.url.startsWith("/api/v1/auth/login")) return;
    const token = request.cookies[ctx.cookieName];
    if (!token) throw unauthorized();
    const user = await ctx.auth.getUserBySession(token);
    if (!user) throw unauthorized();
    Object.assign(request, { userId: user.id });
  };
}
