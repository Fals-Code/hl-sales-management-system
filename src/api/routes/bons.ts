import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ApiContext, AuthenticatedRequest } from "../types";
import { itemKindSchema, moneySchema, paginationSchema, productTypeSchema, quantitySchema } from "../schemas/common";
import { paginationMeta, send } from "./helpers";

const bonItemSchema = z.object({ productId: z.string().min(1), quantity: quantitySchema, kind: itemKindSchema }).strict();
const saveBonSchema = z
  .object({
    customerId: z.string().min(1),
    items: z.array(bonItemSchema).min(1),
    shippingCost: moneySchema.optional(),
    bonDate: z.string().datetime().optional(),
    ownerPin: z.string().optional(),
    negativeProfitReason: z.string().optional()
  })
  .strict();
const voidSchema = z.object({ ownerPin: z.string().min(1), reason: z.string().min(1) }).strict();

export async function registerBonRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/bons", async (request, reply) => {
    const query = paginationSchema
      .extend({
        customerId: z.string().optional(),
        status: z.enum(["PIUTANG", "LUNAS", "VOID"]).optional(),
        month: z.coerce.number().int().min(1).max(12).optional(),
        year: z.coerce.number().int().min(2000).max(3000).optional(),
        productType: productTypeSchema.optional(),
        hasNegativeProfit: z.coerce.boolean().optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional()
      })
      .parse(request.query);
    const where = bonWhere(query);
    const [total, rows] = await Promise.all([
      ctx.db.bon.count({ where }),
      ctx.db.bon.findMany({ where, include: { items: true, customer: true }, orderBy: orderBy(query.sortBy, query.sortOrder), skip: (query.page - 1) * query.limit, take: query.limit })
    ]);
    return send(reply, rows, 200, paginationMeta(total, query.page, query.limit));
  });

  app.get("/api/v1/bons/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.db.bon.findFirstOrThrow({ where: { id: params.id, deletedAt: null }, include: { items: true, customer: true, paymentLinks: true, voidRecord: true } }));
  });

  app.post("/api/v1/bons/preview", async (request, reply) => send(reply, await ctx.transactions.previewBon(toSaveBonInput(saveBonSchema.parse(request.body), (request as AuthenticatedRequest).userId))));

  app.get("/api/v1/bons/validate-number", async (request, reply) => {
    const query = z.object({ bonNumber: z.string().min(1) }).strict().parse(request.query);
    const existing = await ctx.db.bon.findUnique({ where: { bonNumber: query.bonNumber } });
    return send(reply, { available: !existing });
  });

  app.post("/api/v1/bons", async (request, reply) => send(reply, await ctx.transactions.createBon(toSaveBonInput(saveBonSchema.parse(request.body), (request as AuthenticatedRequest).userId)), 201));

  app.patch("/api/v1/bons/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.transactions.updatePiutangBon(params.id, toSaveBonInput(saveBonSchema.parse(request.body), (request as AuthenticatedRequest).userId)));
  });

  app.delete("/api/v1/bons/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.transactions.softDeletePiutangBon(params.id));
  });

  app.post("/api/v1/bons/:id/void", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = voidSchema.parse(request.body);
    return send(reply, await ctx.voids.voidPaidBon({ bonId: params.id, userId: (request as AuthenticatedRequest).userId, ownerPin: body.ownerPin, reason: body.reason }));
  });
}

function toSaveBonInput(body: z.infer<typeof saveBonSchema>, userId: string) {
  return { ...body, bonDate: body.bonDate ? new Date(body.bonDate) : undefined, userId };
}

function bonWhere(query: {
  customerId?: string;
  status?: "PIUTANG" | "LUNAS" | "VOID";
  hasNegativeProfit?: boolean;
  month?: number;
  year?: number;
  productType?: "LM" | "BR";
  dateFrom?: string;
  dateTo?: string;
}): Prisma.BonWhereInput {
  const bonDate = query.dateFrom || query.dateTo ? { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lt: new Date(query.dateTo) } : {}) } : query.month && query.year ? { gte: new Date(Date.UTC(query.year, query.month - 1, 1)), lt: new Date(Date.UTC(query.year, query.month, 1)) } : undefined;
  return {
    deletedAt: null,
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.hasNegativeProfit === undefined ? {} : { hasNegativeProfit: query.hasNegativeProfit }),
    ...(query.productType ? { items: { some: { productTypeSnapshot: query.productType, isBonus: false } } } : {}),
    ...(bonDate ? { bonDate } : {})
  };
}

function orderBy(sortBy = "bonDate", sortOrder: "asc" | "desc") {
  const allowed = new Set(["bonDate", "bonNumber", "totalAmount", "status", "createdAt"]);
  return { [allowed.has(sortBy) ? sortBy : "bonDate"]: sortOrder };
}
