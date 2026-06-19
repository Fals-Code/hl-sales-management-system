import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/api/app";
import { BootstrapService } from "../src/services/bootstrapService";
import {
  createFixture,
  createTestContext,
  createUser,
  resetDb,
  TEST_OWNER_PIN,
  TEST_USERNAME,
  TEST_USER_PASSWORD,
  type TestContext
} from "./helpers";

let ctx: TestContext;
let app: FastifyInstance;

beforeAll(async () => {
  ctx = await createTestContext("phase5-data-test");
  app = await buildApp({ db: ctx.db, logger: false });
});

beforeEach(async () => {
  await resetDb(ctx.db);
});

afterAll(async () => {
  await app.close();
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

  it("persists the complete authenticated Bon lifecycle through HTTP routes", async () => {
    await createUser(ctx.db);
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: TEST_USERNAME, password: TEST_USER_PASSWORD }
    });
    expect(login.statusCode).toBe(200);
    const cookie = String(login.headers["set-cookie"]).split(";")[0];

    const customer = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { cookie },
      payload: {
        code: "PLG-API-001",
        name: "Toko API",
        bonusThreshold: 100000,
        discountTiers: [{ productType: "LM", sequence: 1, percentBps: 1000 }]
      }
    });
    expect(customer.statusCode).toBe(201);
    const customerId = customer.json().data.id as string;

    const product = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { cookie },
      payload: { sku: "PRD-API-001", name: "Produk API", type: "LM", costPrice: 70000, basePrice: 100000 }
    });
    expect(product.statusCode).toBe(201);
    const productId = product.json().data.id as string;

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/bons",
      headers: { cookie },
      payload: {
        bonNumber: "BON-20260619-901",
        bonDate: "2026-06-19",
        customerId,
        description: "Created through API",
        shippingCost: 10000,
        items: [{ productId, quantity: 1, kind: "REGULER" }]
      }
    });
    expect(created.statusCode).toBe(201);
    const bonId = created.json().data.id as string;

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/bons/${bonId}`,
      headers: { cookie },
      payload: {
        bonNumber: "BON-20260619-901",
        bonDate: "2026-06-19",
        customerId,
        description: "Updated through API",
        shippingCost: 20000,
        items: [{ productId, quantity: 2, kind: "REGULER" }]
      }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data.description).toBe("Updated through API");

    const settled = await app.inject({
      method: "POST",
      url: "/api/v1/settlements",
      headers: { cookie },
      payload: { customerId, bonIds: [bonId], settlementDate: "2026-06-20T00:00:00.000Z" }
    });
    expect(settled.statusCode).toBe(201);
    const paymentId = settled.json().data.id as string;

    const canceled = await app.inject({
      method: "POST",
      url: `/api/v1/payments/${paymentId}/cancel`,
      headers: { cookie },
      payload: { ownerPin: TEST_OWNER_PIN, reason: "Koreksi pembayaran pengujian" }
    });
    expect(canceled.statusCode).toBe(200);

    const settledAgain = await app.inject({
      method: "POST",
      url: "/api/v1/settlements",
      headers: { cookie },
      payload: { customerId, bonIds: [bonId], settlementDate: "2026-06-21T00:00:00.000Z" }
    });
    expect(settledAgain.statusCode).toBe(201);

    const voided = await app.inject({
      method: "POST",
      url: `/api/v1/bons/${bonId}/void`,
      headers: { cookie },
      payload: { ownerPin: TEST_OWNER_PIN, reason: "Void transaksi pengujian" }
    });
    expect(voided.statusCode).toBe(200);

    const report = await app.inject({
      method: "GET",
      url: "/api/v1/reports/overall?month=6&year=2026",
      headers: { cookie }
    });
    expect(report.statusCode).toBe(200);
    expect(report.json().data.voidBonCount).toBe(1);

    const pdf = await app.inject({
      method: "GET",
      url: "/api/v1/pdf/transactions?month=6&year=2026",
      headers: { cookie }
    });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.rawPayload.byteLength).toBeGreaterThan(100);
  });
});
