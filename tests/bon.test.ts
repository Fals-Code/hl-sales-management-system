import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { toSafeMoneyNumber } from "../src";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("bon-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("Bon transactions", () => {
  it("creates PIUTANG Bon with multiple items, unique number, and immutable snapshots", async () => {
    const { customer, lm, br } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({
      customerId: customer.id,
      items: [
        { productId: lm.id, quantity: 1 },
        { productId: br.id, quantity: 2 }
      ],
      shippingCost: 10000
    });
    await ctx.products.updateProduct({ id: lm.id, basePrice: 999999 });
    const item = await ctx.db.bonItem.findFirstOrThrow({ where: { bonId: bon.id, productId: lm.id } });
    expect(bon.status).toBe("PIUTANG");
    expect(bon.bonNumber).toMatch(/^BON-/);
    expect(toSafeMoneyNumber(item.basePriceSnapshot)).toBe(100000);
    expect(JSON.parse(item.discountSnapshotJson)).toEqual([
      { sequence: 1, percentBps: 1000 },
      { sequence: 2, percentBps: 500 }
    ]);
  });

  it("rejects soft-deleted customer and product for new Bon", async () => {
    const { customer, lm } = await createFixture(ctx);
    await ctx.customers.softDeleteCustomer(customer.id);
    await expect(ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] })).rejects.toThrow("Customer not found");
    const activeCustomer = await ctx.customers.createCustomer({ name: "Active" });
    await ctx.products.softDeleteProduct(lm.id);
    await expect(ctx.transactions.createBon({ customerId: activeCustomer.id, items: [{ productId: lm.id, quantity: 1 }] })).rejects.toThrow("invalid");
  });

  it("edits and soft-deletes PIUTANG Bon", async () => {
    const { customer, lm, br } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const edited = await ctx.transactions.updatePiutangBon(bon.id, { customerId: customer.id, items: [{ productId: br.id, quantity: 1 }], shippingCost: 5000 });
    expect(toSafeMoneyNumber(edited.totalAmount)).toBe(45000);
    await ctx.transactions.softDeletePiutangBon(bon.id);
    expect((await ctx.db.bon.findUniqueOrThrow({ where: { id: bon.id } })).deletedAt).toBeTruthy();
  });

  it("rejects edit and soft-delete for LUNAS and VOID Bon", async () => {
    const { user, customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    await expect(ctx.transactions.updatePiutangBon(bon.id, { customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] })).rejects.toThrow("Only Piutang");
    await expect(ctx.transactions.softDeletePiutangBon(bon.id)).rejects.toThrow("Only Piutang");
    await ctx.voids.voidPaidBon({ bonId: bon.id, userId: user.id, ownerPin: "123456", reason: "formal void" });
    await expect(ctx.transactions.updatePiutangBon(bon.id, { customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] })).rejects.toThrow("Only Piutang");
  });
});
