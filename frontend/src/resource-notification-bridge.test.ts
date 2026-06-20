import { afterEach, describe, expect, it, vi } from "vitest";

class TestCustomEvent<T> extends Event {
  readonly detail: T;

  constructor(type: string, init: { detail: T }) {
    super(type);
    this.detail = init.detail;
  }
}

describe("resource notification bridge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("publishes a persistent notification after product creation", async () => {
    const browserWindow = Object.assign(new EventTarget(), {
      location: { hostname: "localhost" }
    });
    vi.stubGlobal("window", browserWindow);
    vi.stubGlobal("CustomEvent", TestCustomEvent);

    const { APP_NOTIFICATION_EVENT } = await import("./notification-events");
    const { productResourceApi } = await import("./write-resources");
    const { installResourceNotificationBridge } = await import("./resource-notification-bridge");

    productResourceApi.create = vi.fn(async (payload) => ({
      id: "prd-1",
      sku: payload.sku,
      name: payload.name,
      type: payload.type,
      stock: payload.stock,
      costPrice: payload.costPrice,
      basePrice: payload.basePrice,
      deletedAt: null
    }));

    const received: Array<{ category: string; title: string; message: string }> = [];
    window.addEventListener(APP_NOTIFICATION_EVENT, (event) => {
      received.push((event as CustomEvent<{ category: string; title: string; message: string }>).detail);
    });

    installResourceNotificationBridge();
    await productResourceApi.create({
      sku: "PRD-001",
      name: "Produk Baru",
      type: "LM",
      stock: 10,
      costPrice: 100_000,
      basePrice: 125_000
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      category: "INVENTORY",
      title: "Produk berhasil ditambahkan",
      message: "Produk Baru telah ditambahkan."
    });
  });
});
