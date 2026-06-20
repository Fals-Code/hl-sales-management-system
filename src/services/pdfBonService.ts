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

const C = {
  navy: "#123B5D",
  navyDark: "#0B2942",
  blue: "#245E89",
  pale: "#EEF5F9",
  paleBlue: "#F7FAFC",
  border: "#D7E1E8",
  text: "#1F2933",
  muted: "#647484",
  success: "#237A57",
  warning: "#9A6818",
  danger: "#A33B32",
  white: "#FFFFFF"
};

const MARGIN = 38;
const FOOTER_HEIGHT = 50;

export function renderBonPdf(data: BonPdfData) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: data.bonNumber,
        Author: "HL Sales Management",
        Subject: `Bon untuk ${data.customer.name}`,
        Creator: "HL Sales Management App"
      }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const bonus = data.items.length > 0 && data.items.every((item) => item.isBonus);
    drawHeader(doc, data, bonus);
    drawCustomerAndMeta(doc, data, bonus);
    drawItems(doc, data);
    drawPaymentSummary(doc, data, bonus);
    drawNotesAndSignatures(doc, data, bonus);
    drawFooters(doc, data.bonNumber);
    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, data: BonPdfData, bonus: boolean) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);
  const height = 82;

  doc.roundedRect(x, y, width, height, 10).fill(C.navyDark);
  doc.roundedRect(x, y, 92, height, 10).fill(C.navy);

  textAt(doc, "HL", x + 18, y + 13, {
    width: 56,
    font: "Helvetica-Bold",
    fontSize: 23,
    color: C.white
  });
  textAt(doc, "SALES", x + 18, y + 45, {
    width: 56,
    font: "Helvetica-Bold",
    fontSize: 7,
    color: "#DDEAF2",
    characterSpacing: 0.8
  });

  textAt(doc, bonus ? "BON BONUS" : "BON PENJUALAN", x + 112, y + 14, {
    width: width - 300,
    font: "Helvetica-Bold",
    fontSize: 17,
    color: C.white
  });
  textAt(doc, data.bonNumber, x + 112, y + 39, {
    width: width - 300,
    font: "Helvetica-Bold",
    fontSize: 11,
    color: "#DDEAF2"
  });
  textAt(doc, "Bukti transaksi resmi", x + 112, y + 58, {
    width: width - 300,
    font: "Helvetica",
    fontSize: 7.5,
    color: "#BFD3E1"
  });

  const status = bonus ? "Bonus" : statusLabel(data.status);
  drawStatusPill(doc, x + width - 116, y + 16, 96, 23, status);
  textAt(doc, formatDate(data.bonDate), x + width - 160, y + 51, {
    width: 140,
    align: "right",
    font: "Helvetica-Bold",
    fontSize: 8.4,
    color: C.white
  });
  textAt(doc, "IDR (Rp) | Tanpa PPN", x + width - 160, y + 66, {
    width: 140,
    align: "right",
    font: "Helvetica",
    fontSize: 7,
    color: "#DDEAF2"
  });

  doc.y = y + height + 15;
}

function drawCustomerAndMeta(doc: PDFKit.PDFDocument, data: BonPdfData, bonus: boolean) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);
  const gap = 10;
  const customerWidth = width * 0.59;
  const metaWidth = width - customerWidth - gap;

  doc.roundedRect(x, y, customerWidth, 82, 8).lineWidth(0.6).fillAndStroke(C.white, C.border);
  textAt(doc, "DITERBITKAN UNTUK", x + 13, y + 11, {
    width: customerWidth - 26,
    font: "Helvetica-Bold",
    fontSize: 7,
    color: C.blue,
    characterSpacing: 0.5
  });
  textAt(doc, data.customer.name, x + 13, y + 29, {
    width: customerWidth - 26,
    font: "Helvetica-Bold",
    fontSize: 12,
    color: C.text
  });

  const customerDetails = [
    data.customer.code ? `Kode: ${data.customer.code}` : null,
    data.customer.phone ? `Telp: ${data.customer.phone}` : null,
    data.customer.address || null
  ].filter(Boolean).join(" | ") || "Data kontak belum tersedia";

  wrappedTextAt(doc, customerDetails, x + 13, y + 49, {
    width: customerWidth - 26,
    height: 25,
    font: "Helvetica",
    fontSize: 7.8,
    color: C.muted,
    lineGap: 2,
    ellipsis: true
  });

  const metaX = x + customerWidth + gap;
  doc.roundedRect(metaX, y, metaWidth, 82, 8).lineWidth(0.6).fillAndStroke(C.paleBlue, C.border);
  drawMetaRow(doc, metaX, y + 12, metaWidth, "Tanggal Bon", formatDate(data.bonDate));
  drawMetaRow(doc, metaX, y + 34, metaWidth, "Tanggal Lunas", data.settledAt ? formatDate(data.settledAt) : "-");
  drawMetaRow(doc, metaX, y + 56, metaWidth, "Jenis", bonus ? "Bonus" : "Penjualan");

  doc.y = y + 96;
}

