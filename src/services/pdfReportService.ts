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

type Metric = {
  label: string;
  value: string;
  tone: string;
};

const COLORS = {
  navy: "#123B5D",
  navyDark: "#0B2942",
  blue: "#245E89",
  pale: "#EEF5F9",
  paleBlue: "#F5F8FB",
  border: "#D7E1E8",
  text: "#1F2933",
  muted: "#647484",
  success: "#237A57",
  warning: "#9A6818",
  danger: "#A33B32",
  white: "#FFFFFF"
};

const PAGE_MARGIN = 34;
const FOOTER_HEIGHT = 50;

export function renderReportPdf(input: PdfReportInput) {
  return new Promise<Buffer>((resolve, reject) => {
    const landscape = input.kind !== "overall";
    const doc = new PDFDocument({
      size: "A4",
      layout: landscape ? "landscape" : "portrait",
      margin: PAGE_MARGIN,
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

    drawReportHeader(doc, input);
    drawReportMeta(doc, input);

    if (input.summary) {
      drawSummary(doc, input.summary, landscape ? 4 : 2);
    }

    if (input.rows) {
      drawRows(doc, input, input.rows);
    }

    drawReportNote(doc, input.kind);
    drawFooters(doc, input.title);
    doc.end();
  });
}

function drawReportHeader(doc: PDFKit.PDFDocument, input: PdfReportInput) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);
  const height = 74;

  doc.roundedRect(x, y, width, height, 10).fill(COLORS.navyDark);
  doc.roundedRect(x, y, 92, height, 10).fill(COLORS.navy);

  textAt(doc, "HL", x + 18, y + 13, {
    width: 56,
    font: "Helvetica-Bold",
    fontSize: 22,
    color: COLORS.white
  });
  textAt(doc, "INTERNAL", x + 18, y + 43, {
    width: 56,
    font: "Helvetica-Bold",
    fontSize: 7,
    color: "#DDEAF2",
    characterSpacing: 0.8
  });

  textAt(doc, input.title.toUpperCase(), x + 112, y + 13, {
    width: width - 300,
    font: "Helvetica-Bold",
    fontSize: 17,
    color: COLORS.white
  });
  textAt(doc, input.subtitle ?? "Dokumen laporan internal", x + 112, y + 39, {
    width: width - 300,
    font: "Helvetica",
    fontSize: 8.2,
    color: "#DDEAF2"
  });

  textAt(doc, "DIBUAT", x + width - 160, y + 14, {
    width: 138,
    align: "right",
    font: "Helvetica-Bold",
    fontSize: 7,
    color: "#BFD3E1",
    characterSpacing: 0.6
  });
  textAt(doc, formatDateTime(new Date()), x + width - 160, y + 31, {
    width: 138,
    align: "right",
    font: "Helvetica-Bold",
    fontSize: 8.5,
    color: COLORS.white
  });
  textAt(doc, "IDR (Rp) | Tanpa PPN", x + width - 160, y + 51, {
    width: 138,
    align: "right",
    font: "Helvetica",
    fontSize: 7.4,
    color: "#DDEAF2"
  });

  doc.y = y + height + 14;
  doc.fillColor(COLORS.text);
}

function drawReportMeta(doc: PDFKit.PDFDocument, input: PdfReportInput) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);
  const labels = filterLabels(input.filters);
  const period = labels.length ? labels.join("  |  ") : "Semua periode dan seluruh data aktif";

  doc.roundedRect(x, y, width, 42, 7).fill(COLORS.pale);
  textAt(doc, "PARAMETER LAPORAN", x + 12, y + 8, {
    width: 112,
    font: "Helvetica-Bold",
    fontSize: 7,
    color: COLORS.blue,
    characterSpacing: 0.5
  });
  wrappedTextAt(doc, period, x + 12, y + 21, {
    width: width - 24,
    height: 15,
    font: "Helvetica",
    fontSize: 8,
    color: COLORS.text,
    ellipsis: true
  });

  doc.y = y + 53;
}

