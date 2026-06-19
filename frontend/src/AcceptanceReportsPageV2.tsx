import {
  AlertTriangle,
  BarChart3,
  Download,
  FileText,
  ReceiptText,
  SlidersHorizontal,
  WalletCards
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  acceptanceBons,
  calculateBon,
  customerProfiles,
  toDisplayDate,
  type AcceptanceBon
} from "./acceptance-data";
import { AcceptancePagination } from "./AcceptancePagination";
import { formatCurrency } from "./data";
import { ReportPreview } from "./ReportPreview";

type ReportScope = "overall" | "LM" | "BR";

type ReportRow = {
  bon: AcceptanceBon;
  customerName: string;
  omzet: number;
  profit: number;
  bonusCost: number;
  shipping: number;
  amount: number;
  negativeProfit: boolean;
};

export function AcceptanceReportsPageV2() {
  const [month, setMonth] = useState("6");
  const [year, setYear] = useState("2026");
  const [customerCode, setCustomerCode] = useState("all");
  const [scope, setScope] = useState<ReportScope>("overall");
  const [page, setPage] = useState(1);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const pageSize = 5;
  const monthKey = `${year}-${month.padStart(2, "0")}`;
  const periodLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${monthKey}-01T00:00:00`));
  const selectedCustomer = customerCode === "all" ? null : customerProfiles.find((customer) => customer.code === customerCode) ?? null;
  const customerName = selectedCustomer?.name ?? "Semua pelanggan";
  const scopeLabel = scope === "overall" ? "Keseluruhan Produk" : `Produk ${scope}`;

  const filteredBons = useMemo(() => acceptanceBons.filter((bon) => {
    if (!bon.date.startsWith(monthKey)) return false;
    if (customerCode !== "all" && bon.customerCode !== customerCode) return false;
    if (scope === "overall") return true;
    return calculateBon(bon).lineDetails.some((line) => line.product.type === scope);
  }), [monthKey, customerCode, scope]);

  const reportRows = useMemo<ReportRow[]>(() => filteredBons.map((bon) => {
    const totals = calculateBon(bon);
    const scopedLines = scope === "overall"
      ? totals.lineDetails
      : totals.lineDetails.filter((line) => line.product.type === scope);
    const omzet = scopedLines.reduce((sum, line) => sum + line.lineOmzet, 0);
    const profit = scopedLines.reduce((sum, line) => sum + line.lineProfit, 0);
    const bonusCost = scopedLines.reduce((sum, line) => sum + line.lineBonusCost, 0);
    const shipping = scope === "overall" ? bon.shipping : 0;
    const amount = bon.isBonus ? 0 : omzet + shipping;

    return {
      bon,
      customerName: totals.customer.name,
      omzet,
      profit,
      bonusCost,
      shipping,
      amount,
      negativeProfit: !bon.isBonus && profit < 0
    };
  }), [filteredBons, scope]);

  const normalRows = reportRows.filter(({ bon }) => !bon.isBonus && bon.status !== "Void");
  const paidRows = normalRows.filter(({ bon }) => bon.status === "Lunas");
  const unpaidRows = normalRows.filter(({ bon }) => bon.status === "Piutang");
  const bonusRows = reportRows.filter(({ bon }) => bon.isBonus);
  const negativeRows = normalRows.filter((row) => row.negativeProfit);
  const totalOmzet = paidRows.reduce((sum, row) => sum + row.omzet, 0);
  const totalProfit = paidRows.reduce((sum, row) => sum + row.profit, 0);
  const totalPaid = paidRows.reduce((sum, row) => sum + row.amount, 0);
  const totalOutstanding = unpaidRows.reduce((sum, row) => sum + row.amount, 0);
  const omzetLm = paidRows.reduce((sum, row) => {
    const lines = calculateBon(row.bon).lineDetails.filter((line) => line.product.type === "LM");
    return sum + lines.reduce((lineSum, line) => lineSum + line.lineOmzet, 0);
  }, 0);
  const omzetBr = paidRows.reduce((sum, row) => {
    const lines = calculateBon(row.bon).lineDetails.filter((line) => line.product.type === "BR");
    return sum + lines.reduce((lineSum, line) => lineSum + line.lineOmzet, 0);
  }, 0);
  const bonusCost = bonusRows.reduce((sum, row) => sum + row.bonusCost, 0);
  const totalPages = Math.max(1, Math.ceil(reportRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = reportRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const updateFilter = (callback: () => void) => {
    callback();
    setPage(1);
  };

  const preparePdf = () => {
    setPreparingPdf(true);
    window.setTimeout(() => {
      setPreparingPdf(false);
      setPdfOpen(true);
    }, 350);
  };

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><BarChart3 size={30} /></span>
        <div><span className="eyebrow">Cash basis</span><h2>Laporan</h2><p>Omzet dan laba hanya berasal dari Bon Lunas. Isi preview mengikuti filter yang sedang dipilih.</p></div>
        <button className="button button--primary" type="button" disabled={preparingPdf} onClick={preparePdf}><Download size={20} />{preparingPdf ? "Menyiapkan Preview..." : "Preview PDF"}</button>
      </header>

      <section className="acceptance-filter-card report-acceptance-filter">
        <div><span className="eyebrow">Filter rekap</span><h3>{customerName} · {periodLabel} · {scopeLabel}</h3></div>
        <label className="field"><span>Bulan</span><select value={month} onChange={(event) => updateFilter(() => setMonth(event.target.value))}><option value="6">Juni</option><option value="5">Mei</option><option value="4">April</option></select></label>
        <label className="field"><span>Tahun</span><select value={year} onChange={(event) => updateFilter(() => setYear(event.target.value))}><option>2026</option><option>2025</option></select></label>
        <label className="field"><span>Pelanggan</span><select value={customerCode} onChange={(event) => updateFilter(() => setCustomerCode(event.target.value))}><option value="all">Semua pelanggan</option>{customerProfiles.filter((customer) => customer.active).map((customer) => <option value={customer.code} key={customer.code}>{customer.name}</option>)}</select></label>
        <label className="field"><span>Cakupan produk</span><select value={scope} onChange={(event) => updateFilter(() => setScope(event.target.value as ReportScope))}><option value="overall">Keseluruhan</option><option value="LM">LM</option><option value="BR">BR</option></select></label>
      </section>

      <div className="acceptance-stat-grid">
        <Stat label={`Omzet Lunas${scope === "overall" ? "" : ` ${scope}`}`} value={formatCurrency(totalOmzet)} helper="Ongkir tidak termasuk" icon={<BarChart3 size={23} />} />
        <Stat label={`Laba HL${scope === "overall" ? "" : ` ${scope}`}`} value={formatCurrency(totalProfit)} helper="Bonus dan ongkir tidak memengaruhi" icon={<BarChart3 size={23} />} />
        <Stat label={scope === "overall" ? "Sudah Dibayar" : "Nilai Lunas Cakupan"} value={formatCurrency(totalPaid)} helper={scope === "overall" ? "Termasuk ongkir" : "Ongkir tidak dialokasikan"} icon={<ReceiptText size={23} />} />
        <Stat label={scope === "overall" ? "Piutang Aktif" : "Piutang Cakupan"} value={formatCurrency(totalOutstanding)} helper={scope === "overall" ? "Termasuk ongkir" : "Ongkir tidak dialokasikan"} icon={<WalletCards size={23} />} />
      </div>

      <div className="acceptance-detail-layout">
        <section className="acceptance-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">Breakdown produk</span><h3>Omzet LM dan BR</h3></div><SlidersHorizontal size={24} /></div>
          <div className="report-breakdown"><div><span>LM</span><strong>{formatCurrency(omzetLm)}</strong><small>{totalOmzet === 0 ? 0 : Math.round(omzetLm / totalOmzet * 100)}% dari omzet filter</small></div><div><span>BR</span><strong>{formatCurrency(omzetBr)}</strong><small>{totalOmzet === 0 ? 0 : Math.round(omzetBr / totalOmzet * 100)}% dari omzet filter</small></div><div><span>Total cakupan</span><strong>{formatCurrency(totalOmzet)}</strong><small>{scopeLabel}</small></div></div>
        </section>
        <aside className="acceptance-card report-audit-summary"><div className="acceptance-card-heading"><div><span className="eyebrow">Audit transaksi</span><h3>Bonus dan Transaksi Rugi</h3></div><AlertTriangle size={24} /></div><dl><div><dt>Bonus Bon</dt><dd>{bonusRows.length} Bon</dd></div><div><dt>Unit bonus</dt><dd>{bonusRows.reduce((sum, row) => sum + row.bon.lines.reduce((lineSum, line) => lineSum + line.quantity, 0), 0)} unit</dd></div><div><dt>Biaya bonus/promosi</dt><dd>{formatCurrency(bonusCost)}</dd></div><div><dt>Transaksi laba negatif</dt><dd>{negativeRows.length} Bon</dd></div></dl></aside>
      </div>

      <section className="acceptance-card">
        <div className="acceptance-card-heading"><div><span className="eyebrow">Daftar transaksi</span><h3>Hasil Rekap {customerName} · {periodLabel} · {scopeLabel}</h3></div><FileText size={24} /></div>
        {reportRows.length === 0 ? <div className="acceptance-inline-empty"><FileText size={30} /><span>Tidak ada data untuk pelanggan, periode, dan cakupan yang dipilih.</span></div> : <div className="acceptance-report-wrap"><table className="acceptance-report-table"><thead><tr><th>Tanggal</th><th>Nomor Bon</th>{customerCode === "all" && <th>Pelanggan</th>}<th>Status</th><th>Omzet{scope === "overall" ? "" : ` ${scope}`}</th>{scope === "overall" && <th>Ongkir</th>}<th>{scope === "overall" ? "Total" : `Nilai ${scope}`}</th><th>Laba/Biaya</th></tr></thead><tbody>{pagedRows.map((row) => <tr key={row.bon.number} className={row.negativeProfit ? "is-negative-profit" : ""}><td>{toDisplayDate(row.bon.date)}</td><td><strong>{row.bon.number}</strong>{row.negativeProfit && <span className="mini-warning-badge">Rugi</span>}</td>{customerCode === "all" && <td>{row.customerName}</td>}<td>{row.bon.status}</td><td>{formatCurrency(row.omzet)}</td>{scope === "overall" && <td>{formatCurrency(row.shipping)}</td>}<td>{formatCurrency(row.amount)}</td><td>{row.bon.isBonus ? `Biaya ${formatCurrency(row.bonusCost)}` : formatCurrency(row.profit)}</td></tr>)}</tbody></table><div className="acceptance-report-mobile">{pagedRows.map((row) => <article key={row.bon.number} className={row.negativeProfit ? "is-negative-profit" : ""}><header><span><strong>{row.bon.number}</strong><small>{row.customerName}</small></span><span className="mobile-report-badges"><strong>{row.bon.status}</strong>{row.negativeProfit && <span className="mini-warning-badge">Rugi</span>}</span></header><dl><div><dt>Tanggal</dt><dd>{toDisplayDate(row.bon.date)}</dd></div><div><dt>Omzet {scope === "overall" ? "" : scope}</dt><dd>{formatCurrency(row.omzet)}</dd></div>{scope === "overall" && <div><dt>Ongkir</dt><dd>{formatCurrency(row.shipping)}</dd></div>}<div><dt>{scope === "overall" ? "Total" : `Nilai ${scope}`}</dt><dd>{formatCurrency(row.amount)}</dd></div><div><dt>{row.bon.isBonus ? "Biaya Bonus" : "Laba"}</dt><dd>{formatCurrency(row.bon.isBonus ? row.bonusCost : row.profit)}</dd></div></dl></article>)}</div><AcceptancePagination page={safePage} totalPages={totalPages} totalItems={reportRows.length} pageSize={pageSize} onPageChange={setPage} /></div>}
      </section>

      <ReportPreview open={pdfOpen} periodLabel={periodLabel} customerName={customerName} scope={scope} rows={filteredBons} onClose={() => setPdfOpen(false)} onPrint={() => window.print()} />
    </section>
  );
}

function Stat({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) {
  return <article className="acceptance-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{helper}</p></div></article>;
}
