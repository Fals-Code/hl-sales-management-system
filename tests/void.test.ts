import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("void-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("void Bon Lunas", () => {
  it("rejects PIUTANG Bon and requires PIN/reason", async () => {
    const { user, customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    await expect(ctx.voids.voidPaidBon({ bonId: bon.id, userId: user.id, ownerPin: "123456", reason: "x" })).rejects.toThrow("Only Lunas");
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    await expect(ctx.voids.voidPaidBon({ bonId: bon.id, userId: user.id, ownerPin: "bad", reason: "x" })).rejects.toThrow("Invalid Owner PIN");
    await expect(ctx.voids.voidPaidBon({ bonId: bon.id, userId: user.id, ownerPin: "123456", reason: "" })).rejects.toThrow("reason");
  });

  it("voids once, excludes active reporting, preserves payment history, and prevents repayment", async () => {
    const { user, customer, lm } = await createFixture(ctx, 50000);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    await ctx.voids.voidPaidBon({ bonId: bon.id, userId: user.id, ownerPin: "123456", reason: "formal void" });
    expect((await ctx.reports.overall()).totalRevenue).toBe(0);
    expect(await ctx.db.payment.findUnique({ where: { id: payment.id } })).toBeTruthy();
    expect(await ctx.db.voidRecord.count({ where: { bonId: bon.id } })).toBe(1);
    await expect(ctx.voids.voidPaidBon({ bonId: bon.id, userId: user.id, ownerPin: "123456", reason: "again" })).rejects.toThrow("Only Lunas");
    await expect(ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] })).rejects.toThrow("Only active Piutang");
  });
});
