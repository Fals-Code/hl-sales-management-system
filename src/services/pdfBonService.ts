import PDFDocument from "pdfkit";
import { toSafeMoneyNumber } from "../domain/money";

export type BonPdfData = {
  bonNumber: string;
  bonDate: Date | string;
  status: string;
  settledAt?: Date | string | null;
  shippingCost: bigint | number | string;
  totalAfterDiscount: bigint | number | string;
  totalAmount: bigint | number | string;
  description?: string | null;
  customer: { name: string; code?: string | null; phone?: string | null; address?: string | null };
  items: Array<{ productNameSnapshot: string; productTypeSnapshot: string; finalPrice: bigint | number | string; quantity: number; subtotal: bigint | number | string; isBonus: boolean }>;
};

const C = { navy: "#123B5D", blue: "#245E89", pale: "#EEF5F9", border: "#D7E1E8", text: "#1F2933", muted: "#647484", white: "#FFFFFF" };
const MARGIN = 42;

export function renderBonPdf(data: BonPdfData) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true, info: { Title: data.bonNumber, Author: "HL Sales Management", Subject: `Bon untuk ${data.customer.name}`, Creator: "HL Sales Management App" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const bonus = data.items.length > 0 && data.items.every((item) => item.isBonus);
    drawHeader(doc, data, bonus);
    drawMeta(doc, data);
    drawItems(doc, data);
    drawTotals(doc, data, bonus);
    drawNote(doc, data.description);
    drawFooters(doc, data.bonNumber);
    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, data: BonPdfData, bonus: boolean) {
  const x = doc.page.margins.left;
  const w = contentWidth(doc);
  const y = doc.y;
  doc.roundedRect(x, y, w, 82, 11).fill(C.navy);
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(22).text("HL", x + 18, y + 15);
  doc.font("Helvetica").fontSize(8).fillColor("#DDEAF2").text("SALES & RECEIVABLES", x + 18, y + 44, { characterSpacing: 0.45 });
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(16).text(bonus ? "BONUS BON" : "BON PENJUALAN", x + 112, y + 17, { width: w - 250, align: "center" });
  doc.fontSize(11).text(data.bonNumber, x + 112, y + 43, { width: w - 250, align: "center" });
  doc.font("Helvetica").fontSize(8).fillColor("#DDEAF2").text(formatDateTime(new Date()), x + w - 150, y + 18, { width: 132, align: "right" });
  const label = bonus ? "Bonus" : statusLabel(data.status);
  doc.roundedRect(x + w - 100, y + 49, 82, 21, 10).fill(label === "Lunas" ? "#EDF8F3" : label === "Void" ? "#FFF0EE" : C.pale);
  doc.fillColor(label === "Lunas" ? "#237A57" : label === "Void" ? "#A33B32" : C.blue).font("Helvetica-Bold").fontSize(8).text(label, x + w - 100, y + 56, { width: 82, align: "center" });
  doc.y = y + 98;
}

function drawMeta(doc: PDFKit.PDFDocument, data: BonPdfData) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const w = contentWidth(doc);
  const gap = 12;
  const leftW = w * 0.58;
  const details = [data.customer.code, data.customer.phone, data.customer.address].filter(Boolean).join(" | ") || "-";
  infoCard(doc, x, y, leftW, "PELANGGAN", data.customer.name, details);
  infoCard(doc, x + leftW + gap, y, w - leftW - gap, "INFORMASI BON", `Tanggal Bon: ${formatDate(data.bonDate)}`, `Tanggal Pelunasan: ${data.settledAt ? formatDate(data.settledAt) : "-"}`);
  doc.y = y + 96;
}

function infoCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, eyebrow: string, title: string, detail: string) {
  doc.roundedRect(x, y, w, 78, 8).lineWidth(0.7).fillAndStroke(C.white, C.border);
  doc.fillColor(C.blue).font("Helvetica-Bold").fontSize(7.5).text(eyebrow, x + 13, y + 12, { characterSpacing: 0.4 });
  doc.fillColor(C.text).fontSize(11).text(title, x + 13, y + 29, { width: w - 26, ellipsis: true });
  doc.fillColor(C.muted).font("Helvetica").fontSize(8).text(detail, x + 13, y + 49, { width: w - 26, lineGap: 2 });
}

