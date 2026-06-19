import type { FastifyInstance } from "fastify";
import type { ApiContext } from "../types";
import { send } from "./helpers";

export function registerBootstrapRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/bootstrap", async (_request, reply) =>
    send(reply, await ctx.bootstrap.load())
  );
}
