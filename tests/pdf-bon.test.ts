import { describe, expect, it } from "vitest";
import { renderBonPdf } from "../src/services/pdfBonService";

describe("Bon PDF", () => {
  it("renders a customer-safe one-page A4 Bon document for a compact transaction", async () => {
    const buffer = await renderBonPdf({
      bonNumber: "BON-20260620-001",
      bonDate: "2026-06-20T00:00:00.000Z",
      status: "PIUTANG",
      settledAt: null,
      shippingCost: 15_000n,
      totalAfterDiscount: 275_000n,
      totalAmount: 290_000n,
      description: "Pengiriman ke toko cabang.",
      customer: {
        name: "Toko Uji PDF",
        code: "PLG-PDF-001",
        phone: "081234567890",
        address: "Surabaya"
      },
      items: [
        {
          productNameSnapshot: "Produk LM Uji",
          productTypeSnapshot: "LM",
          finalPrice: 275_000n,
          quantity: 1,
          subtotal: 275_000n,
          isBonus: false
        }
      ]
    });

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1_000);
    expect(countPdfPages(buffer)).toBe(1);
  });
});

function countPdfPages(buffer: Buffer) {
  return buffer.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}
