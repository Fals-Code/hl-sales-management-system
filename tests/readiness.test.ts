import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BonusService } from "../src";
import { createFixture, createTestContext, resetDb, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("readiness-test");
});

beforeEach(async () => {
  await resetDb(ctx.db);
});

afterAll(async () => {
  await ctx.db.$disconnect();
});

describe("Phase 5 readiness regressions", () => {
  it("scopes Piutang LM and BR from the same Bon lines without shipping leakage", async () => {
    const { customer, lm, br } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({
      bonNumber: "BON-20260619-101",
      customerId: customer.id,
      items: [
        { productId: lm.id, quantity: 1 },
        { productId: br.id, quantity: 1 }
      ],
      shippingCost: 10_000
    });

    const lmReport = await ctx.reports.overall({ productType: "LM" });
    const brReport = await ctx.reports.overall({ productType: "BR" });
    const overall = await ctx.reports.overall();

    expect(lmReport.totalPiutang).toBe(Number(bon.revenueLm));
    expect(brReport.totalPiutang).toBe(Number(bon.revenueBr));
    expect(overall.totalPiutang).toBe(Number(bon.totalAmount));
    expect(lmReport.totalPiutang + brReport.totalPiutang).toBe(Number(bon.totalAmount) - 10_000);
  });

  it("preserves description when an edit omits the optional field", async () => {
    const { customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({
      bonNumber: "BON-20260619-102",
      customerId: customer.id,
      description: "Deskripsi awal",
      items: [{ productId: lm.id, quantity: 1 }]
    });

    const updated = await ctx.transactions.updatePiutangBon(bon.id, {
      customerId: customer.id,
      items: [{ productId: lm.id, quantity: 2 }]
    });

    expect(updated.description).toBe("Deskripsi awal");
  });

  it("carries pre-change turnover into the new bonus threshold period", async () => {
    const { user, customer, lm, br } = await createFixture(ctx, 200_000);
    const first = await ctx.transactions.createBon({
      bonNumber: "BON-20260619-103",
      customerId: customer.id,
      items: [{ productId: lm.id, quantity: 1 }]
    });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [first.id] });

    await ctx.customers.updateCustomer({
      id: customer.id,
      bonusThreshold: 100_000,
      changedById: user.id,
      thresholdReason: "Kebijakan baru"
    });

    const second = await ctx.transactions.createBon({
      bonNumber: "BON-20260619-104",
      customerId: customer.id,
      items: [{ productId: br.id, quantity: 1 }]
    });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [second.id] });

    expect((await new BonusService(ctx.db).getAvailability(customer.id)).availableUnits).toBe(1);
  });

  it("generates BONUS prefix for an internal bonus transaction", async () => {
    const { customer, lm, br } = await createFixture(ctx, 50_000);
    const paid = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id] });
    const bonus = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 1, kind: "BONUS" }] });
    expect(bonus.bonNumber).toMatch(/^BONUS-\d{8}-\d{3}$/);
  });
});
