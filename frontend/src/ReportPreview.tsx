import { calculateBon, toDisplayDate, type AcceptanceBon } from "./acceptance-data";
import { AcceptancePdfPreviewDialog, PdfMetric } from "./AcceptancePdfPreviewDialog";
import { formatCurrency } from "./data";

type ReportScope = "overall" | "LM" | "BR";

type ReportPreviewProps = {
  open: boolean;
  periodLabel: string;
  customerName: string;
  scope: ReportScope;
  rows: AcceptanceBon[];
  onClose: () => void;
  onPrint: () => void;
};

export function ReportPreview({ open, periodLabel, customerName, scope, rows, onClose, onPrint }: ReportPreviewProps) {
  const scopeLabel = scope === "overall" ? "Keseluruhan Produk" : `Produk ${scope}`;
  const reportTitle = customerName === "Semua pelanggan"
    ? scope === "overall"
      ? "Rekap Penjualan Keseluruhan"
      : `Rekap Penjualan Produk ${scope}`
    : scope === "overall"
      ? `Rekap Penjualan ${customerName}`
      : `Rekap Produk ${scope} · ${customerName}`;

  const reportRows = rows.map((bon) => {
    const totals = calculateBon(bon);
    const scopedLines = scope === "overall"
      ? totals.lineDetails
      : totals.lineDetails.filter((line) => line.product.type === scope);
    const omzet = scopedLines.reduce((sum, line) => sum + line.lineOmzet, 0);
    const profit = scopedLines.reduce((sum, line) => sum + line.lineProfit, 0);
    const bonusCost = scopedLines.reduce((sum, line) => sum + line.lineBonusCost, 0);
    const shipping = scope === "overall" ? bon.shipping : 0;
    const amount = bon.isBonus ? 0 : omzet + shipping;

    return { bon, totals, omzet, profit, bonusCost, shipping, amount };
  });

  const normalRows = reportRows.filter(({ bon }) => !bon.isBonus && bon.status !== "Void");
  const paidRows = normalRows.filter(({ bon }) => bon.status === "Lunas");
  const unpaidRows = normalRows.filter(({ bon }) => bon.status === "Piutang");
  const bonusRows = reportRows.filter(({ bon }) => bon.isBonus);
  const totalOmzet = paidRows.reduce((sum, row) => sum + row.omzet, 0);
  const totalProfit = paidRows.reduce((sum, row) => sum + row.profit, 0);
  const totalPaid = paidRows.reduce((sum, row) => sum + row.amount, 0);
  const totalOutstanding = unpaidRows.reduce((sum, row) => sum + row.amount, 0);
  const bonusCost = bonusRows.reduce((sum, row) => sum + row.bonusCost, 0);
  const subtitle = `${customerName} · ${periodLabel} · ${scopeLabel}`;

  const printWithDocumentTitle = () => {
    const previousTitle = document.title;
    document.title = `${reportTitle} - ${periodLabel}`;
    onPrint();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 600);
  };

  return (
    <AcceptancePdfPreviewDialog open={open} title={reportTitle} subtitle={subtitle} onClose={onClose} onPrint={printWithDocumentTitle}>
      <section className="acceptance-paper-title report-paper-title">
        <span className="eyebrow">Laporan cash basis</span>
        <h2>{reportTitle}</h2>
        <p>Periode {periodLabel}</p>
      </section>

      <dl className="report-paper-meta">
        <div><dt>Pelanggan</dt><dd>{customerName}</dd></div>
        <div><dt>Periode</dt><dd>{periodLabel}</dd></div>
        <div><dt>Cakupan</dt><dd>{scopeLabel}</dd></div>
        <div><dt>Jumlah transaksi</dt><dd>{rows.length} Bon</dd></div>
      </dl>

      <div className="acceptance-pdf-metric-grid">
        <PdfMetric label={`Omzet Lunas${scope === "overall" ? "" : ` ${scope}`}`} value={formatCurrency(totalOmzet)} />
        <PdfMetric label={`Laba HL${scope === "overall" ? "" : ` ${scope}`}`} value={formatCurrency(totalProfit)} />
        <PdfMetric label={scope === "overall" ? "Sudah Dibayar" : "Nilai Lunas Cakupan"} value={formatCurrency(totalPaid)} helper={scope === "overall" ? "Termasuk ongkir" : "Ongkir tidak dialokasikan"} />
        <PdfMetric label={scope === "overall" ? "Piutang" : "Piutang Cakupan"} value={formatCurrency(totalOutstanding)} helper={scope === "overall" ? "Termasuk ongkir" : "Ongkir tidak dialokasikan"} />
        <PdfMetric label="Biaya Bonus" value={formatCurrency(bonusCost)} helper={scope === "overall" ? "Tidak mengurangi laba" : `Khusus produk ${scope}`} />
      </div>

      <div className="report-paper-note">
        {scope === "overall"
          ? "Omzet dan laba hanya diakui dari Bon Lunas. Ongkir masuk ke nilai pembayaran, tetapi tidak masuk omzet maupun laba."
          : `Laporan ini hanya menghitung baris produk ${scope}. Ongkir tidak dialokasikan ke cakupan produk dan tidak dimasukkan ke nilai ${scope}.`}
      </div>

      <table className="acceptance-paper-table report-paper-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Nomor Bon</th>
            {customerName === "Semua pelanggan" && <th>Pelanggan</th>}
            <th>Status</th>
            <th>Omzet{scope === "overall" ? "" : ` ${scope}`}</th>
            {scope === "overall" && <th>Ongkir</th>}
            <th>{scope === "overall" ? "Total" : `Nilai ${scope}`}</th>
            <th>{scope === "overall" ? "Laba/Biaya" : `Laba/Biaya ${scope}`}</th>
          </tr>
        </thead>
        <tbody>
          {reportRows.length === 0 ? (
            <tr><td colSpan={customerName === "Semua pelanggan" ? (scope === "overall" ? 8 : 7) : (scope === "overall" ? 7 : 6)} className="report-paper-empty">Tidak ada transaksi sesuai filter yang dipilih.</td></tr>
          ) : reportRows.map(({ bon, totals, omzet, profit, bonusCost: rowBonusCost, shipping, amount }) => (
            <tr key={bon.number}>
              <td>{toDisplayDate(bon.date)}</td>
              <td>{bon.number}</td>
              {customerName === "Semua pelanggan" && <td>{totals.customer.name}</td>}
              <td>{bon.status}</td>
              <td>{formatCurrency(omzet)}</td>
              {scope === "overall" && <td>{formatCurrency(shipping)}</td>}
              <td>{formatCurrency(amount)}</td>
              <td>{bon.isBonus ? `Biaya ${formatCurrency(rowBonusCost)}` : formatCurrency(profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AcceptancePdfPreviewDialog>
  );
}
