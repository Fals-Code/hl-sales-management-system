import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { toSafeMoneyNumber } from "../src";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("settlement-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("settlement", () => {
  it("settles one Bon and recognizes revenue/profit only after LUNAS", async () => {
    const { customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }], shippingCost: 10000 });
    expect((await ctx.reports.overall()).totalRevenue).toBe(0);
    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    expect(toSafeMoneyNumber(payment.totalAmount)).toBe(95500);
    expect((await ctx.reports.overall()).totalRevenue).toBe(85500);
  });

  it("settles monthly Bons for one customer/month atomically", async () => {
    const { customer, lm } = await createFixture(ctx);
    const other = await ctx.customers.createCustomer({ name: "Other" });
    const jan1 = await ctx.transactions.createBon({ customerId: customer.id, bonDate: new Date(Date.UTC(2026, 0, 5)), items: [{ productId: lm.id, quantity: 1 }] });
    const jan2 = await ctx.transactions.createBon({ customerId: customer.id, bonDate: new Date(Date.UTC(2026, 0, 20)), items: [{ productId: lm.id, quantity: 1 }] });
    const feb = await ctx.transactions.createBon({ customerId: customer.id, bonDate: new Date(Date.UTC(2026, 1, 1)), items: [{ productId: lm.id, quantity: 1 }] });
    const otherBon = await ctx.transactions.createBon({ customerId: other.id, bonDate: new Date(Date.UTC(2026, 0, 10)), items: [{ productId: lm.id, quantity: 1 }] });
    const payment = await ctx.settlements.settleMonthly({ customerId: customer.id, month: 1, year: 2026 });
    expect(payment.bons.map((link) => link.bonId).sort()).toEqual([jan1.id, jan2.id].sort());
    expect((await ctx.db.bon.findUniqueOrThrow({ where: { id: feb.id } })).status).toBe("PIUTANG");
    expect((await ctx.db.bon.findUniqueOrThrow({ where: { id: otherBon.id } })).status).toBe("PIUTANG");
  });

  it("rejects double settlement and rolls back invalid multi-Bon settlement", async () => {
    const { customer, lm } = await createFixture(ctx);
    const b1 = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const b2 = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [b1.id] });
    await expect(ctx.settlements.settleBons({ customerId: customer.id, bonIds: [b1.id] })).rejects.toThrow("Only active Piutang");
    await expect(ctx.settlements.settleBons({ customerId: customer.id, bonIds: [b1.id, b2.id] })).rejects.toThrow();
    expect((await ctx.db.bon.findUniqueOrThrow({ where: { id: b2.id } })).status).toBe("PIUTANG");
  });
});