function drawMetaRow(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string) {
  textAt(doc, label, x + 12, y, {
    width: width * 0.43,
    font: "Helvetica",
    fontSize: 7.4,
    color: C.muted
  });
  textAt(doc, value, x + width * 0.43, y, {
    width: width * 0.57 - 12,
    align: "right",
    font: "Helvetica-Bold",
    fontSize: 7.8,
    color: C.text
  });
}

function drawItems(doc: PDFKit.PDFDocument, data: BonPdfData) {
  sectionHeading(doc, "Rincian Produk", `${data.items.length.toLocaleString("id-ID")} item`);

  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const widths = [28, width - 280, 48, 38, 83, 83];
  const aligns = ["center", "left", "center", "right", "right", "right"] as const;

  const drawHeaderRow = () => {
    ensureSpace(doc, 27);
    const y = doc.y;
    doc.rect(x, y, width, 25).fill(C.navy);
    let columnX = x;

    ["No", "Produk", "Tipe", "Qty", "Harga", "Subtotal"].forEach((label, index) => {
      textAt(doc, label, columnX + 5, y + 8, {
        width: widths[index] - 10,
        align: aligns[index],
        font: "Helvetica-Bold",
        fontSize: 7,
        color: C.white
      });
      columnX += widths[index];
    });

    doc.y = y + 25;
  };

  drawHeaderRow();

  data.items.forEach((item, index) => {
    const isBonusItem = item.isBonus;
    const values = [
      String(index + 1),
      isBonusItem ? `${item.productNameSnapshot} (Bonus)` : item.productNameSnapshot,
      item.productTypeSnapshot || "-",
      String(item.quantity),
      money(isBonusItem ? 0 : item.finalPrice),
      money(isBonusItem ? 0 : item.subtotal)
    ];

    doc.font("Helvetica-Bold").fontSize(7.8);
    const productHeight = doc.heightOfString(values[1], { width: widths[1] - 10, lineGap: 1 });
    const rowHeight = Math.max(29, Math.min(50, productHeight + 13));

    if (doc.y + rowHeight > pageBottom(doc)) {
      doc.addPage();
      drawContinuationHeader(doc, data.bonNumber);
      drawHeaderRow();
    }

    const y = doc.y;
    if (index % 2 === 1) doc.rect(x, y, width, rowHeight).fill(C.paleBlue);

    let columnX = x;
    values.forEach((value, columnIndex) => {
      wrappedTextAt(doc, value, columnX + 5, y + 7, {
        width: widths[columnIndex] - 10,
        height: rowHeight - 10,
        align: aligns[columnIndex],
        font: columnIndex === 1 ? "Helvetica-Bold" : "Helvetica",
        fontSize: 7.8,
        color: C.text,
        lineGap: 1,
        ellipsis: true
      });

      if (columnIndex > 0) {
        doc.moveTo(columnX, y).lineTo(columnX, y + rowHeight).lineWidth(0.3).strokeColor(C.border).stroke();
      }
      columnX += widths[columnIndex];
    });

    doc.moveTo(x, y + rowHeight).lineTo(x + width, y + rowHeight).lineWidth(0.4).strokeColor(C.border).stroke();
    doc.y = y + rowHeight;
  });

  doc.y += 15;
}

