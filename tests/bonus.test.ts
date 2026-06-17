import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BonusService, toSafeMoneyNumber } from "../src";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("bonus-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("bonus logic", () => {
  it("earns bonus only from LUNAS turnover using floor threshold and carries remainder implicitly", async () => {
    const { customer, lm, br } = await createFixture(ctx, 100000);
    const b1 = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    expect((await new BonusService(ctx.db).getAvailability(customer.id)).availableUnits).toBe(0);
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [b1.id] });
    expect((await new BonusService(ctx.db).getAvailability(customer.id)).availableUnits).toBe(0);
    const b2 = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 1 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [b2.id] });
    const availability = await new BonusService(ctx.db).getAvailability(customer.id);
    expect(availability.totalSettledRevenue).toBe(125500);
    expect(availability.entitledUnits).toBe(1);
    expect(availability.availableUnits).toBe(1);
  });

  it("allows multiple bonus items but rejects usage above available units", async () => {
    const { customer, lm, br } = await createFixture(ctx, 50000);
    const paid = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id] });
    expect((await new BonusService(ctx.db).getAvailability(customer.id)).availableUnits).toBe(3);
    const bon = await ctx.transactions.createBon({
      customerId: customer.id,
      items: [
        { productId: br.id, quantity: 1, kind: "BONUS" },
        { productId: br.id, quantity: 1, kind: "BONUS" }
      ]
    });
    expect(toSafeMoneyNumber(bon.totalAmount)).toBe(0);
    expect(toSafeMoneyNumber(bon.profitAmount)).toBe(0);
    expect(toSafeMoneyNumber(bon.bonusCost)).toBe(60000);
    expect((await new BonusService(ctx.db).getAvailability(customer.id)).availableUnits).toBe(1);
    await expect(ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 2, kind: "BONUS" }] })).rejects.toThrow("exceed");
  });

  it("stores threshold snapshot on bonus usage and threshold change does not rewrite old ledger", async () => {
    const { user, customer, lm, br } = await createFixture(ctx, 50000);
    const paid = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id] });
    const bonusBon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 1, kind: "BONUS" }] });
    await ctx.customers.updateCustomer({ id: customer.id, bonusThreshold: 100000, changedById: user.id, thresholdReason: "new policy" });
    const ledger = await ctx.db.bonusLedger.findFirstOrThrow({ where: { bonId: bonusBon.id, mutationType: "USED" } });
    expect(toSafeMoneyNumber(ledger.thresholdSnapshot)).toBe(50000);
  });

  it("reverses bonus usage on Piutang edit/delete and on Void", async () => {
    const { user, customer, lm, br } = await createFixture(ctx, 50000);
    const paid = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [paid.id] });
    const bonusBon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 1, kind: "BONUS" }] });
    await ctx.transactions.updatePiutangBon(bonusBon.id, { customerId: customer.id, items: [{ productId: br.id, quantity: 1 }] });
    expect((await new BonusService(ctx.db).getAvailability(customer.id)).availableUnits).toBe(3);
    const bonusBon2 = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: br.id, quantity: 1, kind: "BONUS" }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bonusBon2.id] });
    await ctx.voids.voidPaidBon({ bonId: bonusBon2.id, userId: user.id, ownerPin: "123456", reason: "void bonus" });
    expect((await new BonusService(ctx.db).getAvailability(customer.id)).availableUnits).toBe(3);
  });
});
