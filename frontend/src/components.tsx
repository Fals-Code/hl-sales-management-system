import type { LucideIcon } from "lucide-react";
import { ChevronRight, FileText, Search } from "lucide-react";
import type { BonRow, BonStatus } from "./data";
import { formatCurrency } from "./data";

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="search-box">
      <Search size={21} aria-hidden="true" />
      <span className="sr-only">Cari</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function StatusBadge({ status }: { status: BonStatus }) {
  const className = status === "Lunas" ? "success" : status === "Dibatalkan" ? "danger" : "warning";
  return <span className={`status-badge status-badge--${className}`}>{status}</span>;
}

export function ResponsiveBonList({ rows }: { rows: BonRow[] }) {
  return (
    <div className="responsive-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nomor Bon</th>
            <th>Pelanggan</th>
            <th>Tanggal</th>
            <th>Total</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((bon) => (
            <tr key={bon.number}>
              <td><strong>{bon.number}</strong></td>
              <td>{bon.customer}</td>
              <td>{bon.date}</td>
              <td className="money-cell">{formatCurrency(bon.amount)}</td>
              <td><StatusBadge status={bon.status} /></td>
              <td><button className="text-button">Lihat Detail</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mobile-card-list">
        {rows.map((bon) => (
          <article className="mobile-data-card" key={bon.number}>
            <div className="mobile-data-card-header">
              <div>
                <span className="eyebrow">{bon.number}</span>
                <h3>{bon.customer}</h3>
              </div>
              <StatusBadge status={bon.status} />
            </div>
            <div className="mobile-data-card-meta">
              <span>{bon.date}</span>
              <strong>{formatCurrency(bon.amount)}</strong>
            </div>
            <button className="button button--secondary button--full">Lihat Detail</button>
          </article>
        ))}
      </div>
    </div>
  );
}

export function QuickAction({ icon: Icon, label, helper, onClick }: { icon: LucideIcon; label: string; helper: string; onClick: () => void }) {
  return (
    <button className="quick-action-card" onClick={onClick}>
      <span className="quick-action-icon"><Icon size={25} /></span>
      <span><strong>{label}</strong><small>{helper}</small></span>
      <ChevronRight size={22} />
    </button>
  );
}

export function AttentionItem({ icon: Icon, title, text, tone, onClick }: { icon: LucideIcon; title: string; text: string; tone: string; onClick: () => void }) {
  return (
    <button className={`attention-item attention-item--${tone}`} onClick={onClick}>
      <span className="attention-icon"><Icon size={22} /></span>
      <span><strong>{title}</strong><small>{text}</small></span>
      <ChevronRight size={20} />
    </button>
  );
}

export function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-line">
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

export function MobileNavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button className={`mobile-nav-item ${active ? "mobile-nav-item--active" : ""}`} onClick={onClick}>
      <Icon size={22} />
      <span>{label}</span>
    </button>
  );
}

export function ReportCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="report-card">
      <div className="report-icon"><Icon size={26} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="button button--secondary button--full"><FileText size={19} />Unduh PDF</button>
    </article>
  );
}
