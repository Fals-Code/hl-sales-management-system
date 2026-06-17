import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Gift,
  HandCoins,
  Plus,
  ReceiptText,
  Search,
  Users,
  WalletCards
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  acceptanceBons,
  bonusesAvailable,
  calculateBon,
  customerProfiles,
  toDisplayDate,
  type AcceptanceBon,
  type AcceptanceBonStatus
} from "./acceptance-data";
import { formatCurrency, type PageKey } from "./data";

export function AcceptanceDashboardPage({
  onCreateBon,
  onNavigate,
  onViewBon,
  onCreateBonusBon
}: {
  onCreateBon: () => void;
  onNavigate: (page: PageKey) => void;
  onViewBon: (bonNumber: string) => void;
  onCreateBonusBon: (customerCode: string) => void;
}) {
  const normalBons = acceptanceBons.filter((bon) => !bon.isBonus && bon.status !== "Void");
  const paidBons = normalBons.filter((bon) => bon.status === "Lunas");
  const unpaidBons = normalBons.filter((bon) => bon.status === "Piutang");
  const totalReceivable = unpaidBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const totalPaid = paidBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const recognizedOmzet = paidBons.reduce((sum, bon) => sum + calculateBon(bon).omzet, 0);
  const recognizedProfit = paidBons.reduce((sum, bon) => sum + calculateBon(bon).profit, 0);
  const eligible = customerProfiles.filter((customer) => bonusesAvailable(customer) > 0);

  return (
    <>
      <section className="welcome-panel">
        <div><span className="eyebrow">Ringkasan cash basis</span><h2>Selamat datang, Admin</h2><p>Omzet dan laba hanya dihitung dari Bon berstatus Lunas.</p></div>
        <button className="button button--primary button--large" type="button" onClick={onCreateBon}><Plus size={22} />Buat Bon Baru</button>
      </section>

      <section className="summary-grid" aria-label="Ringkasan utama">
        <DashboardSummary label="Total Piutang" value={totalReceivable} helper={`${unpaidBons.length} Bon Piutang`} icon={<WalletCards size={25} />} tone="blue" />
        <DashboardSummary label="Sudah Dibayar" value={totalPaid} helper={`${paidBons.length} Bon Lunas`} icon={<HandCoins size={25} />} tone="green" />
        <DashboardSummary label="Omzet Lunas" value={recognizedOmzet} helper="Ongkir tidak termasuk" icon={<BarChart3 size={25} />} tone="violet" />
        <DashboardSummary label="Laba HL Lunas" value={recognizedProfit} helper="Bonus dan ongkir tidak memengaruhi" icon={<BarChart3 size={25} />} tone="orange" />
      </section>

      <section className="quick-actions">
        <div className="section-heading"><span className="eyebrow">Akses cepat</span><h2>Apa yang ingin dilakukan?</h2></div>
        <div className="quick-action-grid">
          <ActionCard icon={<ReceiptText size={25} />} title="Buat Bon" description="Transaksi normal dengan status awal Piutang" onClick={onCreateBon} />
          <ActionCard icon={<HandCoins size={25} />} title="Catat Pelunasan" description="Satu Bon atau seluruh Bon satu bulan" onClick={() => onNavigate("settlements")} />
          <ActionCard icon={<Users size={25} />} title="Kelola Pelanggan" description="Diskon bertingkat dan threshold bonus" onClick={() => onNavigate("customers")} />
          <ActionCard icon={<Gift size={25} />} title="Buat Bonus Bon" description={`${eligible.length} pelanggan memiliki bonus`} onClick={() => eligible[0] ? onCreateBonusBon(eligible[0].code) : onNavigate("bonus")} />
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="section-heading section-heading--row"><div><span className="eyebrow">Transaksi terbaru</span><h2>Bon Terakhir</h2></div><button className="text-button" type="button" onClick={() => onNavigate("bons")}>Lihat Semua <ChevronRight size={18} /></button></div>
          <AcceptanceBonList bons={acceptanceBons.slice(0, 5)} onViewBon={onViewBon} />
        </section>
        <aside className="panel attention-panel">
          <div className="section-heading"><span className="eyebrow">Perlu perhatian</span><h2>Tindakan Hari Ini</h2></div>
          <AttentionButton icon={<WalletCards size={22} />} title={`${unpaidBons.length} Bon Piutang`} detail={formatCurrency(totalReceivable)} onClick={() => onNavigate("receivables")} tone="warning" />
          <AttentionButton icon={<Gift size={22} />} title={`${eligible.length} pelanggan eligible bonus`} detail="Buat Bonus Bon terpisah" onClick={() => onNavigate("bonus")} tone="success" />
          <AttentionButton icon={<AlertTriangle size={22} />} title="Transaksi sensitif" detail="Void dan rugi memerlukan PIN Owner" onClick={() => onNavigate("bons")} tone="danger" />
        </aside>
      </div>
    </>
  );
}

