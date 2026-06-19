import PDFDocument from "pdfkit";
import { toSafeMoneyNumber } from "../domain/money";
import type { ReportFilters } from "./reportingService";

export type PdfReportKind = "overall" | "transactions" | "receivables" | "customer" | "bonus-log";

export type PdfReportInput = {
  kind: PdfReportKind;
  title: string;
  subtitle?: string;
  summary?: unknown;
  rows?: unknown[];
  filters?: ReportFilters;
};

type Column = {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
  value: (row: unknown) => string;
};

const COLORS = {
  navy: "#123B5D",
  blue: "#245E89",
  pale: "#EEF5F9",
  border: "#D7E1E8",
  text: "#1F2933",
  muted: "#647484",
  success: "#237A57",
  warning: "#9A6818",
  danger: "#A33B32",
  white: "#FFFFFF"
};

export function renderReportPdf(input: PdfReportInput) {
  return new Promise<Buffer>((resolve, reject) => {
    const landscape = input.kind !== "overall";
    const doc = new PDFDocument({
      size: "A4",
      layout: landscape ? "landscape" : "portrait",
      margin: 38,
      bufferPages: true,
      info: {
        Title: input.title,
        Author: "HL Sales Management",
        Subject: input.subtitle ?? input.title,
        Creator: "HL Sales Management App"
      }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, input);
    drawFilterStrip(doc, input.filters);
    if (input.summary) drawSummary(doc, input.summary, landscape ? 3 : 2);
    if (input.rows) drawRows(doc, input.kind, input.rows);
    drawFooters(doc);
    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, input: PdfReportInput) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  doc.roundedRect(left, doc.y, width, 70, 10).fill(COLORS.navy);
  const top = doc.y + 14;
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(10).text("HL SALES MANAGEMENT", left + 18, top, { characterSpacing: 0.8 });
  doc.fontSize(19).text(input.title, left + 18, top + 17, { width: width - 220 });
  if (input.subtitle) doc.font("Helvetica").fontSize(8.5).fillColor("#DDEAF2").text(input.subtitle, left + 18, top + 43, { width: width - 220 });
  const generated = formatDateTime(new Date());
  doc.font("Helvetica").fontSize(8).fillColor("#DDEAF2").text("Dibuat", left + width - 170, top + 5, { width: 150, align: "right" });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white).text(generated, left + width - 170, top + 20, { width: 150, align: "right" });
  doc.y += 84;
  doc.fillColor(COLORS.text);
}

function drawFilterStrip(doc: PDFKit.PDFDocument, filters?: ReportFilters) {
  const values = filterLabels(filters);
  if (!values.length) return;
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  doc.roundedRect(left, doc.y, width, 28, 7).fill(COLORS.pale);
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8.5).text(values.join("   |   "), left + 12, doc.y + 9, { width: width - 24 });
  doc.y += 39;
  doc.fillColor(COLORS.text);
}

function drawSummary(doc: PDFKit.PDFDocument, summary: unknown, columns: number) {
  const metrics = summaryMetrics(summary);
  if (!metrics.length) return;
  sectionTitle(doc, "Ringkasan");
  const left = doc.page.margins.left;
  const gap = 10;
  const width = (contentWidth(doc) - gap * (columns - 1)) / columns;
  const height = 52;
  metrics.forEach((metric, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = left + column * (width + gap);
    const y = doc.y + row * (height + gap);
    doc.roundedRect(x, y, width, height, 8).lineWidth(0.7).fillAndStroke(COLORS.white, COLORS.border);
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7.5).text(metric.label, x + 12, y + 10, { width: width - 24 });
    doc.fillColor(metric.tone).font("Helvetica-Bold").fontSize(13).text(metric.value, x + 12, y + 26, { width: width - 24, ellipsis: true });
  });
  const rows = Math.ceil(metrics.length / columns);
  doc.y += rows * (height + gap) + 6;
  doc.fillColor(COLORS.text);
}