function drawPaymentSummary(doc: PDFKit.PDFDocument, data: BonPdfData, bonus: boolean) {
  ensureSpace(doc, 132);

  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);
  const leftWidth = width - 250;
  const rightX = x + leftWidth + 12;
  const rightWidth = width - leftWidth - 12;
  const status = bonus ? "BONUS" : data.status;

  doc.roundedRect(x, y, leftWidth, 112, 8).fill(C.pale);
  textAt(doc, paymentTitle(status), x + 14, y + 13, {
    width: leftWidth - 28,
    font: "Helvetica-Bold",
    fontSize: 10,
    color: statusTone(status)
  });
  wrappedTextAt(doc, paymentMessage(data, bonus), x + 14, y + 34, {
    width: leftWidth - 28,
    height: 42,
    font: "Helvetica",
    fontSize: 8,
    color: C.text,
    lineGap: 2,
    ellipsis: true
  });
  textAt(doc, "Dokumen ini tidak menampilkan harga modal atau laba internal HL.", x + 14, y + 88, {
    width: leftWidth - 28,
    font: "Helvetica-Oblique",
    fontSize: 7,
    color: C.muted
  });

  doc.roundedRect(rightX, y, rightWidth, 112, 8).lineWidth(0.6).fillAndStroke(C.white, C.border);
  drawAmountRow(doc, rightX, y + 15, rightWidth, "Subtotal Produk", money(bonus ? 0 : data.totalAfterDiscount));
  drawAmountRow(doc, rightX, y + 40, rightWidth, "Ongkir", money(bonus ? 0 : data.shippingCost));
  doc.moveTo(rightX + 12, y + 65).lineTo(rightX + rightWidth - 12, y + 65).lineWidth(0.6).strokeColor(C.border).stroke();
  textAt(doc, "TOTAL TAGIHAN", rightX + 12, y + 78, {
    width: rightWidth * 0.48,
    font: "Helvetica-Bold",
    fontSize: 8,
    color: C.navy
  });
  textAt(doc, money(bonus ? 0 : data.totalAmount), rightX + rightWidth * 0.48, y + 75, {
    width: rightWidth * 0.52 - 12,
    align: "right",
    font: "Helvetica-Bold",
    fontSize: 12,
    color: C.navyDark
  });

  doc.y = y + 127;
}

function drawAmountRow(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string) {
  textAt(doc, label, x + 12, y, {
    width: width * 0.52,
    font: "Helvetica",
    fontSize: 8,
    color: C.muted
  });
  textAt(doc, value, x + width * 0.52, y, {
    width: width * 0.48 - 12,
    align: "right",
    font: "Helvetica-Bold",
    fontSize: 8.5,
    color: C.text
  });
}

function drawNotesAndSignatures(doc: PDFKit.PDFDocument, data: BonPdfData, bonus: boolean) {
  ensureSpace(doc, 118);

  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);
  const noteWidth = width * 0.56;
  const signatureWidth = width - noteWidth - 16;
  const note = data.description?.trim() || (bonus
    ? "Produk bonus diberikan tanpa menambah tagihan pelanggan."
    : "Simpan dokumen ini sebagai bukti transaksi.");

  textAt(doc, "CATATAN", x, y, {
    width: noteWidth,
    font: "Helvetica-Bold",
    fontSize: 7,
    color: C.blue,
    characterSpacing: 0.5
  });
  wrappedTextAt(doc, note, x, y + 18, {
    width: noteWidth,
    height: 42,
    font: "Helvetica",
    fontSize: 8,
    color: C.text,
    lineGap: 2,
    ellipsis: true
  });
  textAt(doc, `Dibuat otomatis pada ${formatDateTime(new Date())}`, x, y + 71, {
    width: noteWidth,
    font: "Helvetica",
    fontSize: 6.8,
    color: C.muted
  });

  const signatureX = x + noteWidth + 16;
  const columnWidth = (signatureWidth - 12) / 2;
  drawSignature(doc, signatureX, y, columnWidth, "Diterima oleh");
  drawSignature(doc, signatureX + columnWidth + 12, y, columnWidth, "HL");

  doc.y = y + 105;
}

function drawSignature(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string) {
  textAt(doc, label, x, y, {
    width,
    align: "center",
    font: "Helvetica",
    fontSize: 7.4,
    color: C.muted
  });
  doc.moveTo(x + 8, y + 63).lineTo(x + width - 8, y + 63).lineWidth(0.5).strokeColor(C.border).stroke();
  textAt(doc, "Nama / Tanda tangan", x, y + 70, {
    width,
    align: "center",
    font: "Helvetica",
    fontSize: 6.5,
    color: C.muted
  });
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string, helper: string) {
  ensureSpace(doc, 31);
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);

  textAt(doc, title, x, y, {
    width: width * 0.6,
    font: "Helvetica-Bold",
    fontSize: 10.5,
    color: C.navy
  });
  textAt(doc, helper, x + width * 0.6, y + 1, {
    width: width * 0.4,
    align: "right",
    font: "Helvetica",
    fontSize: 7.2,
    color: C.muted
  });
  doc.moveTo(x, y + 17).lineTo(x + width, y + 17).lineWidth(0.55).strokeColor(C.border).stroke();
  doc.y = y + 26;
}

