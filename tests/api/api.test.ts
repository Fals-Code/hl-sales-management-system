import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/api/app";
import { createTestContext, createUser, resetDb, type TestContext } from "../helpers";

describe("Phase 2 API", () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext("api");
    app = await buildApp({ db: ctx.db, logger: false });
    await app.ready();
  });

  beforeEach(async () => {
    await resetDb(ctx.db);
  });

  afterAll(async () => {
    await app.close();
    await ctx.db.$disconnect();
  });

  it("exposes health and OpenAPI docs without authentication", async () => {
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().data.status).toBe("ok");
    expect(health.headers["x-request-id"]).toBeTruthy();

    const docs = await app.inject({ method: "GET", url: "/docs/json" });
    expect(docs.statusCode).toBe(200);
    expect(docs.json().openapi).toBeTruthy();
  });

  it("handles login, me, PIN verification, logout, and expired session", async () => {
    await createUser(ctx.db);

    const invalidLogin = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: "owner", password: "wrong" } });
    expect(invalidLogin.statusCode).toBe(401);

    const unauth = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(unauth.statusCode).toBe(401);

    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: "owner", password: "secret" } });
    expect(login.statusCode).toBe(200);
    const cookie = extractCookie(login);
    expect(login.body).not.toContain("secret");

    const me = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.username).toBe("owner");

    const wrongPin = await app.inject({ method: "POST", url: "/api/v1/auth/verify-owner-pin", headers: { cookie }, payload: { ownerPin: "000000" } });
    expect(wrongPin.statusCode).toBe(403);
    const validPin = await app.inject({ method: "POST", url: "/api/v1/auth/verify-owner-pin", headers: { cookie }, payload: { ownerPin: "123456" } });
    expect(validPin.statusCode).toBe(200);

    const logout = await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: { cookie } });
    expect(logout.statusCode).toBe(200);

    const expired = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } });
    expect(expired.statusCode).toBe(401);
  });

  it("creates, lists, updates, and soft-deletes customers and products", async () => {
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
    const productId = product.json().data.id as string;

    const list = await app.inject({ method: "GET", url: "/api/v1/products?type=LM&active=true&limit=10", headers: { cookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(1);

    const updated = await app.inject({ method: "PATCH", url: `/api/v1/products/${productId}`, headers: { cookie }, payload: { name: "LM Updated" } });
    expect(updated.statusCode).toBe(200);

    const deleted = await app.inject({ method: "DELETE", url: `/api/v1/products/${productId}`, headers: { cookie } });
    expect(deleted.statusCode).toBe(200);

    const inactive = await app.inject({ method: "GET", url: "/api/v1/products?active=false", headers: { cookie } });
    expect(inactive.statusCode).toBe(200);
    expect(inactive.json().data).toHaveLength(1);
  });

  it("uses the same calculation for Bon preview and creation, then locks Lunas Bon", async () => {
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
    const remove = await app.inject({ method: "DELETE", url: `/api/v1/bons/${created.json().data.id}`, headers: { cookie } });
    expect(remove.statusCode).toBe(422);
  });

  it("requires Owner PIN and reason for negative-profit transactions", async () => {
    const cookie = await loginCookie();
    const customer = await app.inject({ method: "POST", url: "/api/v1/customers", headers: { cookie }, payload: { name: "Toko Rugi", bonusThreshold: 1000000 } });
    const product = await app.inject({ method: "POST", url: "/api/v1/products", headers: { cookie }, payload: { name: "Produk Rugi", type: "BR", costPrice: 100000, basePrice: 50000 } });
    const payload = { customerId: customer.json().data.id, items: [{ productId: product.json().data.id, quantity: 1 }] };

    const denied = await app.inject({ method: "POST", url: "/api/v1/bons", headers: { cookie }, payload });
    expect(denied.statusCode).toBe(403);

    const approved = await app.inject({
      method: "POST",
      url: "/api/v1/bons",
      headers: { cookie },
      payload: { ...payload, ownerPin: "123456", negativeProfitReason: "Promosi khusus" }
    });
    expect(approved.statusCode).toBe(201);
    expect(approved.json().data.hasNegativeProfit).toBe(true);
  });

  it("settles, cancels payment, and updates cash-basis reporting", async () => {
    const cookie = await loginCookie();
    const { customerId, productId } = await createCustomerProduct(cookie);
    const created = await app.inject({ method: "POST", url: "/api/v1/bons", headers: { cookie }, payload: { customerId, items: [{ productId, quantity: 1 }], shippingCost: 5000 } });
    const bonId = created.json().data.id as string;

    const settlement = await app.inject({ method: "POST", url: "/api/v1/settlements", headers: { cookie }, payload: { customerId, bonIds: [bonId], settlementDate: "2026-06-19T00:00:00.000Z" } });
    expect(settlement.statusCode).toBe(201);
    const paymentId = settlement.json().data.id as string;

    const paid = await app.inject({ method: "GET", url: "/api/v1/reports/overall", headers: { cookie } });
    expect(paid.json().data.activePaymentAmount).toBeGreaterThan(0);

    const denied = await app.inject({ method: "POST", url: `/api/v1/payments/${paymentId}/cancel`, headers: { cookie }, payload: { ownerPin: "000000", reason: "Salah bayar" } });
    expect(denied.statusCode).toBe(403);

    const canceled = await app.inject({ method: "POST", url: `/api/v1/payments/${paymentId}/cancel`, headers: { cookie }, payload: { ownerPin: "123456", reason: "Salah bayar" } });
    expect(canceled.statusCode).toBe(200);

    const after = await app.inject({ method: "GET", url: "/api/v1/reports/overall", headers: { cookie } });
    expect(after.json().data.activePaymentAmount).toBe(0);
    expect(after.json().data.historicalPaymentAmount).toBeGreaterThan(0);
  });

  it("voids one paid Bon through an Owner-authorized endpoint", async () => {
    const cookie = await loginCookie();
    const { customerId, productId } = await createCustomerProduct(cookie);
    const created = await app.inject({ method: "POST", url: "/api/v1/bons", headers: { cookie }, payload: { customerId, items: [{ productId, quantity: 1 }] } });
    const bonId = created.json().data.id as string;
    await app.inject({ method: "POST", url: "/api/v1/settlements", headers: { cookie }, payload: { customerId, bonIds: [bonId] } });

    const denied = await app.inject({ method: "POST", url: `/api/v1/bons/${bonId}/void`, headers: { cookie }, payload: { ownerPin: "000000", reason: "Salah input" } });
    expect(denied.statusCode).toBe(403);

    const result = await app.inject({ method: "POST", url: `/api/v1/bons/${bonId}/void`, headers: { cookie }, payload: { ownerPin: "123456", reason: "Salah input" } });
    expect(result.statusCode).toBe(200);
    expect(result.json().data.status).toBe("VOID");
  });

  it("earns and uses bonus units without adding revenue or profit", async () => {
    const cookie = await loginCookie();
    const { customerId, productId } = await createCustomerProduct(cookie, 90000);
    const regular = await app.inject({ method: "POST", url: "/api/v1/bons", headers: { cookie }, payload: { customerId, items: [{ productId, quantity: 1 }] } });
    await app.inject({ method: "POST", url: "/api/v1/settlements", headers: { cookie }, payload: { customerId, bonIds: [regular.json().data.id] } });

    const availability = await app.inject({ method: "GET", url: `/api/v1/customers/${customerId}/bonus`, headers: { cookie } });
    expect(availability.statusCode).toBe(200);
    expect(availability.json().data.availableUnits).toBeGreaterThanOrEqual(1);

    const bonusBon = await app.inject({ method: "POST", url: "/api/v1/bonus-bons", headers: { cookie }, payload: { customerId, items: [{ productId, quantity: 1 }] } });
    expect(bonusBon.statusCode).toBe(201);
    expect(bonusBon.json().data.totalAmount).toBe(0);
    expect(bonusBon.json().data.profitAmount).toBe(0);
  });

  it("filters reports by month/year and streams a non-empty PDF", async () => {
    const cookie = await loginCookie();
    const { customerId, productId } = await createCustomerProduct(cookie);
    const created = await app.inject({ method: "POST", url: "/api/v1/bons", headers: { cookie }, payload: { customerId, items: [{ productId, quantity: 1 }], shippingCost: 0 } });
    await app.inject({ method: "POST", url: "/api/v1/settlements", headers: { cookie }, payload: { customerId, bonIds: [created.json().data.id], settlementDate: "2026-06-19T00:00:00.000Z" } });

    const report = await app.inject({ method: "GET", url: "/api/v1/reports/overall?month=6&year=2026", headers: { cookie } });
    expect(report.statusCode).toBe(200);
    expect(report.json().data.activePaymentAmount).toBeGreaterThan(0);

    const invalidPeriod = await app.inject({ method: "GET", url: "/api/v1/reports/overall?month=6", headers: { cookie } });
    expect(invalidPeriod.statusCode).toBe(400);

    const pdf = await app.inject({ method: "GET", url: "/api/v1/pdf/overall?month=6&year=2026", headers: { cookie } });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.rawPayload.length).toBeGreaterThan(100);
  });

  async function loginCookie() {
    await createUser(ctx.db);
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username: "owner", password: "secret" } });
    return extractCookie(login);
  }

  async function createCustomerProduct(cookie: string, bonusThreshold = 100000) {
    const customer = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { cookie },
      payload: { name: "Toko API", bonusThreshold, discountTiers: [{ productType: "LM", sequence: 1, percentBps: 1000 }] }
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
