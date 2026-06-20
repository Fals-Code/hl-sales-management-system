import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("reporting-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("reporting", () => {
  it("reports overall, customer, LM, and BR summaries with cash-basis filters", async () => {
    const { customer, lm, br } = await createFixture(ctx, 50000);
    await ctx.transactions.createBon({ customerId: customer.id, bonDate: new Date(Date.UTC(2026, 0, 1)), items: [{ productId: lm.id, quantity: 1 }] });
    const paid = await ctx.transactions.createBon({ customerId: customer.id, bonDate: new Date(Date.UTC(2026, 0, 2)), items: [{ productId: br.id, quantity: 1 }], shippingCost: 7000 });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id], paidAt: new Date(Date.UTC(2026, 1, 5)) });
    const overall = await ctx.reports.overall({ month: 2, year: 2026 });
    expect(overall.totalPiutang).toBe(0);
    expect(overall.totalPaid).toBe(47000);
    expect(overall.totalRevenue).toBe(40000);
    expect(overall.totalShipping).toBe(7000);
    expect(overall.totalProfit).toBe(10000);
    const customerReport = await ctx.reports.byCustomer(customer.id);
    expect(customerReport.totalBon).toBe(2);
    expect(customerReport.bonusAvailable).toBe(0);
    expect(await ctx.reports.lmRecap()).toMatchObject({ revenue: 0, quantity: 0 });
    expect(await ctx.reports.brRecap()).toMatchObject({ revenue: 40000, profit: 10000, quantity: 1, bonCount: 1 });
  });

  it("reports active Bonus Bon cost separately and labels Bonus rows semantically", async () => {
    const { customer, lm, br } = await createFixture(ctx, 50000);
    const paid = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id] });
    const bonusBon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 2, kind: "BONUS" }] });

    const report = await ctx.reports.overall();
    expect(report.totalRevenue).toBe(171000);
    expect(report.totalProfit).toBe(11000);
    expect(report.totalBonusCost).toBe(60000);

    const customerReport = await ctx.reports.byCustomer(customer.id);
    expect(customerReport.totalBonusCost).toBe(60000);

    const rows = await ctx.reports.transactionRows();
    expect(rows.find((row) => row.id === bonusBon.id)?.status).toBe("BONUS");
  });

  it("scopes active Bonus Bon cost by Bon date and product type", async () => {
    const { customer, lm, br } = await createFixture(ctx, 50000);
    const paid = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id] });
    await ctx.transactions.createBon({
      customerId: customer.id,
      bonDate: new Date(Date.UTC(2026, 5, 20)),
      items: [{ productId: br.id, quantity: 2, kind: "BONUS" }]
    });

    expect((await ctx.reports.overall({ month: 6, year: 2026 })).totalBonusCost).toBe(60000);
    expect((await ctx.reports.overall({ month: 7, year: 2026 })).totalBonusCost).toBe(0);
    expect((await ctx.reports.overall({ month: 6, year: 2026, productType: "BR" })).totalBonusCost).toBe(60000);
    expect((await ctx.reports.overall({ month: 6, year: 2026, productType: "LM" })).totalBonusCost).toBe(0);
  });

  it("excludes bonus and void from active revenue/profit while exposing promo cost separately", async () => {
    const { user, customer, lm, br, loss } = await createFixture(ctx, 50000);
    const paid = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id] });
    const bonusBon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 1, kind: "BONUS" }] });
    expect((await ctx.reports.overall()).totalBonusCost).toBe(30000);
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bonusBon.id] });
    const lossBon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: loss.id, quantity: 1 }], userId: user.id, ownerPin: "123456", negativeProfitReason: "approved" });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [lossBon.id] });
    await ctx.voids.voidPaidBon({ bonId: bonusBon.id, userId: user.id, ownerPin: "123456", reason: "void bonus" });
    const report = await ctx.reports.overall();
    expect(report.totalRevenue).toBe(211000);
    expect(report.totalProfit).toBe(-49000);
    expect(report.totalBonusCost).toBe(0);
    expect(report.negativeProfitTransactions).toBe(1);
    expect(report.voidBonCount).toBe(1);
    expect((await ctx.reports.negativeProfitTransactions()).length).toBe(1);
    expect((await ctx.reports.transactionRows()).find((row) => row.id === bonusBon.id)?.status).toBe("VOID");
  });
});
