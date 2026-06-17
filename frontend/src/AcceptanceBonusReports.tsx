import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  Gift,
  Info,
  ReceiptText,
  SlidersHorizontal,
  Users,
  WalletCards
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  acceptanceBons,
  bonusesAvailable,
  calculateBon,
  customerProfiles,
  getCustomer,
  toDisplayDate
} from "./acceptance-data";
import { AcceptancePagination } from "./AcceptancePagination";
import { formatCurrency } from "./data";
import { ReportPreview } from "./ReportPreview";

export function AcceptanceBonusPage({ onCreateBonusBon }: { onCreateBonusBon: (customerCode: string) => void }) {
  const eligibleCustomers = customerProfiles.filter((customer) => customer.active && bonusesAvailable(customer) > 0);
  const [selectedCode, setSelectedCode] = useState(eligibleCustomers[0]?.code ?? customerProfiles[0].code);
  const selectedCustomer = getCustomer(selectedCode);
  const available = bonusesAvailable(selectedCustomer);
  const remainder = selectedCustomer.bonusThreshold > 0 ? selectedCustomer.accumulatedPaidOmzet % selectedCustomer.bonusThreshold : 0;
  const bonusBons = acceptanceBons.filter((bon) => bon.isBonus && bon.customerCode === selectedCode);
  const allBonusBons = acceptanceBons.filter((bon) => bon.isBonus);
  const totalBonusCost = allBonusBons.reduce((sum, bon) => sum + calculateBon(bon).bonusCost, 0);

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><Gift size={30} /></span>
        <div><span className="eyebrow">Bonus berdasarkan omzet Lunas</span><h2>Bonus Pelanggan</h2><p>Bonus menumpuk, dapat digunakan beberapa unit dalam satu Bonus Bon, dan tidak menambah omzet atau laba.</p></div>
      </header>

      <div className="acceptance-info-banner"><Info size={23} /><div><strong>Aturan bonus client</strong><span>Setiap bonus memakai satu threshold omzet Lunas. Produk bonus berharga Rp0. Harga Modal tetap dicatat sebagai biaya bonus/promosi, tetapi tidak mengurangi Laba HL.</span></div></div>

      <div className="acceptance-stat-grid">
        <Stat label="Pelanggan Eligible" value={`${eligibleCustomers.length} pelanggan`} helper="Memiliki bonus tersedia" icon={<Users size={23} />} />
        <Stat label="Total Bonus Tersedia" value={`${eligibleCustomers.reduce((sum, customer) => sum + bonusesAvailable(customer), 0)} unit`} helper="Bisa dipakai dalam Bonus Bon" icon={<Gift size={23} />} />
        <Stat label="Bonus Bon Tercatat" value={`${allBonusBons.length} Bon`} helper="Dilaporkan terpisah" icon={<ReceiptText size={23} />} />
        <Stat label="Biaya Bonus/Promosi" value={formatCurrency(totalBonusCost)} helper="Tidak mengurangi Laba HL" icon={<BarChart3 size={23} />} />
      </div>

      <div className="acceptance-detail-layout">
        <section className="acceptance-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">Pelanggan eligible</span><h3>Bonus Tersedia</h3></div><Gift size={24} /></div>
          {eligibleCustomers.length === 0 ? <div className="acceptance-inline-empty"><Gift size={30} /><span>Belum ada pelanggan yang memenuhi threshold.</span></div> : <div className="bonus-eligible-list">{eligibleCustomers.map((customer) => <button className={`bonus-eligible-row ${selectedCode === customer.code ? "is-selected" : ""}`} type="button" key={customer.code} onClick={() => setSelectedCode(customer.code)}><span className="customer-avatar">{customer.name.slice(0, 2).toUpperCase()}</span><span><strong>{customer.name}</strong><small>{formatCurrency(customer.accumulatedPaidOmzet)} omzet Lunas</small></span><strong>{bonusesAvailable(customer)} unit</strong></button>)}</div>}
        </section>

        <aside className="acceptance-card bonus-acceptance-summary">
          <span className="eyebrow">Pelanggan dipilih</span>
          <h3>{selectedCustomer.name}</h3>
          <div className="bonus-big-number"><Gift size={30} /><div><strong>{available} unit</strong><span>bonus tersedia</span></div></div>
          <dl className="bonus-rule-list"><div><dt>Threshold</dt><dd>{formatCurrency(selectedCustomer.bonusThreshold)}</dd></div><div><dt>Akumulasi omzet Lunas</dt><dd>{formatCurrency(selectedCustomer.accumulatedPaidOmzet)}</dd></div><div><dt>Sudah diberikan</dt><dd>{selectedCustomer.bonusesGranted} unit</dd></div><div><dt>Sisa akumulasi</dt><dd>{formatCurrency(remainder)}</dd></div></dl>
          <button className="button button--primary button--full" type="button" disabled={available === 0} onClick={() => onCreateBonusBon(selectedCustomer.code)}><Gift size={20} />Buat Bonus Bon</button>
        </aside>
      </div>

      <section className="acceptance-card">
        <div className="acceptance-card-heading"><div><span className="eyebrow">Riwayat terpisah</span><h3>Bonus Bon Pelanggan</h3></div><FileText size={24} /></div>
        {bonusBons.length === 0 ? <div className="acceptance-inline-empty"><FileText size={30} /><span>Belum ada Bonus Bon untuk pelanggan ini.</span></div> : <div className="bonus-bon-history">{bonusBons.map((bon) => { const totals = calculateBon(bon); return <article key={bon.number}><span><strong>{bon.number}</strong><small>{toDisplayDate(bon.date)} · {bon.lines.reduce((sum, line) => sum + line.quantity, 0)} unit bonus</small></span><span><small>Tagihan</small><strong>{formatCurrency(0)}</strong></span><span><small>Biaya promosi</small><strong>{formatCurrency(totals.bonusCost)}</strong></span></article>; })}</div>}
      </section>
    </section>
  );
}

