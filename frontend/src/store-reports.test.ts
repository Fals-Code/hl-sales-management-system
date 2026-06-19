import { describe, expect, it } from "vitest";
import { calculateScoped, reportDateFor } from "./reporting-logic";
import type { StoredBon, StoredCustomer, StoredProduct } from "./store";

const customer: StoredCustomer = {
  code: "PLG-001",
  name: "Toko Uji",
  phone: "",
  address: "",
  discountLm: [10],
  discountBr: [20],
  bonusThreshold: 1_000_000,
  accumulatedPaidOmzet: 0,
  bonusesGranted: 0,
  thresholdHistory: [],
  active: true
};

const products: StoredProduct[] = [
  { id: "LM-1", name: "LM", type: "LM", stock: 1, costPrice: 70_000, basePrice: 100_000, active: true },
  { id: "BR-1", name: "BR", type: "BR", stock: 1, costPrice: 50_000, basePrice: 100_000, active: true }
];

const bon: StoredBon = {
  number: "BON-20260530-001",
  date: "2026-05-30",
  paymentDate: "2026-06-02",
  customerCode: customer.code,
  description: "lintas bulan",
  status: "Lunas",
  shipping: 10_000,
  isBonus: false,
  lines: [
    { productId: "LM-1", quantity: 1, snapshotProductType: "LM", snapshotBasePrice: 100_000, snapshotCostPrice: 70_000, snapshotDiscounts: [10] },
    { productId: "BR-1", quantity: 1, snapshotProductType: "BR", snapshotBasePrice: 100_000, snapshotCostPrice: 50_000, snapshotDiscounts: [20] }
  ]
};

describe("store reports", () => {
  it("uses payment date for Lunas and Bon date for Piutang", () => {
    expect(reportDateFor(bon)).toBe("2026-06-02");
    expect(reportDateFor({ ...bon, status: "Piutang", paymentDate: undefined })).toBe("2026-05-30");
  });

  it("calculates LM and BR from the same scoped snapshot lines", () => {
    expect(calculateScoped(bon, "LM", [customer], products)).toMatchObject({ omzet: 90_000, profit: 20_000, lm: 90_000, br: 0, total: 90_000 });
    expect(calculateScoped(bon, "BR", [customer], products)).toMatchObject({ omzet: 80_000, profit: 30_000, lm: 0, br: 80_000, total: 80_000 });
    expect(calculateScoped(bon, "ALL", [customer], products).total).toBe(180_000);
  });

  it("keeps product type from snapshot even when current catalog type changes", () => {
    const changedCatalog = [{ ...products[0], type: "BR" as const }, products[1]];
    expect(calculateScoped(bon, "LM", [customer], changedCatalog).omzet).toBe(90_000);
  });
});
