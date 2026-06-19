import { BarChart3, Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import type { AcceptanceBon, ProductType } from "./acceptance-data";
import { formatCurrency } from "./data";
import { useAppStore } from "./store";

type Scope = "ALL" | ProductType;

export function StoreReports() {
  const { bons, customers, products } = useAppStore();
  const [period, setPeriod] = useState("2026-06");
  const [scope, setScope] = useState<Scope>("ALL");
  const [customerCode, setCustomerCode] = useState("ALL");

  const rows = useMemo(() => bons.filter((bon) => {
    if (bon.status === "Void") return false;
    if (customerCode !== "ALL" && bon.customerCode !== customerCode) return false;
    const reportDate = bon.status === "Piutang" ? bon.date : bon.paymentDate ?? bon.date;
    if (!reportDate.startsWith(period)) return false;
    if (scope === "ALL") return true;
    return bon.lines.some((line) => products.find((item) => item.id === line.productId)?.type === scope);
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
        <label className="field"><span>Scope</span><select value={scope} onChange={(event) => setScope(event.target.value as Scope)}><option value="ALL">LM + BR</option><option value="LM">LM</option><option value="BR">BR</option></select></label>
      </section>

      <div className="acceptance-report-metrics">
        <Metric label="Piutang (Estimasi/Belum Diakui)" value={totals.piutang} />
        <Metric label="Sudah Dibayar" value={totals.paid} />
        <Metric label="Omzet Diakui" value={totals.omzet} />
        <Metric label="Laba HL Diakui" value={totals.profit} />
      </div>

      <section className="acceptance-card">
        <div className="acceptance-card-heading"><div><span className="eyebrow">Breakdown scoped lines</span><h3>LM dan BR</h3></div><FileText size={24} /></div>
        <div className="acceptance-report-metrics"><Metric label="Omzet LM" value={totals.lm} /><Metric label="Omzet BR" value={totals.br} /><Metric label="Biaya Bonus" value={totals.bonusCost} /></div>
      </section>

      <section className="acceptance-card">
        <div className="acceptance-card-heading"><div><span className="eyebrow">Transaksi dalam periode</span><h3>Rincian</h3></div><span>{rows.length} Bon</span></div>
        <div className="acceptance-table-wrap"><table className="acceptance-table"><thead><tr><th>Nomor Bon</th><th>Tanggal Acuan</th><th>Status</th><th>Total Scoped</th></tr></thead><tbody>{rows.map((bon) => { const value = calculateScoped(bon, scope, customers, products); const reportDate = bon.status === "Piutang" ? bon.date : bon.paymentDate ?? bon.date; return <tr key={bon.number}><td><strong>{bon.number}</strong></td><td>{reportDate}</td><td>{bon.status}</td><td>{formatCurrency(value.total)}</td></tr>; })}</tbody></table></div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="acceptance-report-metric"><span>{label}</span><strong>{formatCurrency(value)}</strong></article>;
}

function calculateScoped(bon: AcceptanceBon, scope: Scope, customers: ReturnType<typeof useAppStore>["customers"], products: ReturnType<typeof useAppStore>["products"]) {
  const customer = customers.find((item) => item.code === bon.customerCode);
  const values = bon.lines.reduce((result, line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product || !customer || (scope !== "ALL" && product.type !== scope)) return result;
    const base = line.snapshotBasePrice ?? product.basePrice;
    const cost = line.snapshotCostPrice ?? product.costPrice;
    const discounts = line.snapshotDiscounts ?? (product.type === "LM" ? customer.discountLm : customer.discountBr);
    const unit = bon.isBonus ? 0 : roundHundred(discounts.reduce((price, discount) => Math.floor(price * (100 - discount) / 100), base));
    const lineOmzet = unit * line.quantity;
    result.omzet += lineOmzet;
    result.profit += bon.isBonus ? 0 : (unit - cost) * line.quantity;
    result.bonusCost += bon.isBonus ? cost * line.quantity : 0;
    result[product.type === "LM" ? "lm" : "br"] += lineOmzet;
    return result;
  }, { omzet: 0, profit: 0, bonusCost: 0, lm: 0, br: 0 });
  const shipping = scope === "ALL" && !bon.isBonus ? bon.shipping : 0;
  return { ...values, total: bon.isBonus ? 0 : values.omzet + shipping };
}

const roundHundred = (value: number) => Math.floor((value + 50) / 100) * 100;
