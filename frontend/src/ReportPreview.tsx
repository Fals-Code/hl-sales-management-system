import { calculateBon, toDisplayDate, type AcceptanceBon } from "./acceptance-data";
import { AcceptancePdfPreviewDialog, PdfMetric } from "./AcceptancePdfPreviewDialog";
import { formatCurrency } from "./data";

export function ReportPreview({ open, periodLabel, rows, onClose, onPrint }: { open: boolean; periodLabel: string; rows: AcceptanceBon[]; onClose: () => void; onPrint: () => void }) {
  const normalRows = rows.filter((bon) => !bon.isBonus && bon.status !== "Void");
  const paidRows = normalRows.filter((bon) => bon.status === "Lunas");
  const unpaidRows = normalRows.filter((bon) => bon.status === "Piutang");
  const bonusRows = rows.filter((bon) => bon.isBonus);
  const totalOmzet = paidRows.reduce((sum, bon) => sum + calculateBon(bon).omzet, 0);
  const totalProfit = paidRows.reduce((sum, bon) => sum + calculateBon(bon).profit, 0);
  const totalPaid = paidRows.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const totalOutstanding = unpaidRows.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const bonusCost = bonusRows.reduce((sum, bon) => sum + calculateBon(bon).bonusCost, 0);

  return (
    <AcceptancePdfPreviewDialog open={open} title="Rekap HL" subtitle={periodLabel} onClose={onClose} onPrint={onPrint}>
      <section className="acceptance-paper-title"><span className="eyebrow">Laporan cash basis</span><h2>Rekap Keseluruhan</h2><p>{periodLabel} · IDR (Rp) · Tanpa PPN</p></section>
      <div className="acceptance-pdf-metric-grid"><PdfMetric label="Omzet Lunas" value={formatCurrency(totalOmzet)} /><PdfMetric label="Laba HL" value={formatCurrency(totalProfit)} /><PdfMetric label="Sudah Dibayar" value={formatCurrency(totalPaid)} /><PdfMetric label="Piutang" value={formatCurrency(totalOutstanding)} /><PdfMetric label="Biaya Bonus" value={formatCurrency(bonusCost)} helper="Tidak mengurangi laba" /></div>
      <table className="acceptance-paper-table"><thead><tr><th>Tanggal</th><th>Nomor Bon</th><th>Status</th><th>Omzet</th><th>Total</th><th>Laba</th></tr></thead><tbody>{rows.map((bon) => { const totals = calculateBon(bon); return <tr key={bon.number}><td>{toDisplayDate(bon.date)}</td><td>{bon.number}</td><td>{bon.status}</td><td>{formatCurrency(totals.omzet)}</td><td>{formatCurrency(totals.amountOwed)}</td><td>{formatCurrency(totals.profit)}</td></tr>; })}</tbody></table>
    </AcceptancePdfPreviewDialog>
  );
}
