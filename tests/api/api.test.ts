import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/api/app";
import { createTestContext, createUser, resetDb, type TestContext } from "../helpers";

describe("Phase 2 API", () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext("api");
    app = await buildApp({ db: ctx.db });
    await app.ready();
  });

  beforeEach(async () => {
    await resetDb(ctx.db);
  });

  afterAll(async () => {
    await app.close();
    await ctx.db.$disconnect();
  });

  it("handles login, me, logout, and unauthenticated access", async () => {
    await createUser(ctx.db);

    const unauth = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(unauth.statusCode).toBe(401);

    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: "owner", password: "secret" } });
    expect(login.statusCode).toBe(200);
    const cookie = extractCookie(login);
    expect(login.body).not.toContain("secret");

    const me = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.username).toBe("owner");

    const logout = await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: { cookie } });
    expect(logout.statusCode).toBe(200);

    const expired = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } });
    expect(expired.statusCode).toBe(401);
  });

  it("creates customers and products through validated envelopes", async () => {
    const cookie = await loginCookie();
    const invalid = await app.inject({ method: "POST", url: "/api/v1/customers", headers: { cookie }, payload: { name: "A", unknown: true } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().success).toBe(false);

    const customer = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { cookie },
      payload: { name: "Toko API", bonusThreshold: 100000, discountTiers: [{ productType: "LM", sequence: 1, percentBps: 1000 }] }
    });
    expect(customer.statusCode).toBe(201);

    const product = await app.inject({ method: "POST", url: "/api/v1/products", headers: { cookie }, payload: { name: "LM API", type: "LM", costPrice: 80000, basePrice: 100000 } });
    expect(product.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/api/v1/products?type=LM&limit=10", headers: { cookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(1);
  });

  it("uses the same calculation for Bon preview and creation, then rejects editing Lunas Bon", async () => {
    const cookie = await loginCookie();
    const { customerId, productId } = await createCustomerProduct(cookie);
    const payload = { customerId, items: [{ productId, quantity: 2 }], shippingCost: 5000, bonDate: "2026-06-18T00:00:00.000Z" };

    const preview = await app.inject({ method: "POST", url: "/api/v1/bons/preview", headers: { cookie }, payload });
    expect(preview.statusCode).toBe(200);

    const created = await app.inject({ method: "POST", url: "/api/v1/bons", headers: { cookie }, payload });
    expect(created.statusCode).toBe(201);
    expect(created.json().data.totalAmount).toBe(preview.json().data.totalAmount);

    const settlement = await app.inject({ method: "POST", url: "/api/v1/settlements", headers: { cookie }, payload: { customerId, bonIds: [created.json().data.id], settlementDate: "2026-06-19T00:00:00.000Z" } });
    expect(settlement.statusCode).toBe(201);

    const edit = await app.inject({ method: "PATCH", url: `/api/v1/bons/${created.json().data.id}`, headers: { cookie }, payload });
    expect(edit.statusCode).toBe(422);
  });

  it("settles Bons, exposes cash-basis reporting, and streams PDFs", async () => {
    const cookie = await loginCookie();
    const { customerId, productId } = await createCustomerProduct(cookie);
    const created = await app.inject({ method: "POST", url: "/api/v1/bons", headers: { cookie }, payload: { customerId, items: [{ productId, quantity: 1 }], shippingCost: 0 } });
    const bonId = created.json().data.id as string;

    const before = await app.inject({ method: "GET", url: "/api/v1/reports/overall", headers: { cookie } });
    expect(before.json().data.activePaymentAmount).toBe(0);

    const settlement = await app.inject({ method: "POST", url: "/api/v1/settlements", headers: { cookie }, payload: { customerId, bonIds: [bonId], settlementDate: "2026-06-19T00:00:00.000Z" } });
    expect(settlement.statusCode).toBe(201);

    const after = await app.inject({ method: "GET", url: "/api/v1/reports/overall", headers: { cookie } });
    expect(after.json().data.activePaymentAmount).toBeGreaterThan(0);
    expect(after.json().data.historicalPaymentAmount).toBe(after.json().data.activePaymentAmount);

    const pdf = await app.inject({ method: "GET", url: "/api/v1/pdf/overall", headers: { cookie } });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.rawPayload.length).toBeGreaterThan(100);
  });

  async function loginCookie() {
    await createUser(ctx.db);
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: "owner", password: "secret" } });
    return extractCookie(login);
  }

  async function createCustomerProduct(cookie: string) {
    const customer = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { cookie },
      payload: { name: "Toko API", bonusThreshold: 100000, discountTiers: [{ productType: "LM", sequence: 1, percentBps: 1000 }] }
    });
    const product = await app.inject({ method: "POST", url: "/api/v1/products", headers: { cookie }, payload: { name: "LM API", type: "LM", costPrice: 80000, basePrice: 100000 } });
    return { customerId: customer.json().data.id as string, productId: product.json().data.id as string };
  }
});

function extractCookie(response: { headers: Record<string, string | string[] | undefined> }) {
  const raw = response.headers["set-cookie"];
  const cookie = Array.isArray(raw) ? raw[0] : raw;
  if (!cookie) throw new Error("Set-Cookie header is missing.");
  return cookie.split(";")[0];
}
