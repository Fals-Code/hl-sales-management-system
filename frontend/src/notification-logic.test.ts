import { describe, expect, it } from "vitest";
import { buildActionableNotifications, deduplicateNotifications } from "./notification-logic";
import type { StoredBon, StoredCustomer, StoredProduct } from "./store";
import type { AppNotification } from "./notification-events";

const customer: StoredCustomer = {
  backendId: "cus-1",
  code: "PLG-001",
  name: "Toko Uji",
  phone: "",
  address: "",
  discountLm: [],
  discountBr: [],
  bonusThreshold: 1_000_000,
  accumulatedPaidOmzet: 2_500_000,
  bonusesGranted: 1,
  thresholdHistory: [],
  active: true
};

const product: StoredProduct = {
  backendId: "prd-1",
  id: "PRD-001",
  name: "Produk Uji",
  type: "LM",
  stock: 3,
  costPrice: 900_000,
  basePrice: 800_000,
  active: true
};

const bon: StoredBon = {
  backendId: "bon-1",
  number: "BON-20260501-001",
  date: "2026-05-01",
  customerCode: "PLG-001",
  description: "",
  status: "Piutang",
  shipping: 0,
  isBonus: false,
  lines: [{
    productId: "PRD-001",
    backendProductId: "prd-1",
    quantity: 1,
    snapshotCostPrice: 900_000,
    snapshotBasePrice: 800_000,
    snapshotDiscounts: []
  }]
};

describe("general notification logic", () => {
  it("derives stock, bonus, overdue receivable, and negative-profit notifications", () => {
    const notifications = buildActionableNotifications({
      customers: [customer],
      products: [product],
      bons: [bon],
      now: new Date("2026-06-20T00:00:00.000Z"),
      overdueDays: 30,
      lowStockThreshold: 5
    });

    expect(notifications.map((item) => item.eventKey)).toEqual(expect.arrayContaining([
      "inventory-stock",
      "bonus-eligible",
      "receivable-overdue",
      "negative-profit"
    ]));
    expect(notifications.filter((item) => item.severity === "CRITICAL").length).toBeGreaterThan(0);
  });

  it("removes actionable notifications when conditions are resolved", () => {
    const notifications = buildActionableNotifications({
      customers: [{ ...customer, accumulatedPaidOmzet: 0 }],
      products: [{ ...product, stock: 20 }],
      bons: [{ ...bon, status: "Lunas", lines: [{ ...bon.lines[0], snapshotCostPrice: 700_000 }] }],
      now: new Date("2026-06-20T00:00:00.000Z")
    });

    expect(notifications).toHaveLength(0);
  });

  it("deduplicates by event key and entity id", () => {
    const base: AppNotification = {
      id: "ignored",
      eventKey: "inventory-stock",
      category: "INVENTORY",
      severity: "WARNING",
      title: "Stok rendah",
      message: "Tersisa sedikit",
      entityType: "PRODUCT",
      entityId: "prd-1",
      createdAt: "2026-06-20T00:00:00.000Z"
    };
    const result = deduplicateNotifications([base, { ...base, id: "other", severity: "CRITICAL" }]);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("CRITICAL");
  });
});