function drawItems(doc: PDFKit.PDFDocument, data: BonPdfData) {
  sectionTitle(doc, `Rincian Produk (${data.items.length})`);
  const x = doc.page.margins.left;
  const w = contentWidth(doc);
  const widths = [28, w - 286, 52, 42, 82, 82];
  const aligns = ["center", "left", "center", "right", "right", "right"] as const;
  const header = () => {
    if (doc.y + 28 > pageBottom(doc)) doc.addPage();
    const y = doc.y;
    doc.rect(x, y, w, 26).fill(C.navy);
    let colX = x;
    ["No", "Produk", "Tipe", "Qty", "Harga", "Subtotal"].forEach((label, index) => {
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7.4).text(label, colX + 5, y + 8.5, { width: widths[index] - 10, align: aligns[index] });
      colX += widths[index];
    });
    doc.y = y + 26;
  };
  header();
  data.items.forEach((item, index) => {
    const values = [String(index + 1), item.isBonus ? `${item.productNameSnapshot} (Bonus)` : item.productNameSnapshot, item.productTypeSnapshot || "-", String(item.quantity), money(item.isBonus ? 0 : item.finalPrice), money(item.isBonus ? 0 : item.subtotal)];
    const rowH = Math.max(30, doc.font("Helvetica").fontSize(8).heightOfString(values[1], { width: widths[1] - 10, lineGap: 1 }) + 13);
    if (doc.y + rowH > pageBottom(doc)) { doc.addPage(); continuation(doc, data.bonNumber); header(); }
    const y = doc.y;
    if (index % 2) doc.rect(x, y, w, rowH).fill("#F8FAFB");
    let colX = x;
    values.forEach((value, col) => {
      doc.fillColor(C.text).font(col === 1 ? "Helvetica-Bold" : "Helvetica").fontSize(8).text(value, colX + 5, y + 8, { width: widths[col] - 10, align: aligns[col], lineGap: 1 });
      if (col > 0) doc.moveTo(colX, y).lineTo(colX, y + rowH).lineWidth(0.35).strokeColor(C.border).stroke();
      colX += widths[col];
    });
    doc.moveTo(x, y + rowH).lineTo(x + w, y + rowH).lineWidth(0.45).strokeColor(C.border).stroke();
    doc.y = y + rowH;
  });
  doc.y += 16;
}

function drawTotals(doc: PDFKit.PDFDocument, data: BonPdfData, bonus: boolean) {
  if (doc.y + 115 > pageBottom(doc)) doc.addPage();
  const w = 260;
  const x = doc.page.width - doc.page.margins.right - w;
  const y = doc.y;
  doc.roundedRect(x, y, w, 104, 9).lineWidth(0.7).fillAndStroke(C.white, C.border);
  [["Subtotal Produk", money(bonus ? 0 : data.totalAfterDiscount)], ["Ongkir", money(bonus ? 0 : data.shippingCost)]].forEach(([label, value], index) => {
    doc.fillColor(C.muted).font("Helvetica").fontSize(8.5).text(label, x + 14, y + 14 + index * 25, { width: 120 });
    doc.fillColor(C.text).font("Helvetica-Bold").fontSize(9).text(value, x + 134, y + 14 + index * 25, { width: 112, align: "right" });
  });
  doc.roundedRect(x + 10, y + 65, w - 20, 30, 7).fill(C.pale);
  doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(9).text("TOTAL TAGIHAN", x + 20, y + 76, { width: 100 });
  doc.fontSize(12).text(money(bonus ? 0 : data.totalAmount), x + 116, y + 73, { width: 124, align: "right" });
  doc.y = y + 120;
}

function drawNote(doc: PDFKit.PDFDocument, description?: string | null) {
  const text = description?.trim();
  if (!text) return;
  if (doc.y + 64 > pageBottom(doc)) doc.addPage();
  const x = doc.page.margins.left;
  const y = doc.y;
  const w = contentWidth(doc);
  doc.roundedRect(x, y, w, 55, 8).fill(C.pale);
  doc.fillColor(C.blue).font("Helvetica-Bold").fontSize(7.5).text("CATATAN", x + 13, y + 11);
  doc.fillColor(C.text).font("Helvetica").fontSize(8.5).text(text, x + 13, y + 27, { width: w - 26, lineGap: 2 });
  doc.y = y + 65;
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(11).text(title);
  doc.moveDown(0.4);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).lineWidth(0.6).strokeColor(C.border).stroke();
  doc.moveDown(0.7);
}

function continuation(doc: PDFKit.PDFDocument, number: string) {
  const x = doc.page.margins.left;
  const w = contentWidth(doc);
  doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(9).text("HL SALES & RECEIVABLES", x, doc.y, { width: w / 2 });
  doc.fillColor(C.muted).font("Helvetica").fontSize(8).text(`${number} - lanjutan`, x + w / 2, doc.y, { width: w / 2, align: "right" });
  doc.moveDown(1);
}

function drawFooters(doc: PDFKit.PDFDocument, number: string) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const y = doc.page.height - doc.page.margins.bottom - 20;
    doc.moveTo(doc.page.margins.left, y - 8).lineTo(doc.page.width - doc.page.margins.right, y - 8).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.fillColor(C.muted).font("Helvetica").fontSize(7).text(`${number} | IDR (Rp) | Tanpa PPN`, doc.page.margins.left, y, { width: contentWidth(doc) * 0.65, lineBreak: false });
    doc.text(`Halaman ${index - range.start + 1} dari ${range.count}`, doc.page.margins.left + contentWidth(doc) * 0.65, y, { width: contentWidth(doc) * 0.35, align: "right", lineBreak: false });
  }
}

function statusLabel(value: string) { return ({ PIUTANG: "Piutang", LUNAS: "Lunas", VOID: "Void", BONUS: "Bonus" } as Record<string, string>)[value] ?? value ?? "-"; }
function moneyNumber(value: unknown) { if (typeof value === "bigint") return toSafeMoneyNumber(value, "bonPdfMoney"); if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value); return 0; }
function money(value: unknown) { return `Rp ${Math.round(moneyNumber(value)).toLocaleString("id-ID")}`; }
function formatDate(value: Date | string) { const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date); }
function formatDateTime(date: Date) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date); }
function contentWidth(doc: PDFKit.PDFDocument) { return doc.page.width - doc.page.margins.left - doc.page.margins.right; }
function pageBottom(doc: PDFKit.PDFDocument) { return doc.page.height - doc.page.margins.bottom - 30; }
