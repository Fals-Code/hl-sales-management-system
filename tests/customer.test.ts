import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestContext, createUser, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("customer-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("customer management", () => {
  it("creates LM/BR cascading discounts and threshold history", async () => {
    const user = await createUser(ctx.db);
    const customer = await ctx.customers.createCustomer({
      name: "A",
      bonusThreshold: 50000,
      discountTiers: [
        { productType: "LM", sequence: 1, percentBps: 1000 },
        { productType: "BR", sequence: 1, percentBps: 500 }
      ]
    });
    expect(customer.discountTiers).toHaveLength(2);
    await ctx.customers.updateCustomer({ id: customer.id, bonusThreshold: 75000, changedById: user.id, thresholdReason: "policy" });
    expect(await ctx.db.bonusThresholdHistory.count({ where: { customerId: customer.id } })).toBe(1);
  });

  it("soft-deletes customers without removing history rows", async () => {
    const customer = await ctx.customers.createCustomer({ name: "A" });
    await ctx.customers.softDeleteCustomer(customer.id);
    expect((await ctx.db.customer.findUniqueOrThrow({ where: { id: customer.id } })).deletedAt).toBeTruthy();
  });
});
