import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFixture, createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("concurrency-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("concurrency safeguards", () => {
  it("creates unique Bon numbers across concurrent requests", async () => {
    const { customer, lm } = await createFixture(ctx);
    const bons = await Promise.all(
      Array.from({ length: 8 }, () => ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] }))
    );
    expect(new Set(bons.map((bon) => bon.bonNumber)).size).toBe(8);
  });

  it("allows only one concurrent settlement for the same Bon", async () => {
    const { customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const results = await Promise.allSettled([
      ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] }),
      ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] })
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("allows only one concurrent payment cancellation", async () => {
    const { user, customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    const results = await Promise.allSettled([
      ctx.settlements.cancelPayment({ paymentId: payment.id, userId: user.id, ownerPin: "123456", reason: "a" }),
      ctx.settlements.cancelPayment({ paymentId: payment.id, userId: user.id, ownerPin: "123456", reason: "b" })
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("prevents settlement and Void from both succeeding on the same Bon", async () => {
    const { user, customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    const results = await Promise.allSettled([
      ctx.voids.voidPaidBon({ bonId: bon.id, userId: user.id, ownerPin: "123456", reason: "a" }),
      ctx.voids.voidPaidBon({ bonId: bon.id, userId: user.id, ownerPin: "123456", reason: "b" })
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });
});
