import { describe, expect, it } from "vitest";
import { renderReportPdf } from "../src/services/pdfReportService";

describe("Report PDF layout", () => {
  it("keeps a compact one-row transaction report on one A4 landscape page", async () => {
    const buffer = await renderReportPdf({
      kind: "transactions",
      title: "Rekap Transaksi",
      subtitle: "Cash basis untuk transaksi Lunas dan Tanggal Bon untuk Piutang",
      filters: { month: 6, year: 2026 },
      summary: {
        totalPiutang: 142_000,
        totalPaid: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalRevenueLm: 0,
        totalRevenueBr: 0,
        totalBonusCost: 0,
        negativeProfitTransactions: 0
      },
      rows: [
        {
          bonNumber: "BON-20260619-001",
          bonDate: "2026-06-19T00:00:00.000Z",
          settledAt: null,
          status: "PIUTANG",
          totalAfterDiscount: 130_000,
          totalAmount: 142_000,
          customer: { name: "Ayuni" },
          items: [{ productTypeSnapshot: "LM" }]
        }
      ]
    });

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(countPdfPages(buffer)).toBe(1);
  });
});

function countPdfPages(buffer: Buffer) {
  return buffer.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}
