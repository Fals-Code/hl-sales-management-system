import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { toSafeMoneyNumber } from "../src";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("loss-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("negative-profit transaction authorization", () => {
  it("rejects loss without PIN, with wrong PIN, and without reason", async () => {
    const { user, customer, loss } = await createFixture(ctx);
    await expect(ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: loss.id, quantity: 1 }] })).rejects.toThrow("Owner PIN");
    await expect(ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: loss.id, quantity: 1 }], userId: user.id, ownerPin: "bad", negativeProfitReason: "x" })).rejects.toThrow("Invalid Owner PIN");
    await expect(ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: loss.id, quantity: 1 }], userId: user.id, ownerPin: "123456" })).rejects.toThrow("Owner PIN");
  });

  it("allows loss with valid PIN and reason and stores negative value", async () => {
    const { user, customer, loss } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({
      customerId: customer.id,
      items: [{ productId: loss.id, quantity: 1 }],
      userId: user.id,
      ownerPin: "123456",
      negativeProfitReason: "approved"
    });
    expect(bon.hasNegativeProfit).toBe(true);
    expect(toSafeMoneyNumber(bon.profitAmount)).toBeLessThan(0);
    expect(await ctx.db.authorizationRecord.count({ where: { type: "LOSS_TRANSACTION" } })).toBe(1);
  });

  it("does not treat bonus item cost as negative-profit transaction", async () => {
    const { customer, lm, br } = await createFixture(ctx, 50000);
    const paid = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id] });
    const bonusBon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 1, kind: "BONUS" }] });
    expect(bonusBon.hasNegativeProfit).toBe(false);
    expect(toSafeMoneyNumber(bonusBon.profitAmount)).toBe(0);
  });
});