function drawSummary(doc: PDFKit.PDFDocument, summary: unknown, columns: number) {
  const metrics = summaryMetrics(summary);
  if (!metrics.length) return;

  sectionHeading(doc, "Ringkasan Eksekutif", "Nilai utama sesuai filter laporan");

  const gap = 8;
  const cardHeight = 50;
  const rows = Math.ceil(metrics.length / columns);
  const blockHeight = rows * cardHeight + (rows - 1) * gap;
  ensureSpace(doc, blockHeight + 12);

  const x = doc.page.margins.left;
  const y = doc.y;
  const width = (contentWidth(doc) - gap * (columns - 1)) / columns;

  metrics.forEach((metric, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cardX = x + column * (width + gap);
    const cardY = y + row * (cardHeight + gap);
    drawMetricCard(doc, cardX, cardY, width, cardHeight, metric);
  });

  doc.y = y + blockHeight + 14;
}

function drawMetricCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, metric: Metric) {
  doc.roundedRect(x, y, width, height, 7).lineWidth(0.6).fillAndStroke(COLORS.white, COLORS.border);
  doc.rect(x, y, 4, height).fill(metric.tone);

  wrappedTextAt(doc, metric.label, x + 12, y + 8, {
    width: width - 22,
    height: 17,
    font: "Helvetica",
    fontSize: 7.2,
    color: COLORS.muted,
    ellipsis: true
  });
  textAt(doc, metric.value, x + 12, y + 28, {
    width: width - 22,
    font: "Helvetica-Bold",
    fontSize: 11.3,
    color: COLORS.text
  });
}

function drawRows(doc: PDFKit.PDFDocument, input: PdfReportInput, rows: unknown[]) {
  const title = input.kind === "bonus-log" ? "Riwayat Bonus" : "Rincian Transaksi";
  sectionHeading(doc, title, `${rows.length.toLocaleString("id-ID")} baris data`);

  if (!rows.length) {
    const x = doc.page.margins.left;
    const y = doc.y;
    doc.roundedRect(x, y, contentWidth(doc), 50, 8).fill(COLORS.paleBlue);
    textAt(doc, "Tidak ada data pada filter yang dipilih.", x + 15, y + 19, {
      width: contentWidth(doc) - 30,
      font: "Helvetica",
      fontSize: 9,
      color: COLORS.muted
    });
    doc.y = y + 64;
    return;
  }

  const columns = input.kind === "bonus-log" ? bonusColumns() : transactionColumns();
  drawTable(doc, columns, rows, input.title);
}

function drawTable(doc: PDFKit.PDFDocument, columns: Column[], rows: unknown[], documentTitle: string) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const totalWeight = columns.reduce((sum, column) => sum + column.width, 0);
  const widths = columns.map((column) => width * column.width / totalWeight);

  const drawHeaderRow = () => {
    ensureSpace(doc, 27);
    const y = doc.y;
    doc.rect(x, y, width, 25).fill(COLORS.navy);

    let columnX = x;
    columns.forEach((column, index) => {
      textAt(doc, column.label, columnX + 6, y + 8, {
        width: widths[index] - 12,
        align: column.align ?? "left",
        font: "Helvetica-Bold",
        fontSize: 7,
        color: COLORS.white
      });
      columnX += widths[index];
    });

    doc.y = y + 25;
  };

  drawHeaderRow();

  rows.forEach((row, rowIndex) => {
    const values = columns.map((column) => column.value(row));
    const heights = values.map((value, index) => {
      doc.font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7.4);
      return doc.heightOfString(value, { width: widths[index] - 12, lineGap: 1 });
    });
    const rowHeight = Math.max(27, Math.min(54, Math.max(...heights) + 12));

    if (doc.y + rowHeight > pageBottom(doc)) {
      doc.addPage();
      drawContinuationHeader(doc, documentTitle);
      drawHeaderRow();
    }

    const y = doc.y;
    if (rowIndex % 2 === 1) doc.rect(x, y, width, rowHeight).fill(COLORS.paleBlue);

    let columnX = x;
    columns.forEach((column, index) => {
      wrappedTextAt(doc, values[index], columnX + 6, y + 7, {
        width: widths[index] - 12,
        height: rowHeight - 11,
        align: column.align ?? "left",
        font: index === 0 ? "Helvetica-Bold" : "Helvetica",
        fontSize: 7.4,
        color: COLORS.text,
        lineGap: 1,
        ellipsis: true
      });

      if (index > 0) {
        doc.moveTo(columnX, y).lineTo(columnX, y + rowHeight).lineWidth(0.3).strokeColor(COLORS.border).stroke();
      }
      columnX += widths[index];
    });

    doc.moveTo(x, y + rowHeight).lineTo(x + width, y + rowHeight).lineWidth(0.4).strokeColor(COLORS.border).stroke();
    doc.y = y + rowHeight;
  });

  doc.y += 12;
}

