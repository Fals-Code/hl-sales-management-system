import { describe, expect, it } from "vitest";
import { calculateStoredBon } from "./stored-bon-calculation";
import type { StoredBon, StoredCustomer, StoredProduct } from "./store";

it("uses hydrated customer and snapshot product data instead of demo catalog fallbacks", () => {
  const customer: StoredCustomer = {
    backendId: "customer-api",
    code: "PLG-API",
    name: "Pelanggan API",
    phone: "",
    address: "",
    discountLm: [10],
    discountBr: [],
    bonusThreshold: 0,
    accumulatedPaidOmzet: 0,
    bonusesGranted: 0,
    thresholdHistory: [],
    active: true
  };
  const product: StoredProduct = {
    backendId: "product-api",
    id: "PRD-API",
    name: "Nama katalog sekarang",
    type: "LM",
    stock: 7,
    costPrice: 70_000,
    basePrice: 100_000,
    active: true
  };
  const bon: StoredBon = {
    backendId: "bon-api",
    number: "BON-20260620-001",
    date: "2026-06-20",
    customerCode: "PLG-API",
    description: "",
    status: "Piutang",
    shipping: 10_000,
    isBonus: false,
    lines: [{
      productId: "PRD-API",
      backendProductId: "product-api",
      quantity: 2,
      snapshotProductName: "Nama saat transaksi",
      snapshotProductType: "LM",
      snapshotCostPrice: 60_000,
      snapshotBasePrice: 90_000,
      snapshotDiscounts: [10]
    }]
  };

  const result = calculateStoredBon(bon, [customer], [product]);

  expect(result.customer.name).toBe("Pelanggan API");
  expect(result.lineDetails[0].product.name).toBe("Nama saat transaksi");
  expect(result.lineDetails[0].discountedUnitPrice).toBe(81_000);
  expect(result.omzet).toBe(162_000);
  expect(result.amountOwed).toBe(172_000);
  expect(result.profit).toBe(42_000);
});
