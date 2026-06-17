import { calculateBon, toDisplayDate, type AcceptanceBon, type CustomerProfile } from "./acceptance-data";
import { AcceptancePdfPreviewDialog, PdfMetric } from "./AcceptancePdfPreviewDialog";
import { formatCurrency } from "./data";

export function CustomerPdfPreview({ open, customer, monthLabel, bons, onClose, onPrint }: { open: boolean; customer: CustomerProfile; monthLabel: string; bons: AcceptanceBon[]; onClose: () => void; onPrint: () => void }) {
  const normalBons = bons.filter((bon) => !bon.isBonus && bon.status !== "Void");
  const paidBons = normalBons.filter((bon) => bon.status === "Lunas");
  const unpaidBons = normalBons.filter((bon) => bon.status === "Piutang");
  const paidOmzet = paidBons.reduce((sum, bon) => sum + calculateBon(bon).omzet, 0);
  const paidProfit = paidBons.reduce((sum, bon) => sum + calculateBon(bon).profit, 0);
  const paidTotal = paidBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const receivable = unpaidBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);

  return (
    <AcceptancePdfPreviewDialog open={open} title={`Rekap ${customer.name}`} subtitle={monthLabel} onClose={onClose} onPrint={onPrint}>
      <section className="acceptance-paper-title"><span className="eyebrow">Rekap pelanggan</span><h2>{customer.name}</h2><p>{customer.code} · {customer.address} · {customer.phone}</p></section>
      <div className="acceptance-pdf-metric-grid"><PdfMetric label="Total Piutang" value={formatCurrency(receivable)} /><PdfMetric label="Sudah Dibayar" value={formatCurrency(paidTotal)} /><PdfMetric label="Omzet Lunas" value={formatCurrency(paidOmzet)} /><PdfMetric label="Laba HL" value={formatCurrency(paidProfit)} /></div>
      <table className="acceptance-paper-table"><thead><tr><th>Tanggal</th><th>Nomor Bon</th><th>Status</th><th>Jumlah</th></tr></thead><tbody>{bons.map((bon) => <tr key={bon.number}><td>{toDisplayDate(bon.date)}</td><td>{bon.number}</td><td>{bon.status}</td><td>{formatCurrency(calculateBon(bon).amountOwed)}</td></tr>)}</tbody></table>
    </AcceptancePdfPreviewDialog>
  );
}
