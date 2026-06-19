import { BarChart3, Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "./data";
import { calculateScoped, reportDateFor, type ReportScope } from "./reporting-logic";
import { useAppStore } from "./store";

export function StoreReports() {
  const { bons, customers, products } = useAppStore();
  const [period, setPeriod] = useState("2026-06");
  const [scope, setScope] = useState<ReportScope>("ALL");
  const [customerCode, setCustomerCode] = useState("ALL");

  const rows = useMemo(() => bons.filter((bon) => {
    if (bon.deletedAt || bon.status === "Void") return false;
    if (customerCode !== "ALL" && bon.customerCode !== customerCode) return false;
    const reportDate = reportDateFor(bon);
    if (!reportDate || !reportDate.startsWith(period)) return false;
    if (scope === "ALL") return true;
    return bon.lines.some((line) => line.snapshotProductType === scope || (!line.snapshotProductType && products.find((item) => item.id === line.productId)?.type === scope));
  }), [bons, products, period, scope, customerCode]);

  const totals = useMemo(() => rows.reduce((result, bon) => {
    const calculation = calculateScoped(bon, scope, customers, products);
    if (bon.status === "Piutang") result.piutang += calculation.total;
    if (bon.status === "Lunas") {
      result.paid += calculation.total;
      result.omzet += calculation.omzet;
      result.profit += calculation.profit;
      result.lm += calculation.lm;
      result.br += calculation.br;
    }
    if (bon.status === "Bonus") result.bonusCost += calculation.bonusCost;
    return result;
  }, { piutang: 0, paid: 0, omzet: 0, profit: 0, lm: 0, br: 0, bonusCost: 0 }), [rows, scope, customers, products]);

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><BarChart3 size={30} /></span>
        <div><span className="eyebrow">Cash basis</span><h2>Laporan</h2><p>Omzet, laba, dan pembayaran mengikuti Tanggal Pelunasan. Piutang tetap mengikuti Tanggal Bon.</p></div>
        <button className="button button--secondary" type="button" onClick={() => window.print()}><Download size={19} />Download PDF</button>
      </header>
      <section className="acceptance-toolbar">
        <label className="field"><span>Bulan</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
        <label className="field"><span>Pelanggan</span><select value={customerCode} onChange={(event) => setCustomerCode(event.target.value)}><option value="ALL">Semua pelanggan</option>{customers.filter((item) => item.active).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
        <label className="field"><span>Scope</span><select value={scope} onChange={(event) => setScope(event.target.value as ReportScope)}><option value="ALL">LM + BR</option><option value="LM">LM</option><option value="BR">BR</option></select></label>
      </section>
      <div className="acceptance-report-metrics"><Metric label="Piutang (Estimasi/Belum Diakui)" value={totals.piutang} /><Metric label="Sudah Dibayar" value={totals.paid} /><Metric label="Omzet Diakui" value={totals.omzet} /><Metric label="Laba HL Diakui" value={totals.profit} /></div>
      <section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Breakdown scoped lines</span><h3>LM dan BR</h3></div><FileText size={24} /></div><div className="acceptance-report-metrics"><Metric label="Omzet LM" value={totals.lm} /><Metric label="Omzet BR" value={totals.br} /><Metric label="Biaya Bonus" value={totals.bonusCost} /></div></section>
      <section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Transaksi dalam periode</span><h3>Rincian</h3></div><span>{rows.length} Bon</span></div><div className="acceptance-table-wrap"><table className="acceptance-table"><thead><tr><th>Nomor Bon</th><th>Tanggal Acuan</th><th>Status</th><th>Total Scoped</th></tr></thead><tbody>{rows.map((bon) => { const value = calculateScoped(bon, scope, customers, products); return <tr key={bon.number}><td><strong>{bon.number}</strong></td><td>{reportDateFor(bon)}</td><td>{bon.status}</td><td>{formatCurrency(value.total)}</td></tr>; })}</tbody></table></div></section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="acceptance-report-metric"><span>{label}</span><strong>{formatCurrency(value)}</strong></article>;
}