function drawContinuationHeader(doc: PDFKit.PDFDocument, bonNumber: string) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);

  textAt(doc, "HL SALES", x, y, {
    width: width * 0.5,
    font: "Helvetica-Bold",
    fontSize: 8,
    color: C.navy
  });
  textAt(doc, `${bonNumber} - lanjutan`, x + width * 0.5, y, {
    width: width * 0.5,
    align: "right",
    font: "Helvetica",
    fontSize: 7.5,
    color: C.muted
  });
  doc.moveTo(x, y + 15).lineTo(x + width, y + 15).lineWidth(0.55).strokeColor(C.border).stroke();
  doc.y = y + 25;
}

function drawFooters(doc: PDFKit.PDFDocument, bonNumber: string) {
  const range = doc.bufferedPageRange();

  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    const x = doc.page.margins.left;
    const width = contentWidth(doc);
    const y = doc.page.height - doc.page.margins.bottom - 10;

    doc.moveTo(x, y - 8).lineTo(x + width, y - 8).lineWidth(0.45).strokeColor(C.border).stroke();
    textAt(doc, `${bonNumber} | HL Sales | IDR (Rp) | Tanpa PPN`, x, y, {
      width: width * 0.72,
      font: "Helvetica",
      fontSize: 6.8,
      color: C.muted
    });
    textAt(doc, `Halaman ${pageIndex - range.start + 1} dari ${range.count}`, x + width * 0.72, y, {
      width: width * 0.28,
      align: "right",
      font: "Helvetica-Bold",
      fontSize: 6.8,
      color: C.muted
    });
  }
}

function drawStatusPill(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, status: string) {
  const tone = status === "Lunas" ? C.success : status === "Void" ? C.danger : status === "Bonus" ? C.blue : C.warning;
  const background = status === "Lunas" ? "#EDF8F3" : status === "Void" ? "#FFF0EE" : status === "Bonus" ? "#EAF2F8" : "#FFF7E8";

  doc.roundedRect(x, y, width, height, height / 2).fill(background);
  textAt(doc, status.toUpperCase(), x, y + 8, {
    width,
    align: "center",
    font: "Helvetica-Bold",
    fontSize: 7.2,
    color: tone,
    characterSpacing: 0.4
  });
}

function paymentTitle(status: string) {
  if (status === "LUNAS") return "PEMBAYARAN LUNAS";
  if (status === "VOID") return "DOKUMEN DIBATALKAN";
  if (status === "BONUS") return "BONUS TANPA TAGIHAN";
  return "TAGIHAN BELUM LUNAS";
}

function paymentMessage(data: BonPdfData, bonus: boolean) {
  if (bonus) return "Bon ini berisi produk bonus dengan nilai tagihan Rp 0 dan tidak menambah piutang pelanggan.";
  if (data.status === "LUNAS") return `Pembayaran telah dicatat${data.settledAt ? ` pada ${formatDate(data.settledAt)}` : ""}. Dokumen ini dapat digunakan sebagai bukti pelunasan.`;
  if (data.status === "VOID") return "Bon telah dibatalkan melalui proses otorisasi. Dokumen disimpan untuk kebutuhan audit dan tidak dapat digunakan sebagai tagihan aktif.";
  return `Total tagihan sebesar ${money(data.totalAmount)} masih berstatus Piutang. Pelunasan akan dicatat pada tanggal pembayaran yang dikonfirmasi.`;
}

function statusTone(status: string) {
  if (status === "LUNAS") return C.success;
  if (status === "VOID") return C.danger;
  if (status === "BONUS") return C.blue;
  return C.warning;
}

function statusLabel(value: string) {
  return ({ PIUTANG: "Piutang", LUNAS: "Lunas", VOID: "Void", BONUS: "Bonus" } as Record<string, string>)[value] ?? value ?? "-";
}

function moneyNumber(value: unknown) {
  if (typeof value === "bigint") return toSafeMoneyNumber(value, "bonPdfMoney");
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function money(value: unknown) {
  return `Rp ${Math.round(moneyNumber(value)).toLocaleString("id-ID")}`;
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
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
