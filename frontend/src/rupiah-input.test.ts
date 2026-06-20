import { describe, expect, it } from "vitest";
import { formatRupiahInput, parseRupiahInput } from "./rupiah-input";

describe("Rupiah input formatting", () => {
  it("adds Indonesian thousand separators", () => {
    expect(formatRupiahInput(1_000)).toBe("1.000");
    expect(formatRupiahInput(12_500_000)).toBe("12.500.000");
  });

  it("keeps the stored value numeric", () => {
    expect(parseRupiahInput("Rp 12.500.000")).toBe(12_500_000);
    expect(parseRupiahInput("1.250")).toBe(1_250);
  });
});
