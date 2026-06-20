import type { FastifyInstance } from "fastify";
import { BootstrapService } from "../../services/bootstrapService";
import type { ApiContext } from "../types";
import { send } from "./helpers";

export function registerBootstrapRoutes(app: FastifyInstance, ctx: ApiContext) {
  const bootstrap = new BootstrapService(ctx.db);
  app.get("/api/v1/bootstrap", async (_request, reply) =>
    send(reply, await bootstrap.load())
  );
}
