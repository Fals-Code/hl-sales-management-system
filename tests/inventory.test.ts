import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFixture, createTestContext, resetDb, TEST_OWNER_PIN, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("inventory-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});

afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("inventory consistency", () => {
  it("reduces stock when a Bon is created and leaves stock unchanged on settlement or payment cancellation", async () => {
    const { user, customer, lm } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({
      customerId: customer.id,
      items: [{ productId: lm.id, quantity: 3 }]
    });

    expect(await stockOf(lm.id)).toBe(97);

    const payment = await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bon.id] });
    expect(await stockOf(lm.id)).toBe(97);

    await ctx.settlements.cancelPayment({
      paymentId: payment.id,
      userId: user.id,
      ownerPin: TEST_OWNER_PIN,
      reason: "Koreksi pembayaran untuk pengujian stok"
    });
    expect(await stockOf(lm.id)).toBe(97);
  });

  it("adjusts stock atomically when a Piutang Bon is edited and restores it on soft-delete", async () => {
    const { customer, lm, br } = await createFixture(ctx);
    const bon = await ctx.transactions.createBon({
      customerId: customer.id,
      items: [{ productId: lm.id, quantity: 4 }]
    });
    expect(await stockOf(lm.id)).toBe(96);

    await ctx.transactions.updatePiutangBon(bon.id, {
      customerId: customer.id,
      items: [
        { productId: lm.id, quantity: 1 },
        { productId: br.id, quantity: 2 }
      ]
    });

    expect(await stockOf(lm.id)).toBe(99);
    expect(await stockOf(br.id)).toBe(98);

    await ctx.transactions.softDeletePiutangBon(bon.id);
    expect(await stockOf(lm.id)).toBe(100);
    expect(await stockOf(br.id)).toBe(100);
  });

  it("reduces stock for Bonus Bon and restores it when the paid Bon is Void", async () => {
    const { user, customer, lm, br } = await createFixture(ctx, 50_000);
    const earningBon = await ctx.transactions.createBon({
      customerId: customer.id,
      items: [{ productId: lm.id, quantity: 2 }]
    });
    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [earningBon.id] });

    const bonusBon = await ctx.transactions.createBon({
      customerId: customer.id,
      items: [{ productId: br.id, quantity: 2, kind: "BONUS" }]
    });
    expect(await stockOf(br.id)).toBe(98);

    await ctx.settlements.settleBons({ customerId: customer.id, bonIds: [bonusBon.id] });
    expect(await stockOf(br.id)).toBe(98);

    await ctx.voids.voidPaidBon({
      bonId: bonusBon.id,
      userId: user.id,
      ownerPin: TEST_OWNER_PIN,
      reason: "Void Bonus Bon untuk pengujian stok"
    });
    expect(await stockOf(br.id)).toBe(100);
  });

  it("rejects insufficient stock during preview and creation", async () => {
    const { customer, lm } = await createFixture(ctx);
    await ctx.products.updateProduct({ id: lm.id, stock: 1 });

    const input = { customerId: customer.id, items: [{ productId: lm.id, quantity: 2 }] };
    await expect(ctx.transactions.previewBon(input)).rejects.toThrow("tidak mencukupi");
    await expect(ctx.transactions.createBon(input)).rejects.toThrow("tidak mencukupi");
    expect(await stockOf(lm.id)).toBe(1);
  });

  it("allows only one concurrent sale when both requests compete for the last unit", async () => {
    const { customer, lm } = await createFixture(ctx);
    await ctx.products.updateProduct({ id: lm.id, stock: 1 });

    const results = await Promise.allSettled([
      ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] }),
      ctx.transactions.createBon({ customerId: customer.id, items: [{ productId: lm.id, quantity: 1 }] })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await stockOf(lm.id)).toBe(0);
    expect(await ctx.db.bon.count()).toBe(1);
  });

  it("does not inflate stock when deleting a legacy Bon that never reserved inventory", async () => {
    const { customer, lm } = await createFixture(ctx);
    const bon = await ctx.db.bon.create({
      data: {
        bonNumber: "BON-20260620-LEGACY",
        customerId: customer.id,
        status: "PIUTANG",
        totalBeforeDiscount: 100_000n,
        totalAfterDiscount: 100_000n,
        totalAmount: 100_000n,
        revenueLm: 100_000n,
        revenueBr: 0n,
        profitAmount: 20_000n,
        bonusCost: 0n,
        inventoryAppliedAt: null,
        items: {
          create: {
            productId: lm.id,
            kind: "REGULER",
            productNameSnapshot: lm.name,
            productTypeSnapshot: "LM",
            costPriceSnapshot: 80_000n,
            basePriceSnapshot: 100_000n,
            discountSnapshotJson: "[]",
            priceAfterDiscount: 100_000n,
            finalPrice: 100_000n,
            quantity: 1,
            subtotal: 100_000n,
            profitAmount: 20_000n,
            isBonus: false
          }
        }
      }
    });

    await ctx.transactions.softDeletePiutangBon(bon.id);
    expect(await stockOf(lm.id)).toBe(100);
  });
});

async function stockOf(productId: string) {
  return (await ctx.db.product.findUniqueOrThrow({ where: { id: productId }, select: { stock: true } })).stock;
}