export function AcceptanceReportsPage() {
  const [month, setMonth] = useState("6");
  const [year, setYear] = useState("2026");
  const [customerCode, setCustomerCode] = useState("all");
  const [scope, setScope] = useState<"overall" | "LM" | "BR">("overall");
  const [page, setPage] = useState(1);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const pageSize = 5;
  const monthKey = `${year}-${month.padStart(2, "0")}`;
  const periodLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${monthKey}-01T00:00:00`));

  const rows = useMemo(() => acceptanceBons.filter((bon) => {
    if (!bon.date.startsWith(monthKey)) return false;
    if (customerCode !== "all" && bon.customerCode !== customerCode) return false;
    if (scope === "overall") return true;
    return calculateBon(bon).lineDetails.some((line) => line.product.type === scope);
  }), [monthKey, customerCode, scope]);

  const normalRows = rows.filter((bon) => !bon.isBonus && bon.status !== "Void");
  const paidRows = normalRows.filter((bon) => bon.status === "Lunas");
  const unpaidRows = normalRows.filter((bon) => bon.status === "Piutang");
  const bonusRows = rows.filter((bon) => bon.isBonus);
  const negativeRows = normalRows.filter((bon) => calculateBon(bon).negativeProfit);
  const totalOmzet = paidRows.reduce((sum, bon) => sum + calculateBon(bon).omzet, 0);
  const totalProfit = paidRows.reduce((sum, bon) => sum + calculateBon(bon).profit, 0);
  const totalPaid = paidRows.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const totalOutstanding = unpaidRows.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const omzetLm = paidRows.reduce((sum, bon) => sum + calculateBon(bon).lineDetails.filter((line) => line.product.type === "LM").reduce((lineSum, line) => lineSum + line.lineOmzet, 0), 0);
  const omzetBr = paidRows.reduce((sum, bon) => sum + calculateBon(bon).lineDetails.filter((line) => line.product.type === "BR").reduce((lineSum, line) => lineSum + line.lineOmzet, 0), 0);
  const bonusCost = bonusRows.reduce((sum, bon) => sum + calculateBon(bon).bonusCost, 0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const updateFilter = (callback: () => void) => {
    callback();
    setPage(1);
  };

  const preparePdf = () => {
    setPreparingPdf(true);
    window.setTimeout(() => {
      setPreparingPdf(false);
      setPdfOpen(true);
    }, 500);
  };

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><BarChart3 size={30} /></span>
        <div><span className="eyebrow">Cash basis</span><h2>Laporan</h2><p>Omzet dan laba hanya berasal dari Bon Lunas. Bonus Bon dan transaksi rugi ditandai terpisah.</p></div>
        <button className="button button--primary" type="button" disabled={preparingPdf} onClick={preparePdf}><Download size={20} />{preparingPdf ? "Menyiapkan Preview..." : "Preview PDF"}</button>
      </header>

      <section className="acceptance-filter-card report-acceptance-filter">
        <div><span className="eyebrow">Filter rekap</span><h3>{periodLabel}</h3></div>
        <label className="field"><span>Bulan</span><select value={month} onChange={(event) => updateFilter(() => setMonth(event.target.value))}><option value="6">Juni</option><option value="5">Mei</option><option value="4">April</option></select></label>
        <label className="field"><span>Tahun</span><select value={year} onChange={(event) => updateFilter(() => setYear(event.target.value))}><option>2026</option><option>2025</option></select></label>
        <label className="field"><span>Pelanggan</span><select value={customerCode} onChange={(event) => updateFilter(() => setCustomerCode(event.target.value))}><option value="all">Semua pelanggan</option>{customerProfiles.filter((customer) => customer.active).map((customer) => <option value={customer.code} key={customer.code}>{customer.name}</option>)}</select></label>
        <label className="field"><span>Cakupan produk</span><select value={scope} onChange={(event) => updateFilter(() => setScope(event.target.value as "overall" | "LM" | "BR"))}><option value="overall">Keseluruhan</option><option value="LM">LM</option><option value="BR">BR</option></select></label>
      </section>

      <div className="acceptance-stat-grid">
        <Stat label="Omzet Lunas" value={formatCurrency(totalOmzet)} helper="Ongkir tidak termasuk" icon={<BarChart3 size={23} />} />
        <Stat label="Laba HL Lunas" value={formatCurrency(totalProfit)} helper="Bonus dan ongkir tidak memengaruhi" icon={<BarChart3 size={23} />} />
        <Stat label="Sudah Dibayar" value={formatCurrency(totalPaid)} helper="Omzet + ongkir Bon Lunas" icon={<ReceiptText size={23} />} />
        <Stat label="Piutang Aktif" value={formatCurrency(totalOutstanding)} helper="Omzet + ongkir Bon Piutang" icon={<WalletCards size={23} />} />
      </div>

      <div className="acceptance-detail-layout">
        <section className="acceptance-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">Breakdown produk</span><h3>Omzet LM dan BR</h3></div><SlidersHorizontal size={24} /></div>
          <div className="report-breakdown"><div><span>LM</span><strong>{formatCurrency(omzetLm)}</strong><small>{totalOmzet === 0 ? 0 : Math.round(omzetLm / totalOmzet * 100)}% dari omzet</small></div><div><span>BR</span><strong>{formatCurrency(omzetBr)}</strong><small>{totalOmzet === 0 ? 0 : Math.round(omzetBr / totalOmzet * 100)}% dari omzet</small></div><div><span>Total</span><strong>{formatCurrency(totalOmzet)}</strong><small>Bon Lunas saja</small></div></div>
        </section>
        <aside className="acceptance-card report-audit-summary"><div className="acceptance-card-heading"><div><span className="eyebrow">Audit transaksi</span><h3>Bonus dan Transaksi Rugi</h3></div><AlertTriangle size={24} /></div><dl><div><dt>Bonus Bon</dt><dd>{bonusRows.length} Bon</dd></div><div><dt>Unit bonus</dt><dd>{bonusRows.reduce((sum, bon) => sum + bon.lines.reduce((lineSum, line) => lineSum + line.quantity, 0), 0)} unit</dd></div><div><dt>Biaya bonus/promosi</dt><dd>{formatCurrency(bonusCost)}</dd></div><div><dt>Transaksi laba negatif</dt><dd>{negativeRows.length} Bon</dd></div></dl></aside>
      </div>

      <section className="acceptance-card">
        <div className="acceptance-card-heading"><div><span className="eyebrow">Daftar transaksi</span><h3>Hasil Rekap {periodLabel}</h3></div><FileText size={24} /></div>
        {rows.length === 0 ? <div className="acceptance-inline-empty"><FileText size={30} /><span>Tidak ada data untuk filter ini.</span></div> : <div className="acceptance-report-wrap"><table className="acceptance-report-table"><thead><tr><th>Tanggal</th><th>Nomor Bon</th><th>Pelanggan</th><th>Status</th><th>Omzet</th><th>Ongkir</th><th>Total</th><th>Laba/Biaya</th></tr></thead><tbody>{pagedRows.map((bon) => { const totals = calculateBon(bon); return <tr key={bon.number} className={totals.negativeProfit ? "is-negative-profit" : ""}><td>{toDisplayDate(bon.date)}</td><td><strong>{bon.number}</strong>{totals.negativeProfit && <span className="mini-warning-badge">Rugi</span>}</td><td>{totals.customer.name}</td><td>{bon.status}</td><td>{formatCurrency(totals.omzet)}</td><td>{formatCurrency(bon.shipping)}</td><td>{formatCurrency(totals.amountOwed)}</td><td>{bon.isBonus ? `Biaya ${formatCurrency(totals.bonusCost)}` : formatCurrency(totals.profit)}</td></tr>; })}</tbody></table><div className="acceptance-report-mobile">{pagedRows.map((bon) => { const totals = calculateBon(bon); return <article key={bon.number} className={totals.negativeProfit ? "is-negative-profit" : ""}><header><span><strong>{bon.number}</strong><small>{totals.customer.name}</small></span><span className="mobile-report-badges"><strong>{bon.status}</strong>{totals.negativeProfit && <span className="mini-warning-badge">Rugi</span>}</span></header><dl><div><dt>Tanggal</dt><dd>{toDisplayDate(bon.date)}</dd></div><div><dt>Omzet</dt><dd>{formatCurrency(totals.omzet)}</dd></div><div><dt>Ongkir</dt><dd>{formatCurrency(bon.shipping)}</dd></div><div><dt>Total</dt><dd>{formatCurrency(totals.amountOwed)}</dd></div><div><dt>{bon.isBonus ? "Biaya Bonus" : "Laba"}</dt><dd>{formatCurrency(bon.isBonus ? totals.bonusCost : totals.profit)}</dd></div></dl></article>; })}</div><AcceptancePagination page={safePage} totalPages={totalPages} totalItems={rows.length} pageSize={pageSize} onPageChange={setPage} /></div>}
      </section>

      <ReportPreview open={pdfOpen} periodLabel={periodLabel} rows={rows} onClose={() => setPdfOpen(false)} onPrint={() => window.print()} />
    </section>
  );
}

function Stat({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) {
  return <article className="acceptance-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{helper}</p></div></article>;
}
