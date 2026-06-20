import type { FastifyInstance } from "fastify";
import { renderBonPdf } from "../../services/pdfBonService";
import { renderReportPdf, type PdfReportInput } from "../../services/pdfReportService";
import type { ReportFilters } from "../../services/reportingService";
import type { ApiContext } from "../types";
import { reportFilterSchema } from "../schemas/common";
import { toReportFilters } from "./reports";

export async function registerPdfRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/pdf/transactions", async (request, reply) => {
    const filters = toReportFilters(reportFilterSchema.parse(request.query));
    return sendReportPdf(reply, {
      kind: "transactions",
      title: "Rekap Transaksi",
      subtitle: "Cash basis untuk transaksi Lunas dan Tanggal Bon untuk Piutang",
      summary: await ctx.reports.overall(filters),
      rows: await ctx.reports.transactionRows(filters),
      filters
    });
  });

  app.get("/api/v1/pdf/receivables", async (request, reply) => {
    const filters = toReportFilters(reportFilterSchema.parse(request.query));
    return sendReportPdf(reply, {
      kind: "receivables",
      title: "Rekap Piutang",
      subtitle: "Estimasi nilai yang belum diakui sebagai omzet",
      summary: await ctx.reports.overall(filters),
      rows: await ctx.reports.receivableRows(filters),
      filters
    });
  });

  app.get("/api/v1/pdf/customers/:id", async (request, reply) => {
    const id = String((request.params as { id: string }).id);
    const customer = await ctx.db.customer.findFirstOrThrow({ where: { id, deletedAt: null }, select: { name: true, code: true } });
    const filters = { ...toReportFilters(reportFilterSchema.parse(request.query)), customerId: id };
    return sendReportPdf(reply, {
      kind: "customer",
      title: "Rekap Pelanggan",
      subtitle: `${customer.name}${customer.code ? ` - ${customer.code}` : ""}`,
      summary: await ctx.reports.byCustomer(id, filters),
      rows: await ctx.reports.transactionRows(filters),
      filters
    });
  });

  app.get("/api/v1/pdf/overall", async (request, reply) => {
    const filters = toReportFilters(reportFilterSchema.parse(request.query));
    return sendReportPdf(reply, {
      kind: "overall",
      title: "Rekap Keseluruhan",
      subtitle: "Ringkasan omzet, laba, pembayaran, Piutang, dan bonus",
      summary: await ctx.reports.overall(filters),
      filters
    });
  });

  app.get("/api/v1/pdf/bonus-log", async (request, reply) => {
    const filters = toReportFilters(reportFilterSchema.parse(request.query));
    return sendReportPdf(reply, {
      kind: "bonus-log",
      title: "Log Bonus",
      subtitle: "Riwayat perolehan, penggunaan, dan pembalikan unit bonus",
      rows: await ctx.reports.bonusLogRows(filters),
      filters
    });
  });

  app.get("/api/v1/pdf/bons/:id", async (request, reply) => {
    const id = String((request.params as { id: string }).id);
    const bon = await ctx.db.bon.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { name: true, code: true, phone: true, address: true } },
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            productNameSnapshot: true,
            productTypeSnapshot: true,
            finalPrice: true,
            quantity: true,
            subtotal: true,
            isBonus: true
          }
        }
      }
    });
    const buffer = await renderBonPdf(bon);
    return sendPdfBuffer(reply, buffer, `${slug(bon.bonNumber)}.pdf`);
  });
}

async function sendReportPdf(reply: PdfReply, input: PdfReportInput) {
  const buffer = await renderReportPdf(input);
  return sendPdfBuffer(reply, buffer, `${slug(input.title)}${reportFilenameSuffix(input.filters)}.pdf`);
}

function sendPdfBuffer(reply: PdfReply, buffer: Buffer, filename: string) {
  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", `attachment; filename="${filename}"`);
  reply.header("Content-Length", String(buffer.length));
  return reply.send(buffer);
}

function reportFilenameSuffix(filters?: ReportFilters) {
  const parts: string[] = [];
  if (filters?.year && filters.month) parts.push(`${filters.year}-${String(filters.month).padStart(2, "0")}`);
  if (filters?.productType) parts.push(filters.productType.toLowerCase());
  return parts.length ? `-${parts.join("-")}` : "";
}

type PdfReply = {
  header: (name: string, value: string) => unknown;
  send: (payload: Buffer) => unknown;
};

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
