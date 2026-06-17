import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("product-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("product management", () => {
  it("creates, edits, and soft-deletes products", async () => {
    const product = await ctx.products.createProduct({ name: "P", type: "BR", costPrice: 1000, basePrice: 2000 });
    await ctx.products.updateProduct({ id: product.id, basePrice: 2500 });
    await ctx.products.softDeleteProduct(product.id);
    expect((await ctx.db.product.findUniqueOrThrow({ where: { id: product.id } })).deletedAt).toBeTruthy();
  });

  it("rejects negative money and invalid product types", async () => {
    await expect(ctx.products.createProduct({ name: "Bad", type: "LM", costPrice: -1, basePrice: 1 })).rejects.toThrow("non-negative integer");
    await expect(ctx.products.createProduct({ name: "Bad", type: "XX" as "LM", costPrice: 1, basePrice: 1 })).rejects.toThrow("LM or BR");
  });
});
