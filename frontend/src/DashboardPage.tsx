import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Gift,
  HandCoins,
  ReceiptText,
  Users,
  WalletCards
} from "lucide-react";
import {
  acceptanceBons,
  bonusesAvailable,
  calculateBon,
  customerProfiles,
  toDisplayDate,
  type AcceptanceBonStatus
} from "./acceptance-data";
import { formatCurrency, type PageKey } from "./data";

export function DashboardPage({
  onNavigate,
  onViewBon,
  onCreateBonusBon
}: {
  onNavigate: (page: PageKey) => void;
  onViewBon: (bonNumber: string) => void;
  onCreateBonusBon: (customerCode: string) => void;
}) {
  const normalBons = acceptanceBons.filter((bon) => !bon.isBonus && bon.status !== "Void");
  const paidBons = normalBons.filter((bon) => bon.status === "Lunas");
  const unpaidBons = normalBons.filter((bon) => bon.status === "Piutang");
  const negativeBons = normalBons.filter((bon) => calculateBon(bon).negativeProfit);
  const eligibleCustomers = customerProfiles.filter((customer) => bonusesAvailable(customer) > 0);

  const totalReceivable = unpaidBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const totalPaid = paidBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const recognizedOmzet = paidBons.reduce((sum, bon) => sum + calculateBon(bon).omzet, 0);
  const recognizedProfit = paidBons.reduce((sum, bon) => sum + calculateBon(bon).profit, 0);
  const totalBillings = totalPaid + totalReceivable;
  const collectionRate = totalBillings > 0 ? Math.round((totalPaid / totalBillings) * 100) : 0;
  const totalAvailableBonus = eligibleCustomers.reduce((sum, customer) => sum + bonusesAvailable(customer), 0);
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <section className="dashboard-page">
      <header className="dashboard-overview">
        <div>
          <span className="eyebrow">Ringkasan operasional</span>
          <h2>Aktivitas toko</h2>
          <p><CalendarDays size={17} />{todayLabel} · Perhitungan memakai cash basis</p>
        </div>
        <nav className="dashboard-shortcuts" aria-label="Akses cepat dashboard">
          <button type="button" onClick={() => onNavigate("settlements")}><HandCoins size={19} />Pelunasan</button>
          <button type="button" onClick={() => onNavigate("customers")}><Users size={19} />Pelanggan</button>
          <button type="button" onClick={() => eligibleCustomers[0] ? onCreateBonusBon(eligibleCustomers[0].code) : onNavigate("bonus")}><Gift size={19} />Bonus</button>
        </nav>
      </header>

      <section className="dashboard-metric-grid" aria-label="Ringkasan angka utama">
        <DashboardMetric label="Total Piutang" value={formatCurrency(totalReceivable)} helper={`${unpaidBons.length} Bon belum lunas`} icon={<WalletCards size={23} />} tone="warning" onClick={() => onNavigate("receivables")} />
        <DashboardMetric label="Sudah Dibayar" value={formatCurrency(totalPaid)} helper={`${paidBons.length} Bon lunas`} icon={<HandCoins size={23} />} tone="success" onClick={() => onNavigate("settlements")} />
        <DashboardMetric label="Omzet Lunas" value={formatCurrency(recognizedOmzet)} helper="Tidak termasuk ongkir" icon={<BarChart3 size={23} />} tone="primary" onClick={() => onNavigate("reports")} />
        <DashboardMetric label="Laba HL" value={formatCurrency(recognizedProfit)} helper="Dari transaksi lunas" icon={<BarChart3 size={23} />} tone="violet" onClick={() => onNavigate("reports")} />
      </section>

      <div className="dashboard-main-grid">
        <section className="dashboard-data-card" aria-labelledby="recent-bons-title">
          <div className="dashboard-section-heading">
            <div><span className="eyebrow">Transaksi terbaru</span><h3 id="recent-bons-title">Bon terakhir</h3></div>
            <button className="text-button" type="button" onClick={() => onNavigate("bons")}>Lihat semua <ChevronRight size={18} /></button>
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead><tr><th>Nomor Bon</th><th>Pelanggan</th><th>Tanggal</th><th>Status</th><th>Total</th><th><span className="sr-only">Aksi</span></th></tr></thead>
              <tbody>
                {acceptanceBons.slice(0, 5).map((bon) => {
                  const totals = calculateBon(bon);
                  return <tr key={bon.number}><td><strong>{bon.number}</strong></td><td>{totals.customer.name}</td><td>{toDisplayDate(bon.date)}</td><td><StatusBadge status={bon.status} /></td><td><strong>{formatCurrency(totals.amountOwed)}</strong></td><td><button className="dashboard-row-action" type="button" onClick={() => onViewBon(bon.number)} aria-label={`Lihat detail ${bon.number}`}><ArrowUpRight size={18} /></button></td></tr>;
                })}
              </tbody>
            </table>

            <div className="dashboard-mobile-bons">
              {acceptanceBons.slice(0, 5).map((bon) => {
                const totals = calculateBon(bon);
                return <button type="button" key={bon.number} onClick={() => onViewBon(bon.number)}><span><strong>{bon.number}</strong><small>{totals.customer.name} · {toDisplayDate(bon.date)}</small></span><span><StatusBadge status={bon.status} /><strong>{formatCurrency(totals.amountOwed)}</strong></span></button>;
              })}
            </div>
          </div>
        </section>

        <aside className="dashboard-priority-card" aria-labelledby="priority-title">
          <div className="dashboard-section-heading">
            <div><span className="eyebrow">Perlu ditindaklanjuti</span><h3 id="priority-title">Prioritas hari ini</h3></div>
            <span className="dashboard-priority-count">{unpaidBons.length + eligibleCustomers.length + negativeBons.length}</span>
          </div>

          <div className="dashboard-priority-list">
            <PriorityRow icon={<WalletCards size={21} />} title={`${unpaidBons.length} Bon Piutang`} detail={formatCurrency(totalReceivable)} tone="warning" onClick={() => onNavigate("receivables")} />
            <PriorityRow icon={<Gift size={21} />} title={`${eligibleCustomers.length} pelanggan dapat bonus`} detail={`${totalAvailableBonus} unit tersedia`} tone="success" onClick={() => onNavigate("bonus")} />
            <PriorityRow icon={<AlertTriangle size={21} />} title={`${negativeBons.length} transaksi laba negatif`} detail={negativeBons.length > 0 ? "Periksa otorisasi Owner" : "Tidak ada tindakan"} tone={negativeBons.length > 0 ? "danger" : "neutral"} onClick={() => onNavigate("bons")} />
          </div>

          <div className="dashboard-collection-status">
            <div><span>Status penagihan</span><strong>{collectionRate}%</strong></div>
            <div className="dashboard-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={collectionRate}><span style={{ width: `${collectionRate}%` }} /></div>
            <small>{formatCurrency(totalPaid)} dari {formatCurrency(totalBillings)} sudah diterima.</small>
          </div>
        </aside>
      </div>
    </section>
  );
}

function DashboardMetric({ label, value, helper, icon, tone, onClick }: { label: string; value: string; helper: string; icon: React.ReactNode; tone: "warning" | "success" | "primary" | "violet"; onClick: () => void }) {
  return <button className={`dashboard-metric dashboard-metric--${tone}`} type="button" onClick={onClick}><span className="dashboard-metric-icon">{icon}</span><span className="dashboard-metric-copy"><small>{label}</small><strong>{value}</strong><span>{helper}</span></span><ArrowUpRight size={18} className="dashboard-metric-arrow" /></button>;
}

function PriorityRow({ icon, title, detail, tone, onClick }: { icon: React.ReactNode; title: string; detail: string; tone: "warning" | "success" | "danger" | "neutral"; onClick: () => void }) {
  return <button className={`dashboard-priority-row dashboard-priority-row--${tone}`} type="button" onClick={onClick}><span>{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={18} /></button>;
}

function StatusBadge({ status }: { status: AcceptanceBonStatus }) {
  const tone = status === "Lunas" ? "success" : status === "Piutang" ? "warning" : status === "Bonus" ? "bonus" : "danger";
  return <span className={`acceptance-status acceptance-status--${tone}`}>{status}</span>;
}