function drawContinuationHeader(doc: PDFKit.PDFDocument, title: string) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);

  textAt(doc, "HL SALES MANAGEMENT", x, y, {
    width: width * 0.55,
    font: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.navy
  });
  textAt(doc, `${title} - lanjutan`, x + width * 0.55, y, {
    width: width * 0.45,
    align: "right",
    font: "Helvetica",
    fontSize: 7.5,
    color: COLORS.muted
  });
  doc.moveTo(x, y + 15).lineTo(x + width, y + 15).lineWidth(0.6).strokeColor(COLORS.border).stroke();
  doc.y = y + 25;
}

function drawReportNote(doc: PDFKit.PDFDocument, kind: PdfReportKind) {
  const note = kind === "bonus-log"
    ? "Saldo bonus mengikuti mutasi ledger: perolehan, penggunaan, pembalikan, dan penyesuaian yang sah."
    : "Basis laporan: omzet, laba, dan pembayaran mengikuti Tanggal Pelunasan. Piutang mengikuti Tanggal Bon. Ongkir tidak dihitung sebagai omzet atau laba.";

  ensureSpace(doc, 54);
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);

  doc.roundedRect(x, y, width, 42, 7).fill(COLORS.pale);
  textAt(doc, "CATATAN METODOLOGI", x + 12, y + 8, {
    width: 126,
    font: "Helvetica-Bold",
    fontSize: 7,
    color: COLORS.blue,
    characterSpacing: 0.4
  });
  wrappedTextAt(doc, note, x + 12, y + 21, {
    width: width - 24,
    height: 15,
    font: "Helvetica",
    fontSize: 7.5,
    color: COLORS.text,
    ellipsis: true
  });

  doc.y = y + 52;
}

function drawFooters(doc: PDFKit.PDFDocument, title: string) {
  const range = doc.bufferedPageRange();

  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    const x = doc.page.margins.left;
    const width = contentWidth(doc);
    const y = doc.page.height - doc.page.margins.bottom - 10;

    doc.moveTo(x, y - 8).lineTo(x + width, y - 8).lineWidth(0.45).strokeColor(COLORS.border).stroke();
    textAt(doc, `INTERNAL | HL Sales Management | ${title}`, x, y, {
      width: width * 0.72,
      font: "Helvetica",
      fontSize: 6.8,
      color: COLORS.muted
    });
    textAt(doc, `Halaman ${pageIndex - range.start + 1} dari ${range.count}`, x + width * 0.72, y, {
      width: width * 0.28,
      align: "right",
      font: "Helvetica-Bold",
      fontSize: 6.8,
      color: COLORS.muted
    });
  }
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string, helper: string) {
  ensureSpace(doc, 31);
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);

  textAt(doc, title, x, y, {
    width: width * 0.62,
    font: "Helvetica-Bold",
    fontSize: 10.5,
    color: COLORS.navy
  });
  textAt(doc, helper, x + width * 0.62, y + 1, {
    width: width * 0.38,
    align: "right",
    font: "Helvetica",
    fontSize: 7.2,
    color: COLORS.muted
  });
  doc.moveTo(x, y + 17).lineTo(x + width, y + 17).lineWidth(0.55).strokeColor(COLORS.border).stroke();
  doc.y = y + 26;
}

function transactionColumns(): Column[] {
  return [
    { label: "Nomor Bon", width: 1.25, value: (row) => textField(row, "bonNumber") },
    { label: "Pelanggan", width: 1.35, value: (row) => nestedText(row, "customer", "name") },
    { label: "Tanggal Acuan", width: 0.9, value: (row) => transactionDate(row) },
    { label: "Status", width: 0.7, value: (row) => statusLabel(textField(row, "status")), align: "center" },
    { label: "Kategori", width: 0.65, value: (row) => productScope(row), align: "center" },
    { label: "Omzet", width: 0.95, value: (row) => formatMoney(field(row, "totalAfterDiscount")), align: "right" },
    { label: "Total Tagihan", width: 1.05, value: (row) => formatMoney(field(row, "totalAmount")), align: "right" }
  ];
}

