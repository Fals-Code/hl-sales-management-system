import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BON_NUMBER_PATTERN, normalizeBonNumber } from "../../domain/bonNumber";
import { toSafeMoneyNumber } from "../../domain/money";
import type { ApiContext, AuthenticatedRequest } from "../types";
import { quantitySchema } from "../schemas/common";
import { send } from "./helpers";

const dateInputSchema = z.string().refine((value) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
  return !Number.isNaN(date.getTime());
}, "Tanggal Bon tidak valid.");

const bonusBonSchema = z
  .object({
    bonNumber: z.string().trim().regex(BON_NUMBER_PATTERN, "Format Nomor Bon tidak valid."),
    customerId: z.string().min(1),
    description: z.string().trim().max(1000).optional(),
    items: z.array(z.object({ productId: z.string().min(1), quantity: quantitySchema, kind: z.literal("BONUS").optional() }).strict()).min(1),
    bonDate: dateInputSchema.optional()
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
    return send(
      reply,
      await ctx.transactions.createBon({
        bonNumber: normalizeBonNumber(body.bonNumber),
        customerId: body.customerId,
        description: body.description,
        items: body.items.map((item) => ({ ...item, kind: "BONUS" })),
        shippingCost: 0,
        bonDate: body.bonDate ? (/^\d{4}-\d{2}-\d{2}$/.test(body.bonDate) ? new Date(`${body.bonDate}T00:00:00.000Z`) : new Date(body.bonDate)) : undefined,
        userId: (request as AuthenticatedRequest).userId
      }),
      201
    );
  });

  app.get("/api/v1/bonus-costs", async (_request, reply) => {
    const rows = await ctx.db.bonItem.findMany({
      where: { isBonus: true, bon: { deletedAt: null, status: { not: "VOID" } } },
      include: { bon: true }
    });
    const total = rows.reduce((sum, item) => sum + item.costPriceSnapshot * BigInt(item.quantity), 0n);
    return send(reply, { totalBonusCost: toSafeMoneyNumber(total, "totalBonusCost"), items: rows });
  });
}
