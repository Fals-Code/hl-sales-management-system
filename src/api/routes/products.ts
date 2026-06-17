import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ApiContext } from "../types";
import { booleanQuerySchema, moneySchema, paginationSchema, productTypeSchema } from "../schemas/common";
import { paginationMeta, send } from "./helpers";

const createProductSchema = z.object({ sku: z.string().trim().optional(), name: z.string().trim().min(1), type: productTypeSchema, costPrice: moneySchema, basePrice: moneySchema }).strict();
const updateProductSchema = createProductSchema.partial().strict();

export async function registerProductRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/products", async (request, reply) => {
    const query = paginationSchema.extend({ type: productTypeSchema.optional(), active: booleanQuerySchema.optional() }).parse(request.query);
    const where: Prisma.ProductWhereInput = {
      deletedAt: query.active === false ? { not: null } : null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { sku: { contains: query.search, mode: "insensitive" } }] } : {})
    };
    const [total, rows] = await Promise.all([
      ctx.db.product.count({ where }),
      ctx.db.product.findMany({ where, orderBy: orderBy(query.sortBy, query.sortOrder), skip: (query.page - 1) * query.limit, take: query.limit })
    ]);
    return send(reply, rows, 200, paginationMeta(total, query.page, query.limit));
  });

  app.get("/api/v1/products/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.db.product.findFirstOrThrow({ where: { id: params.id, deletedAt: null } }));
  });

  app.post("/api/v1/products", async (request, reply) => send(reply, await ctx.products.createProduct(createProductSchema.parse(request.body)), 201));

  app.patch("/api/v1/products/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.products.updateProduct({ id: params.id, ...updateProductSchema.parse(request.body) }));
  });

  app.delete("/api/v1/products/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.products.softDeleteProduct(params.id));
  });
}

function orderBy(sortBy = "name", sortOrder: "asc" | "desc") {
  const allowed = new Set(["name", "sku", "type", "createdAt"]);
  return { [allowed.has(sortBy) ? sortBy : "name"]: sortOrder };
}
