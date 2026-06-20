import { describe, expect, it } from "vitest";
import type { HydrationPayload } from "./hydration-api";
import { mapHydrationPayload } from "./resource-mappers";

const payload: HydrationPayload = {
  generatedAt: "2026-06-19T12:00:00.000Z",
  customers: [
    {
      id: "customer-active",
      code: "PLG-001",
      name: "Toko Aktif",
      phone: null,
      address: "Surabaya",
      bonusThreshold: 100_000,
      deletedAt: null,
      discountTiers: [
        { productType: "LM", sequence: 2, percentBps: 500 },
        { productType: "LM", sequence: 1, percentBps: 1000 },
        { productType: "BR", sequence: 1, percentBps: 250 }
      ],
      thresholdHistories: [
        {
          oldValue: 80_000,
          newValue: 100_000,
          effectiveFrom: "2026-06-01T00:00:00.000Z",
          reason: "Penyesuaian"
        }
      ],
      bonusAvailability: {
        threshold: 100_000,
        totalSettledRevenue: 350_000,
        entitledUnits: 3,
        usedUnits: 2,
        adjustmentUnits: 0,
        ledgerBalance: 1,
        availableUnits: 1
      }
    }
  ],
  products: [
    {
      id: "product-active",
      sku: "PRD-001",
      name: "Logam Mulia",
      type: "LM",
      costPrice: 80_000,
      basePrice: 100_000,
      deletedAt: null
    }
  ],
  bons: [
    {
      id: "bon-paid",
      bonNumber: "BON-20260619-001",
      customerId: "customer-active",
      status: "LUNAS",
      bonDate: "2026-06-19T00:00:00.000Z",
      settledAt: "2026-06-20T00:00:00.000Z",
      deletedAt: null,
      shippingCost: 10_000,
      description: "Transaksi aktif",
      customer: { id: "customer-active", code: "PLG-001", name: "Toko Aktif" },
      items: [
        {
          id: "item-active",
          productId: "product-active",
          kind: "REGULER",
          productNameSnapshot: "Logam Mulia",
          productTypeSnapshot: "LM",
          costPriceSnapshot: 80_000,
          basePriceSnapshot: 100_000,
          discountSnapshotJson: JSON.stringify([
            { sequence: 2, percentBps: 500 },
            { sequence: 1, percentBps: 1000 }
          ]),
          quantity: 2,
          isBonus: false
        }
      ]
    },
    {
      id: "bon-historical",
      bonNumber: "BONUS-20260618-001",
      customerId: "customer-historical",
      status: "PIUTANG",
      bonDate: "2026-06-18T00:00:00.000Z",
      settledAt: null,
      deletedAt: null,
      shippingCost: 99_000,
      description: null,
      customer: { id: "customer-historical", code: null, name: "Pelanggan Historis" },
      items: [
        {
          id: "item-historical",
          productId: "product-historical",
          kind: "BONUS",
          productNameSnapshot: "Produk Historis",
          productTypeSnapshot: "BR",
          costPriceSnapshot: 40_000,
          basePriceSnapshot: 60_000,
          discountSnapshotJson: "[]",
          quantity: 1,
          isBonus: true
        }
      ]
    }
  ]
};

describe("mapHydrationPayload", () => {
  it("maps active resources and preserves ordered transaction snapshots", () => {
    const state = mapHydrationPayload(payload);
    const customer = state.customers.find((item) => item.backendId === "customer-active");
    const bon = state.bons.find((item) => item.backendId === "bon-paid");

    expect(customer?.discountLm).toEqual([10, 5]);
    expect(customer?.discountBr).toEqual([2.5]);
    expect(customer?.bonusesGranted).toBe(2);
    expect(customer?.thresholdHistory[0]).toEqual({
      date: "2026-06-01",
      previousAmount: 80_000,
      newAmount: 100_000,
      note: "Penyesuaian"
    });
    expect(bon?.status).toBe("Lunas");
    expect(bon?.paymentDate).toBe("2026-06-20");
    expect(bon?.lines[0].productId).toBe("PRD-001");
    expect(bon?.lines[0].snapshotDiscounts).toEqual([10, 5]);
  });

  it("creates inactive snapshot resources for historical relations", () => {
    const state = mapHydrationPayload(payload);
    const customer = state.customers.find((item) => item.backendId === "customer-historical");
    const product = state.products.find((item) => item.backendId === "product-historical");
    const bon = state.bons.find((item) => item.backendId === "bon-historical");

    expect(customer?.active).toBe(false);
    expect(product?.active).toBe(false);
    expect(bon?.status).toBe("Bonus");
    expect(bon?.shipping).toBe(0);
    expect(bon?.lines[0].productId).toBe(product?.id);
  });
});
