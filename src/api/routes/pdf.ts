import type { FastifyInstance } from "fastify";
import PDFDocument from "pdfkit";
import type { ApiContext } from "../types";
import { reportFilterSchema } from "../schemas/common";
import { toReportFilters } from "./reports";

export async function registerPdfRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/pdf/transactions", async (request, reply) => {
    const data = await ctx.reports.overall(toReportFilters(reportFilterSchema.parse(request.query)));
    return sendPdf(reply, "Rekap Transaksi", data);
  });
  app.get("/api/v1/pdf/receivables", async (request, reply) => {
    const data = await ctx.reports.overall(toReportFilters(reportFilterSchema.parse(request.query)));
    return sendPdf(reply, "Rekap Piutang", data);
  });
  app.get("/api/v1/pdf/customers/:id", async (request, reply) => {
    const params = { id: String((request.params as { id: string }).id) };
    const data = await ctx.reports.byCustomer(params.id, toReportFilters(reportFilterSchema.parse(request.query)));
    return sendPdf(reply, "Rekap Pelanggan", data);
  });
  app.get("/api/v1/pdf/overall", async (request, reply) => {
    const data = await ctx.reports.overall(toReportFilters(reportFilterSchema.parse(request.query)));
    return sendPdf(reply, "Rekap Keseluruhan", data);
  });
  app.get("/api/v1/pdf/bonus-log", async (_request, reply) => {
    const data = await ctx.db.bonusLedger.findMany({ orderBy: { createdAt: "asc" } });
    return sendPdf(reply, "Log Bonus", data);
  });
}

async function sendPdf(reply: { header: (name: string, value: string) => unknown; send: (payload: Buffer) => unknown }, title: string, data: unknown) {
  const buffer = await renderPdf(title, data);
  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", `attachment; filename="${title.toLowerCase().replace(/\s+/g, "-")}.pdf"`);
  return reply.send(buffer);
}

function renderPdf(title: string, data: unknown) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(16).text(title);
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Dibuat: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`);
    doc.moveDown();
    doc.fontSize(9).text(JSON.stringify(data, jsonReplacer, 2), { lineGap: 2 });
    doc.end();
  });
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}
