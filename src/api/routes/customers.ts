import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ApiContext, AuthenticatedRequest } from "../types";
import { booleanQuerySchema, moneySchema, paginationSchema, productTypeSchema } from "../schemas/common";
import { paginationMeta, send } from "./helpers";

const discountTierSchema = z.object({ productType: productTypeSchema, sequence: z.number().int().positive(), percentBps: z.number().int().min(0).max(10000) }).strict();
const createCustomerSchema = z
  .object({
    code: z.string().trim().optional(),
    name: z.string().trim().min(1),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    bonusThreshold: moneySchema.optional(),
    discountTiers: z.array(discountTierSchema).optional()
  })
  .strict();
const updateCustomerSchema = createCustomerSchema.partial().strict();
const thresholdSchema = z.object({ bonusThreshold: moneySchema, reason: z.string().trim().optional() }).strict();

export async function registerCustomerRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/customers", async (request, reply) => {
    const query = paginationSchema
      .extend({ active: booleanQuerySchema.optional(), hasBonus: booleanQuerySchema.optional() })
      .parse(request.query);
    const where: Prisma.CustomerWhereInput = {
      deletedAt: query.active === false ? { not: null } : null,
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { code: { contains: query.search, mode: "insensitive" } }] } : {})
    };

    if (query.hasBonus === undefined) {
      const [total, rows] = await Promise.all([
        ctx.db.customer.count({ where }),
        ctx.db.customer.findMany({
          where,
          include: { discountTiers: true },
          orderBy: orderBy(query.sortBy, query.sortOrder),
          skip: (query.page - 1) * query.limit,
          take: query.limit
        })
      ]);
      return send(reply, rows, 200, paginationMeta(total, query.page, query.limit));
    }

    const candidates = await ctx.db.customer.findMany({
      where,
      include: { discountTiers: true },
      orderBy: orderBy(query.sortBy, query.sortOrder)
    });
    const withAvailability = await Promise.all(
      candidates.map(async (customer) => ({ customer, availability: await ctx.bonus.getAvailability(customer.id) }))
    );
    const filtered = withAvailability
      .filter(({ availability }) => (availability.availableUnits > 0) === query.hasBonus)
      .map(({ customer, availability }) => ({ ...customer, bonusAvailability: availability }));
    const start = (query.page - 1) * query.limit;
    return send(reply, filtered.slice(start, start + query.limit), 200, paginationMeta(filtered.length, query.page, query.limit));
  });

  app.get("/api/v1/customers/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const customer = await ctx.db.customer.findFirstOrThrow({ where: { id: params.id, deletedAt: null }, include: { discountTiers: true, thresholdHistories: true } });
    return send(reply, customer);
  });

  app.post("/api/v1/customers", async (request, reply) => send(reply, await ctx.customers.createCustomer(createCustomerSchema.parse(request.body)), 201));

  app.patch("/api/v1/customers/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = updateCustomerSchema.parse(request.body);
    return send(reply, await ctx.customers.updateCustomer({ id: params.id, ...body, changedById: (request as AuthenticatedRequest).userId }));
  });

  app.delete("/api/v1/customers/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.customers.softDeleteCustomer(params.id));
  });

  app.put("/api/v1/customers/:id/discounts", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ discountTiers: z.array(discountTierSchema) }).strict().parse(request.body);
    return send(reply, await ctx.customers.updateCustomer({ id: params.id, discountTiers: body.discountTiers, changedById: (request as AuthenticatedRequest).userId }));
  });

  app.put("/api/v1/customers/:id/bonus-threshold", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = thresholdSchema.parse(request.body);
    return send(reply, await ctx.customers.updateCustomer({ id: params.id, bonusThreshold: body.bonusThreshold, thresholdReason: body.reason, changedById: (request as AuthenticatedRequest).userId }));
  });
}

function orderBy(sortBy = "name", sortOrder: "asc" | "desc") {
  const allowed = new Set(["name", "code", "createdAt"]);
  return { [allowed.has(sortBy) ? sortBy : "name"]: sortOrder };
}
