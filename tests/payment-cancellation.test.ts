import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("cancel-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("payment cancellation", () => {
  it("requires PIN and reason", async () => {
    const { user, customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    await expect(ctx.settlements.cancelPayment({ paymentId: payment.id, userId: user.id, ownerPin: "bad", reason: "x" })).rejects.toThrow("Invalid Owner PIN");
    await expect(ctx.settlements.cancelPayment({ paymentId: payment.id, userId: user.id, ownerPin: "123456", reason: "" })).rejects.toThrow("reason");
  });

  it("cancels payment, restores Bon to PIUTANG, reverses cash-basis and bonus, and rejects second cancel", async () => {
    const { user, customer, lm } = await createFixture(ctx, 50000);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    expect((await ctx.reports.byCustomer(customer.id)).bonusAvailable).toBe(1);
    await ctx.settlements.cancelPayment({ paymentId: payment.id, userId: user.id, ownerPin: "123456", reason: "wrong payment" });
    expect((await ctx.db.bon.findUniqueOrThrow({ where: { id: bon.id } })).status).toBe("PIUTANG");
    expect((await ctx.reports.overall()).totalRevenue).toBe(0);
    expect((await ctx.reports.byCustomer(customer.id)).bonusAvailable).toBe(0);
    await expect(ctx.settlements.cancelPayment({ paymentId: payment.id, userId: user.id, ownerPin: "123456", reason: "again" })).rejects.toThrow("already");
  });
});
