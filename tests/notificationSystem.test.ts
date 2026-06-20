import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/api/app";
import { NotificationService } from "../src/services/notificationService";
import { createTestContext, createUser, resetDb, type TestContext } from "./helpers";

describe("notification system", () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext("notification-system");
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

  it("persists domain notifications and supports read and dismiss actions", async () => {
    await createUser(ctx.db);
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: "owner", password: "secret" }
    });
    const cookie = extractCookie(login);

    const product = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { cookie },
      payload: { name: "Stok Rendah", type: "LM", stock: 3, costPrice: 80000, basePrice: 100000 }
    });
    expect(product.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/api/v1/notifications", headers: { cookie } });
    expect(list.statusCode).toBe(200);
    const payload = list.json<{ data: { items: Array<{ id: string; eventKey: string }>; unreadCount: number } }>().data;
    expect(payload.items.map((item) => item.eventKey)).toEqual(expect.arrayContaining(["auth-login", "product-created", "inventory-stock"]));
    expect(payload.unreadCount).toBeGreaterThanOrEqual(3);

    const first = payload.items[0];
    const read = await app.inject({ method: "POST", url: `/api/v1/notifications/${first.id}/read`, headers: { cookie } });
    expect(read.statusCode).toBe(200);
    expect(read.json<{ data: { readAt: string | null } }>().data.readAt).toBeTruthy();

    const unread = await app.inject({ method: "GET", url: "/api/v1/notifications?mode=UNREAD", headers: { cookie } });
    const unreadPayload = unread.json<{ data: { items: Array<{ id: string }> } }>().data;
    expect(unreadPayload.items.some((item) => item.id === first.id)).toBe(false);

    const dismissTarget = payload.items.find((item) => item.id !== first.id);
    expect(dismissTarget).toBeTruthy();
    const dismissed = await app.inject({ method: "DELETE", url: `/api/v1/notifications/${dismissTarget!.id}`, headers: { cookie } });
    expect(dismissed.statusCode).toBe(200);

    const markAll = await app.inject({ method: "POST", url: "/api/v1/notifications/read-all", headers: { cookie } });
    expect(markAll.statusCode).toBe(200);
    const finalList = await app.inject({ method: "GET", url: "/api/v1/notifications", headers: { cookie } });
    const finalPayload = finalList.json<{ data: { unreadCount: number; items: Array<{ id: string }> } }>().data;
    expect(finalPayload.unreadCount).toBe(0);
    expect(finalPayload.items.some((item) => item.id === dismissTarget!.id)).toBe(false);
  });

  it("broadcasts a persisted event to realtime subscribers", async () => {
    const user = await createUser(ctx.db);
    const service = new NotificationService(ctx.db);
    const received: string[] = [];
    const unsubscribe = service.hub.subscribe(user.id, (notification) => received.push(notification.eventKey));

    await service.publish({
      userId: user.id,
      eventKey: "test-realtime",
      category: "SYSTEM",
      severity: "INFO",
      title: "Realtime",
      message: "Event diterima."
    });
    unsubscribe();

    expect(received).toEqual(["test-realtime"]);
  });
});

function extractCookie(response: { headers: Record<string, string | string[] | undefined> }) {
  const raw = response.headers["set-cookie"];
  const cookie = Array.isArray(raw) ? raw[0] : raw;
  if (!cookie) throw new Error("Set-Cookie header is missing.");
  return cookie.split(";")[0];
}
