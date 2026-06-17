import { describe, expect, it } from "vitest";
import { applyCascadingDiscount, calculateBon, ITEM_KIND, roundToNearestHundred } from "../src";

describe("calculation engine", () => {
  it("calculates single and cascading discount without summing percentages", () => {
    expect(applyCascadingDiscount(100000, [{ sequence: 1, percentBps: 1000 }])).toBe(90000);
    expect(applyCascadingDiscount(100000, [{ sequence: 1, percentBps: 1000 }, { sequence: 2, percentBps: 500 }])).toBe(85500);
  });

  it("rounds to nearest Rp100 at all edge remainders", () => {
    expect(roundToNearestHundred(12300)).toBe(12300);
    expect(roundToNearestHundred(12349)).toBe(12300);
    expect(roundToNearestHundred(12350)).toBe(12400);
    expect(roundToNearestHundred(12399)).toBe(12400);
  });

  it("separates LM/BR revenue, shipping, and product profit", () => {
    const result = calculateBon(
      [
        { productName: "LM", productType: "LM", costPrice: 80000, basePrice: 100000, quantity: 1, discounts: [{ sequence: 1, percentBps: 1000 }] },
        { productName: "BR", productType: "BR", costPrice: 50000, basePrice: 50000, quantity: 1 }
      ],
      15000
    );
    expect(result.revenueLm).toBe(90000);
    expect(result.revenueBr).toBe(50000);
    expect(result.totalAmount).toBe(155000);
    expect(result.profitAmount).toBe(10000);
  });

  it("handles positive, zero, and negative regular profit", () => {
    expect(calculateBon([{ productName: "P", productType: "BR", costPrice: 1000, basePrice: 2000, quantity: 1 }]).profitAmount).toBe(1000);
    expect(calculateBon([{ productName: "P", productType: "BR", costPrice: 1000, basePrice: 1000, quantity: 1 }]).profitAmount).toBe(0);
    const loss = calculateBon([{ productName: "P", productType: "BR", costPrice: 2000, basePrice: 1000, quantity: 1 }]);
    expect(loss.profitAmount).toBe(-1000);
    expect(loss.hasNegativeProfit).toBe(true);
  });

  it("keeps bonus item at Rp0 and does not affect HL profit or negative-profit flag", () => {
    const result = calculateBon([{ productName: "Bonus", productType: "BR", costPrice: 10000, basePrice: 50000, quantity: 2, kind: ITEM_KIND.BONUS }]);
    expect(result.totalAmount).toBe(0);
    expect(result.revenueBr).toBe(0);
    expect(result.profitAmount).toBe(0);
    expect(result.bonusCost).toBe(20000);
    expect(result.hasNegativeProfit).toBe(false);
  });
});