function bonusColumns(): Column[] {
  return [
    { label: "Tanggal", width: 0.9, value: (row) => formatDate(field(row, "createdAt")) },
    { label: "Pelanggan", width: 1.35, value: (row) => nestedText(row, "customer", "name") },
    { label: "Mutasi", width: 0.85, value: (row) => mutationLabel(textField(row, "mutationType")) },
    { label: "Unit", width: 0.55, value: (row) => numberText(field(row, "amount")), align: "right" },
    { label: "Saldo", width: 0.55, value: (row) => numberText(field(row, "balanceAfter")), align: "right" },
    { label: "Keterangan", width: 2.15, value: (row) => textField(row, "reason") || "-" }
  ];
}

function summaryMetrics(summary: unknown): Metric[] {
  const record = asRecord(summary);
  const definitions = [
    ["totalPiutang", "Piutang (Estimasi/Belum Diakui)", true, COLORS.warning],
    ["totalPaid", "Sudah Dibayar", true, COLORS.success],
    ["totalRevenue", "Omzet Diakui", true, COLORS.blue],
    ["totalProfit", "Laba HL Diakui", true, COLORS.navy],
    ["totalRevenueLm", "Omzet LM", true, COLORS.blue],
    ["totalRevenueBr", "Omzet BR", true, COLORS.blue],
    ["totalBonusCost", "Biaya Bonus", true, COLORS.danger],
    ["negativeProfitTransactions", "Transaksi Laba Negatif", false, COLORS.danger],
    ["totalBon", "Jumlah Bon", false, COLORS.navy],
    ["bonusAvailable", "Bonus Tersedia", false, COLORS.success],
    ["voidBonCount", "Bon Void", false, COLORS.danger]
  ] as const;

  return definitions
    .filter(([key]) => record[key] !== undefined)
    .slice(0, 8)
    .map(([key, label, currency, tone]) => ({
      label,
      value: currency ? formatMoney(record[key]) : numberText(record[key]),
      tone
    }));
}

function filterLabels(filters?: ReportFilters) {
  if (!filters) return [];
  const labels: string[] = [];
  if (filters.month && filters.year) labels.push(`Periode: ${monthName(filters.month)} ${filters.year}`);
  if (filters.productType) labels.push(`Kategori: ${filters.productType}`);
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
  const labels: Record<string, string> = {
    EARNED: "Diperoleh",
    USED: "Digunakan",
    REVERSED: "Dikembalikan",
    ADJUSTMENT: "Penyesuaian"
  };
  return labels[value] ?? value ?? "-";
}

function statusLabel(value: string) {
  const labels: Record<string, string> = { PIUTANG: "Piutang", LUNAS: "Lunas", VOID: "Void", BONUS: "Bonus" };
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
  return Math.round(moneyNumber(value)).toLocaleString("id-ID");
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = value instanceof Date
    ? value
    : typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : new Date(Number.NaN);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(date);
}

function monthName(month: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, month - 1, 1)));
}

function field(value: unknown, key: string): unknown {
  return asRecord(value)[key];
}

function textField(value: unknown, key: string) {
  const result = field(value, key);
  if (result === null || result === undefined) return "";
  if (typeof result === "string") return result;
  if (typeof result === "number" || typeof result === "bigint" || typeof result === "boolean") {
    return result.toString();
  }
  if (result instanceof Date) return result.toISOString();
  return "";
}

function nestedText(value: unknown, parent: string, key: string) {
  return textField(field(value, parent), key) || "-";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function textAt(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions & { font?: string; fontSize?: number; color?: string } = {}
) {
  const previousX = doc.x;
  const previousY = doc.y;
  const { font, fontSize, color, ...textOptions } = options;
  if (font) doc.font(font);
  if (fontSize) doc.fontSize(fontSize);
  if (color) doc.fillColor(color);
  doc.text(value, x, y, { ...textOptions, lineBreak: false });
  doc.x = previousX;
  doc.y = previousY;
}

function wrappedTextAt(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions & { font?: string; fontSize?: number; color?: string } = {}
) {
  const previousX = doc.x;
  const previousY = doc.y;
  const { font, fontSize, color, ...textOptions } = options;
  if (font) doc.font(font);
  if (fontSize) doc.fontSize(fontSize);
  if (color) doc.fillColor(color);
  doc.text(value, x, y, textOptions);
  doc.x = previousX;
  doc.y = previousY;
}

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function pageBottom(doc: PDFKit.PDFDocument) {
  return doc.page.height - FOOTER_HEIGHT - 16;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > pageBottom(doc)) doc.addPage();
}
