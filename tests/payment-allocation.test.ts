import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { toSafeMoneyNumber } from "../src";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("payment-allocation-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("payment allocation snapshots and partial Void", () => {
  it("stores allocation snapshot for multiple Bons in one Payment", async () => {
    const { customer, lm } = await createFixture(ctx);
    const bons = await Promise.all([
      ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }], shippingCost: 1000 }),
      ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }], shippingCost: 2000 }),
      ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 3 }], shippingCost: 3000 })
    ]);
    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: bons.map((bon) => bon.id) });
    const allocations = await ctx.db.paymentBon.findMany({ where: { paymentId: payment.id }, orderBy: { allocatedInvoiceAmount: "asc" } });
    expect(allocations).toHaveLength(3);
    expect(allocations.map((allocation) => toSafeMoneyNumber(allocation.allocatedShipping))).toEqual([1000, 2000, 3000]);
    expect(toSafeMoneyNumber(payment.historicalPaymentAmount)).toBe(519000);
    expect(toSafeMoneyNumber(payment.activePaymentAmount)).toBe(519000);
  });

  it("voids one Bon in a multi-Bon Payment without changing other Bons or historical payment", async () => {
    const { user, customer, lm } = await createFixture(ctx, 100000);
    const bonA = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }], shippingCost: 1000 });
    const bonB = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }], shippingCost: 2000 });
    const bonC = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 3 }], shippingCost: 3000 });
    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bonA.id, bonB.id, bonC.id] });
    await ctx.voids.voidPaidBon({ bonId: bonB.id, userId: user.id, ownerPin: "123456", reason: "partial void" });
    expect((await ctx.db.bon.findUniqueOrThrow({ where: { id: bonA.id } })).status).toBe("LUNAS");
    expect((await ctx.db.bon.findUniqueOrThrow({ where: { id: bonB.id } })).status).toBe("VOID");
    expect((await ctx.db.bon.findUniqueOrThrow({ where: { id: bonC.id } })).status).toBe("LUNAS");
    const refreshedPayment = await ctx.db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(toSafeMoneyNumber(refreshedPayment.historicalPaymentAmount)).toBe(519000);
    expect(toSafeMoneyNumber(refreshedPayment.activePaymentAmount)).toBe(346000);
    const report = await ctx.reports.overall();
    expect(report.historicalPaymentAmount).toBe(519000);
    expect(report.activePaymentAmount).toBe(346000);
    expect(report.totalRevenue).toBe(342000);
    expect(report.totalShipping).toBe(4000);
  });

  it("rejects regular cancellation after one Bon in the Payment is Void", async () => {
    const { user, customer, lm } = await createFixture(ctx);
    const bonA = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const bonB = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bonA.id, bonB.id] });
    await ctx.voids.voidPaidBon({ bonId: bonB.id, userId: user.id, ownerPin: "123456", reason: "partial void" });
    await expect(ctx.settlements.cancelPayment({ paymentId: payment.id, userId: user.id, ownerPin: "123456", reason: "cancel after void" })).rejects.toThrow("Void Bon");
  });
});
