import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BootstrapService } from "../src/services/bootstrapService";
import { createFixture, createTestContext, resetDb, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("phase5-data-test");
});

beforeEach(async () => {
  await resetDb(ctx.db);
});

afterAll(async () => {
  await ctx.db.$disconnect();
});

describe("Phase 5 data hydration", () => {
  it("loads master data, transaction snapshots, and bonus availability", async () => {
    const { customer, lm } = await createFixture(ctx, 100_000);
    const bon = await ctx.transactions.createBon({
      bonNumber: "BON-20260619-201",
      customerId: customer.id,
      items: [{ productId: lm.id, quantity: 1 }],
      shippingCost: 10_000
    });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });

    const payload = await new BootstrapService(ctx.db).load();

    expect(payload.customers).toHaveLength(1);
    expect(payload.customers[0].discountTiers).toHaveLength(3);
    expect(payload.customers[0].bonusAvailability.totalSettledRevenue).toBeGreaterThan(0);
    expect(payload.products).toHaveLength(3);
    expect(payload.bons).toHaveLength(1);
    expect(payload.bons[0].items[0].productNameSnapshot).toBe("Logam Mulia");
  });
});