function drawRows(doc: PDFKit.PDFDocument, kind: PdfReportKind, rows: unknown[]) {
  sectionTitle(doc, kind === "bonus-log" ? "Riwayat Bonus" : "Rincian Transaksi");
  if (!rows.length) {
    const left = doc.page.margins.left;
    doc.roundedRect(left, doc.y, contentWidth(doc), 46, 8).fill(COLORS.pale);
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text("Tidak ada data pada filter yang dipilih.", left + 14, doc.y + 18);
    doc.y += 58;
    return;
  }
  const columns = kind === "bonus-log" ? bonusColumns() : transactionColumns();
  drawTable(doc, columns, rows);
}

function drawTable(doc: PDFKit.PDFDocument, columns: Column[], rows: unknown[]) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const totalWeight = columns.reduce((sum, column) => sum + column.width, 0);
  const widths = columns.map((column) => width * column.width / totalWeight);
  const drawHeaderRow = () => {
    ensureSpace(doc, 27);
    const y = doc.y;
    doc.rect(left, y, width, 25).fill(COLORS.navy);
    let x = left;
    columns.forEach((column, index) => {
      doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(7.2).text(column.label, x + 7, y + 8, { width: widths[index] - 14, align: column.align ?? "left" });
      x += widths[index];
    });
    doc.y = y + 25;
  };

  drawHeaderRow();
  rows.forEach((row, rowIndex) => {
    const values = columns.map((column) => column.value(row));
    const heights = values.map((value, index) => doc.font("Helvetica").fontSize(7.7).heightOfString(value, { width: widths[index] - 14, lineGap: 1 }));
    const rowHeight = Math.max(27, Math.max(...heights) + 13);
    if (doc.y + rowHeight > pageBottom(doc)) {
      doc.addPage();
      drawHeaderRow();
    }
    const y = doc.y;
    if (rowIndex % 2 === 1) doc.rect(left, y, width, rowHeight).fill("#F8FAFB");
    let x = left;
    columns.forEach((column, index) => {
      doc.fillColor(COLORS.text).font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7.7).text(values[index], x + 7, y + 7, { width: widths[index] - 14, align: column.align ?? "left", lineGap: 1 });
      x += widths[index];
    });
    doc.moveTo(left, y + rowHeight).lineTo(left + width, y + rowHeight).lineWidth(0.4).strokeColor(COLORS.border).stroke();
    doc.y = y + rowHeight;
  });
  doc.y += 8;
}

function transactionColumns(): Column[] {
  return [
    { label: "Nomor Bon", width: 1.25, value: (row) => textField(row, "bonNumber") },
    { label: "Pelanggan", width: 1.45, value: (row) => nestedText(row, "customer", "name") },
    { label: "Tanggal Acuan", width: 1, value: (row) => transactionDate(row) },
    { label: "Status", width: 0.75, value: (row) => statusLabel(textField(row, "status")) },
    { label: "Scope", width: 0.65, value: (row) => productScope(row), align: "center" },
    { label: "Total", width: 1.1, value: (row) => formatMoney(field(row, "totalAmount")), align: "right" }
  ];
}

function bonusColumns(): Column[] {
  return [
    { label: "Tanggal", width: 1, value: (row) => formatDate(field(row, "createdAt")) },
    { label: "Pelanggan", width: 1.5, value: (row) => nestedText(row, "customer", "name") },
    { label: "Mutasi", width: 0.9, value: (row) => mutationLabel(textField(row, "mutationType")) },
    { label: "Unit", width: 0.65, value: (row) => numberText(field(row, "amount")), align: "right" },
    { label: "Saldo", width: 0.65, value: (row) => numberText(field(row, "balanceAfter")), align: "right" },
    { label: "Keterangan", width: 2.2, value: (row) => textField(row, "reason") || "-" }
  ];
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 32);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(11).text(title);
  doc.moveDown(0.45);
  doc.strokeColor(COLORS.border).lineWidth(0.7).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.7);
}

function drawFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const y = doc.page.height - 24;
    doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(doc.page.margins.left, y - 8).lineTo(doc.page.width - doc.page.margins.right, y - 8).stroke();
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7).text("HL Sales Management - Dokumen laporan sistem", doc.page.margins.left, y, { width: contentWidth(doc) / 2 });
    doc.text(`Halaman ${index - range.start + 1} dari ${range.count}`, doc.page.width / 2, y, { width: contentWidth(doc) / 2, align: "right" });
  }
}

