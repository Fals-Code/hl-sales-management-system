import { BarChart3, FileText, Gift, Info, ReceiptText, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { bonusesAvailable, calculateBon, toDisplayDate } from "./acceptance-data";
import { formatCurrency } from "./data";
import type { StoredCustomerWithHistory } from "./resource-mappers";
import { useAppStore } from "./store";

export function StoreBonus({ onCreateBonusBon }: { onCreateBonusBon: (customerCode: string) => void }) {
  const { customers, bons } = useAppStore();
  const activeCustomers = customers.filter((customer) => customer.active) as StoredCustomerWithHistory[];
  const eligibleCustomers = activeCustomers.filter((customer) => bonusesAvailable(customer) > 0);
  const [selectedCode, setSelectedCode] = useState(eligibleCustomers[0]?.code ?? activeCustomers[0]?.code ?? "");

  useEffect(() => {
    if (activeCustomers.some((customer) => customer.code === selectedCode)) return;
    setSelectedCode(eligibleCustomers[0]?.code ?? activeCustomers[0]?.code ?? "");
  }, [activeCustomers, eligibleCustomers, selectedCode]);

  const selectedCustomer = activeCustomers.find((customer) => customer.code === selectedCode) ?? activeCustomers[0];
  const available = selectedCustomer ? bonusesAvailable(selectedCustomer) : 0;
  const remainder = selectedCustomer && selectedCustomer.bonusThreshold > 0
    ? selectedCustomer.accumulatedPaidOmzet % selectedCustomer.bonusThreshold
    : 0;
  const bonusBons = selectedCustomer
    ? bons.filter((bon) => !bon.deletedAt && bon.isBonus && bon.customerCode === selectedCustomer.code)
    : [];
  const allBonusBons = bons.filter((bon) => !bon.deletedAt && bon.isBonus && bon.status !== "Void");
  const totalBonusCost = allBonusBons.reduce((sum, bon) => sum + calculateBon(bon).bonusCost, 0);
  const ledger = useMemo(
    () => [...(selectedCustomer?.bonusHistory ?? [])].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [selectedCustomer]
  );

  if (!selectedCustomer) {
    return <section className="acceptance-empty"><Gift size={36} /><h3>Belum ada pelanggan aktif</h3><p>Tambahkan pelanggan dan catat pelunasan sebelum menggunakan bonus.</p></section>;
  }

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><Gift size={30} /></span>
        <div><span className="eyebrow">Bonus berdasarkan omzet Lunas</span><h2>Bonus Pelanggan</h2><p>Saldo, kelayakan, dan riwayat bonus dibaca langsung dari ledger backend.</p></div>
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

      <section className="acceptance-card">
        <div className="acceptance-card-heading"><div><span className="eyebrow">Ledger backend</span><h3>Mutasi Saldo Bonus</h3></div><FileText size={24} /></div>
        {ledger.length === 0 ? <div className="acceptance-inline-empty"><FileText size={30} /><span>Belum ada mutasi saldo bonus.</span></div> : <div className="bonus-bon-history">{ledger.map((entry) => <article key={entry.id}><span><strong>{mutationLabel(entry.mutationType)}</strong><small>{toDisplayDate(entry.createdAt.slice(0, 10))} · {entry.reason || "Mutasi otomatis sistem"}</small></span><span><small>Perubahan</small><strong>{entry.amount > 0 ? "+" : ""}{entry.amount} unit</strong></span><span><small>Saldo akhir</small><strong>{entry.balanceAfter} unit</strong></span></article>)}</div>}
      </section>
    </section>
  );
}

function mutationLabel(value: string) {
  const labels: Record<string, string> = {
    EARNED: "Bonus diperoleh",
    USED: "Bonus digunakan",
    REVERSED: "Bonus dikembalikan",
    ADJUSTMENT: "Penyesuaian bonus"
  };
  return labels[value] ?? value;
}

function Stat({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: ReactNode }) {
  return <article className="acceptance-stat"><span className="acceptance-stat-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{helper}</span></div></article>;
}
