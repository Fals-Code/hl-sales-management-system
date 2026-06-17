import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ApiContext, AuthenticatedRequest } from "../types";
import { paginationSchema } from "../schemas/common";
import { paginationMeta, send } from "./helpers";

const settlementSchema = z.object({ customerId: z.string().min(1), bonIds: z.array(z.string().min(1)).min(1), settlementDate: z.string().datetime().optional() }).strict();
const monthlySchema = z.object({ customerId: z.string().min(1), month: z.number().int().min(1).max(12), year: z.number().int().min(2000).max(3000), settlementDate: z.string().datetime().optional() }).strict();
const cancelSchema = z.object({ ownerPin: z.string().min(1), reason: z.string().min(1) }).strict();

export async function registerSettlementRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.post("/api/v1/settlements", async (request, reply) => {
    const body = settlementSchema.parse(request.body);
    return send(reply, await ctx.settlements.settleBons({ customerId: body.customerId, bonIds: body.bonIds, paidAt: body.settlementDate ? new Date(body.settlementDate) : undefined }), 201);
  });

  app.post("/api/v1/settlements/monthly", async (request, reply) => {
    const body = monthlySchema.parse(request.body);
    return send(reply, await ctx.settlements.settleMonthly({ customerId: body.customerId, month: body.month, year: body.year, paidAt: body.settlementDate ? new Date(body.settlementDate) : undefined }), 201);
  });

  app.get("/api/v1/payments", async (request, reply) => {
    const query = paginationSchema
      .extend({ customerId: z.string().optional(), month: z.coerce.number().int().min(1).max(12).optional(), year: z.coerce.number().int().min(2000).max(3000).optional(), status: z.enum(["active", "canceled"]).optional() })
      .parse(request.query);
    const where: Prisma.PaymentWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status === "active" ? { canceledAt: null } : {}),
      ...(query.status === "canceled" ? { canceledAt: { not: null } } : {}),
      ...(query.month && query.year ? { paidAt: { gte: new Date(Date.UTC(query.year, query.month - 1, 1)), lt: new Date(Date.UTC(query.year, query.month, 1)) } } : {})
    };
    const [total, rows] = await Promise.all([
      ctx.db.payment.count({ where }),
      ctx.db.payment.findMany({ where, include: { bons: true }, orderBy: { paidAt: query.sortOrder }, skip: (query.page - 1) * query.limit, take: query.limit })
    ]);
    return send(reply, rows, 200, paginationMeta(total, query.page, query.limit));
  });

  app.get("/api/v1/payments/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.db.payment.findUniqueOrThrow({ where: { id: params.id }, include: { bons: { include: { bon: true } } } }));
  });

  app.post("/api/v1/payments/:id/cancel", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = cancelSchema.parse(request.body);
    return send(reply, await ctx.settlements.cancelPayment({ paymentId: params.id, userId: (request as AuthenticatedRequest).userId, ownerPin: body.ownerPin, reason: body.reason }));
  });
}
