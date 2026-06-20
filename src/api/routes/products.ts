import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ApiContext } from "../types";
import { booleanQuerySchema, moneySchema, paginationSchema, productTypeSchema } from "../schemas/common";
import { paginationMeta, send } from "./helpers";

const stockSchema = z.number().int().nonnegative();
const createProductSchema = z.object({ sku: z.string().trim().optional(), name: z.string().trim().min(1), type: productTypeSchema, stock: stockSchema, costPrice: moneySchema, basePrice: moneySchema }).strict();
const updateProductSchema = createProductSchema.partial().strict();

export function registerProductRoutes(app: FastifyInstance, ctx: ApiContext) {
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
    return send(reply, await withStock(ctx, rows), 200, paginationMeta(total, query.page, query.limit));
  });

  app.get("/api/v1/products/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const product = await ctx.db.product.findFirstOrThrow({ where: { id: params.id, deletedAt: null } });
    return send(reply, (await withStock(ctx, [product]))[0]);
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

async function withStock(ctx: ApiContext, rows: Array<Record<string, unknown> & { id: string }>) {
  if (!rows.length) return rows;
  const ids = rows.map((row) => row.id);
  const stockRows = await ctx.db.$queryRaw<Array<{ id: string; stock: number }>>(Prisma.sql`SELECT "id", "stock" FROM "Product" WHERE "id" IN (${Prisma.join(ids)})`);
  const stocks = new Map(stockRows.map((row) => [row.id, row.stock]));
  return rows.map((row) => ({ ...row, stock: stocks.get(row.id) ?? 0 }));
}

function orderBy(sortBy = "name", sortOrder: "asc" | "desc") {
  const allowed = new Set(["name", "sku", "type", "createdAt"]);
  return { [allowed.has(sortBy) ? sortBy : "name"]: sortOrder };
}
