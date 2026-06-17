import PDFDocument from "pdfkit";

export type PdfValue = string | number;
export type PdfReport = {
  title: string;
  period: string;
  summary?: Record<string, PdfValue>;
  rows: Array<Record<string, PdfValue>>;
};

export function renderPdf(report: PdfReport) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(report.title, { align: "center" });
    doc.fontSize(9).text(`Periode: ${report.period}`, { align: "center" });
    doc.text(`Dibuat: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`, { align: "center" });
    doc.moveDown();

    if (report.summary) {
      doc.fontSize(11).text("Ringkasan", { underline: true });
      for (const [label, value] of Object.entries(report.summary)) {
        doc.fontSize(9).text(`${label}: ${formatValue(label, value)}`);
      }
      doc.moveDown();
    }

    if (report.rows.length === 0) {
      doc.fontSize(9).text("Tidak ada baris data untuk periode ini.");
    } else {
      drawTable(doc, report.rows);
    }
    doc.end();
  });
}

function drawTable(doc: PDFKit.PDFDocument, rows: Array<Record<string, PdfValue>>) {
  const columns = Object.keys(rows[0]);
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidth = width / columns.length;
  const rowHeight = 18;

  const header = () => {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(7);
    columns.forEach((column, index) => doc.text(column, startX + index * columnWidth, y, { width: columnWidth - 4, lineBreak: false }));
    doc.moveTo(startX, y + 11).lineTo(startX + width, y + 11).stroke();
    doc.y = y + rowHeight;
    doc.font("Helvetica");
  };

  header();
  for (const row of rows) {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      header();
    }
    const y = doc.y;
    columns.forEach((column, index) => {
      const text = formatValue(column, row[column]);
      doc.fontSize(7).text(text.length > 28 ? `${text.slice(0, 27)}...` : text, startX + index * columnWidth, y, { width: columnWidth - 4, lineBreak: false });
    });
    doc.y = y + rowHeight;
  }
}

function formatValue(label: string, value: PdfValue) {
  const money = /(piutang|pembayaran|omzet|laba|ongkir|tagihan|biaya|total dibayar)/i.test(label);
  if (typeof value === "number" && money) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  }
  return String(value);
}