export function AcceptanceBonsPage({ onCreateBon, onViewBon }: { onCreateBon: () => void; onViewBon: (bonNumber: string) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | AcceptanceBonStatus>("all");
  const filtered = useMemo(() => acceptanceBons.filter((bon) => {
    const customer = calculateBon(bon).customer;
    const matchesSearch = `${bon.number} ${customer.name}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === "all" || bon.status === status);
  }), [search, status]);

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header"><span className="acceptance-page-icon"><ReceiptText size={30} /></span><div><span className="eyebrow">Transaksi</span><h2>Daftar Bon</h2><p>Status menggunakan istilah client: Piutang, Lunas, Bonus, dan Void.</p></div><button className="button button--primary" type="button" onClick={onCreateBon}><Plus size={20} />Buat Bon</button></header>
      <section className="acceptance-toolbar acceptance-toolbar--filters"><label className="search-box"><Search size={21} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari Nomor Bon atau pelanggan" /></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as "all" | AcceptanceBonStatus)}><option value="all">Semua status</option><option value="Piutang">Piutang</option><option value="Lunas">Lunas</option><option value="Bonus">Bonus</option><option value="Void">Void</option></select></label></section>
      {filtered.length === 0 ? <section className="acceptance-empty"><ReceiptText size={38} /><h3>Bon tidak ditemukan</h3><p>Ubah pencarian atau filter status.</p></section> : <section className="acceptance-card"><AcceptanceBonList bons={filtered} onViewBon={onViewBon} /></section>}
    </section>
  );
}

export function AcceptanceReceivablesPage({ onSettlement, onViewBon }: { onSettlement: () => void; onViewBon: (bonNumber: string) => void }) {
  const unpaid = acceptanceBons.filter((bon) => bon.status === "Piutang" && !bon.isBonus);
  const total = unpaid.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  return <section className="acceptance-page"><header className="acceptance-page-header"><span className="acceptance-page-icon"><WalletCards size={30} /></span><div><span className="eyebrow">Outstanding</span><h2>Piutang Aktif</h2><p>Jumlah yang ditagihkan adalah omzet setelah diskon bertingkat ditambah ongkir.</p></div><button className="button button--primary" type="button" onClick={onSettlement}><HandCoins size={20} />Catat Pelunasan</button></header><div className="receivable-acceptance-hero"><WalletCards size={32} /><div><span>Total Piutang</span><strong>{formatCurrency(total)}</strong><small>{unpaid.length} Bon aktif</small></div></div><section className="acceptance-card"><AcceptanceBonList bons={unpaid} onViewBon={onViewBon} /></section></section>;
}

function AcceptanceBonList({ bons, onViewBon }: { bons: AcceptanceBon[]; onViewBon: (bonNumber: string) => void }) {
  return <div className="acceptance-list-wrap"><table className="acceptance-bon-table"><thead><tr><th>Nomor Bon</th><th>Pelanggan</th><th>Tanggal</th><th>Jenis</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{bons.map((bon) => { const totals = calculateBon(bon); return <tr key={bon.number}><td><strong>{bon.number}</strong></td><td>{totals.customer.name}</td><td>{toDisplayDate(bon.date)}</td><td>{bon.isBonus ? "Bonus" : "Normal"}</td><td>{formatCurrency(totals.amountOwed)}</td><td><AcceptanceStatus status={bon.status} /></td><td><button className="text-button" type="button" onClick={() => onViewBon(bon.number)}>Lihat Detail</button></td></tr>; })}</tbody></table><div className="acceptance-bon-mobile-list">{bons.map((bon) => { const totals = calculateBon(bon); return <article key={bon.number}><header><span><span className="eyebrow">{bon.number}</span><h3>{totals.customer.name}</h3></span><AcceptanceStatus status={bon.status} /></header><dl><div><dt>Tanggal</dt><dd>{toDisplayDate(bon.date)}</dd></div><div><dt>Jenis</dt><dd>{bon.isBonus ? "Bonus Bon" : "Normal"}</dd></div><div><dt>Total</dt><dd>{formatCurrency(totals.amountOwed)}</dd></div></dl><button className="button button--secondary button--full" type="button" onClick={() => onViewBon(bon.number)}>Lihat Detail</button></article>; })}</div></div>;
}

function AcceptanceStatus({ status }: { status: AcceptanceBonStatus }) {
  const tone = status === "Lunas" ? "success" : status === "Piutang" ? "warning" : status === "Bonus" ? "bonus" : "danger";
  return <span className={`acceptance-status acceptance-status--${tone}`}>{status}</span>;
}

function DashboardSummary({ label, value, helper, icon, tone }: { label: string; value: number; helper: string; icon: React.ReactNode; tone: string }) {
  return <article className={`summary-card summary-card--${tone}`}><div className="summary-card-icon">{icon}</div><div><span>{label}</span><strong>{formatCurrency(value)}</strong><small>{helper}</small></div></article>;
}

function ActionCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return <button className="quick-action-card" type="button" onClick={onClick}><span className="quick-action-icon">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={21} /></button>;
}

function AttentionButton({ icon, title, detail, onClick, tone }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void; tone: string }) {
  return <button className={`attention-item attention-item--${tone}`} type="button" onClick={onClick}><span className="attention-icon">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={20} /></button>;
}