function summaryMetrics(summary: unknown) {
  const record = asRecord(summary);
  const definitions = [
    ["totalPiutang", "Piutang (Estimasi/Belum Diakui)", true, COLORS.warning],
    ["activePaymentAmount", "Pembayaran Aktif", true, COLORS.success],
    ["totalPaid", "Sudah Dibayar", true, COLORS.success],
    ["totalRevenue", "Omzet Diakui", true, COLORS.blue],
    ["totalProfit", "Laba HL Diakui", true, COLORS.navy],
    ["totalRevenueLm", "Omzet LM", true, COLORS.blue],
    ["totalRevenueBr", "Omzet BR", true, COLORS.blue],
    ["totalBonusCost", "Biaya Bonus", true, COLORS.danger],
    ["totalBon", "Jumlah Bon", false, COLORS.navy],
    ["bonusAvailable", "Bonus Tersedia", false, COLORS.success],
    ["negativeProfitTransactions", "Transaksi Laba Negatif", false, COLORS.danger],
    ["voidBonCount", "Bon Void", false, COLORS.danger]
  ] as const;
  return definitions
    .filter(([key]) => record[key] !== undefined)
    .slice(0, 9)
    .map(([key, label, currency, tone]) => ({ label, value: currency ? formatMoney(record[key]) : numberText(record[key]), tone }));
}

function filterLabels(filters?: ReportFilters) {
  if (!filters) return [];
  const labels: string[] = [];
  if (filters.month && filters.year) labels.push(`Periode: ${monthName(filters.month)} ${filters.year}`);
  if (filters.productType) labels.push(`Scope: ${filters.productType}`);
  if (filters.status) labels.push(`Status: ${statusLabel(filters.status)}`);
  if (filters.bonDateFrom || filters.bonDateTo) labels.push(`Tanggal Bon: ${formatDate(filters.bonDateFrom)} s.d. ${formatDate(filters.bonDateTo)}`);
  if (filters.paidAtFrom || filters.paidAtTo) labels.push(`Tanggal Pelunasan: ${formatDate(filters.paidAtFrom)} s.d. ${formatDate(filters.paidAtTo)}`);
  return labels;
}

function productScope(row: unknown) {
  const items = field(row, "items");
  if (!Array.isArray(items)) return "-";
  const types = new Set(items.map((item) => textField(item, "productTypeSnapshot")).filter(Boolean));
  return [...types].join(" + ") || "-";
}

function transactionDate(row: unknown) {
  const status = textField(row, "status");
  return formatDate(status === "LUNAS" ? field(row, "settledAt") ?? field(row, "bonDate") : field(row, "bonDate"));
}

function mutationLabel(value: string) {
  const labels: Record<string, string> = { EARNED: "Diperoleh", USED: "Digunakan", REVERSED: "Dikembalikan", ADJUSTMENT: "Penyesuaian" };
  return labels[value] ?? value ?? "-";
}

function statusLabel(value: string) {
  const labels: Record<string, string> = { PIUTANG: "Piutang", LUNAS: "Lunas", VOID: "Void" };
  return labels[value] ?? value ?? "-";
}

function formatMoney(value: unknown) {
  const numeric = moneyNumber(value);
  return `Rp ${Math.round(numeric).toLocaleString("id-ID")}`;
}

function moneyNumber(value: unknown) {
  if (typeof value === "bigint") return toSafeMoneyNumber(value, "pdfMoney");
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function numberText(value: unknown) {
  const numeric = moneyNumber(value);
  return Math.round(numeric).toLocaleString("id-ID");
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date);
}

function monthName(month: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

function field(value: unknown, key: string): unknown {
  return asRecord(value)[key];
}

function textField(value: unknown, key: string) {
  const result = field(value, key);
  return result === null || result === undefined ? "" : String(result);
}

function nestedText(value: unknown, parent: string, key: string) {
  return textField(field(value, parent), key) || "-";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function pageBottom(doc: PDFKit.PDFDocument) {
  return doc.page.height - doc.page.margins.bottom - 24;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > pageBottom(doc)) doc.addPage();
}
