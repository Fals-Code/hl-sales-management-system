import { calculateBon, toDisplayDate, type AcceptanceBon } from "./acceptance-data";
import { AcceptancePdfPreviewDialog, PdfMetric } from "./AcceptancePdfPreviewDialog";
import { formatCurrency } from "./data";

type ReportScope = "overall" | "LM" | "BR";

type ReportPreviewProps = {
  open: boolean;
  periodLabel: string;
  customerName?: string;
  scope?: ReportScope;
  rows: AcceptanceBon[];
  onClose: () => void;
  onPrint: () => void;
};

export function ReportPreview({ open, periodLabel, customerName = "Semua pelanggan", scope = "overall", rows, onClose, onPrint }: ReportPreviewProps) {
  const scopeLabel = scope === "overall" ? "Keseluruhan Produk" : `Produk ${scope}`;
  const showCustomer = customerName === "Semua pelanggan";
  const showShipping = scope === "overall";
  const reportTitle = showCustomer
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
    const shipping = showShipping ? bon.shipping : 0;
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
  const tableClassName = [
    "acceptance-paper-table",
    "report-paper-table",
    showCustomer ? "report-paper-table--with-customer" : "report-paper-table--without-customer",
    showShipping ? "report-paper-table--with-shipping" : "report-paper-table--without-shipping"
  ].join(" ");

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

      <div className="acceptance-pdf-metric-grid report-pdf-metric-grid">
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

      <table className={tableClassName}>
        <colgroup>
          <col className="report-col-date" />
          <col className="report-col-bon" />
          {showCustomer && <col className="report-col-customer" />}
          <col className="report-col-status" />
          <col className="report-col-omzet" />
          {showShipping && <col className="report-col-shipping" />}
          <col className="report-col-total" />
          <col className="report-col-result" />
        </colgroup>
        <thead>
          <tr>
            <th className="report-cell-date">Tanggal</th>
            <th className="report-cell-bon">Nomor Bon</th>
            {showCustomer && <th className="report-cell-customer">Pelanggan</th>}
            <th className="report-cell-status">Status</th>
            <th className="report-cell-money">Omzet{scope === "overall" ? "" : ` ${scope}`}</th>
            {showShipping && <th className="report-cell-money">Ongkir</th>}
            <th className="report-cell-money">{scope === "overall" ? "Total" : `Nilai ${scope}`}</th>
            <th className="report-cell-money">{scope === "overall" ? "Laba/Biaya" : `Laba/Biaya ${scope}`}</th>
          </tr>
        </thead>
        <tbody>
          {reportRows.length === 0 ? (
            <tr><td colSpan={showCustomer ? (showShipping ? 8 : 7) : (showShipping ? 7 : 6)} className="report-paper-empty">Tidak ada transaksi sesuai filter yang dipilih.</td></tr>
          ) : reportRows.map(({ bon, totals, omzet, profit, bonusCost: rowBonusCost, shipping, amount }) => (
            <tr key={bon.number}>
              <td className="report-cell-date">{toDisplayDate(bon.date)}</td>
              <td className="report-cell-bon">{bon.number}</td>
              {showCustomer && <td className="report-cell-customer">{totals.customer.name}</td>}
              <td className="report-cell-status">{bon.status}</td>
              <td className="report-cell-money">{formatCurrency(omzet)}</td>
              {showShipping && <td className="report-cell-money">{formatCurrency(shipping)}</td>}
              <td className="report-cell-money">{formatCurrency(amount)}</td>
              <td className="report-cell-money report-cell-result">{bon.isBonus ? `Biaya ${formatCurrency(rowBonusCost)}` : formatCurrency(profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AcceptancePdfPreviewDialog>
  );
}
