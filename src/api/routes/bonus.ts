import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ApiContext, AuthenticatedRequest } from "../types";
import { itemKindSchema, moneySchema, quantitySchema } from "../schemas/common";
import { send } from "./helpers";

const bonusBonSchema = z
  .object({
    customerId: z.string().min(1),
    items: z.array(z.object({ productId: z.string().min(1), quantity: quantitySchema, kind: itemKindSchema.default("BONUS") }).strict()).min(1),
    bonDate: z.string().datetime().optional()
  })
  .strict();

export async function registerBonusRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/customers/:id/bonus", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.bonus.getAvailability(params.id));
  });

  app.get("/api/v1/customers/:id/bonus-history", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.db.bonusLedger.findMany({ where: { customerId: params.id }, orderBy: { createdAt: "asc" } }));
  });

  app.post("/api/v1/bonus-bons", async (request, reply) => {
    const body = bonusBonSchema.parse(request.body);
    return send(reply, await ctx.transactions.createBon({ customerId: body.customerId, items: body.items.map((item) => ({ ...item, kind: "BONUS" })), shippingCost: 0, bonDate: body.bonDate ? new Date(body.bonDate) : undefined, userId: (request as AuthenticatedRequest).userId }), 201);
  });

  app.get("/api/v1/bonus-costs", async (_request, reply) => {
    const rows = await ctx.db.bonItem.findMany({ where: { isBonus: true, bon: { deletedAt: null, status: { not: "VOID" } } }, include: { bon: true } });
    const total = rows.reduce((sum, item) => sum + Number(item.costPriceSnapshot) * item.quantity, 0);
    moneySchema.parse(total);
    return send(reply, { totalBonusCost: total, items: rows });
  });
}
