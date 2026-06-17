import { History } from "lucide-react";
import { toDisplayDate, type CustomerProfile } from "./acceptance-data";
import { formatCurrency } from "./data";

export function ThresholdHistoryList({ customer }: { customer: CustomerProfile }) {
  return (
    <section className="threshold-history">
      <div className="acceptance-card-heading"><div><span className="eyebrow">Audit perubahan</span><h3>Riwayat Threshold Bonus</h3></div><History size={22} /></div>
      {customer.thresholdHistory.length === 0 ? (
        <div className="acceptance-inline-empty"><History size={28} /><span>Belum ada perubahan threshold.</span></div>
      ) : (
        <div className="threshold-history-list">
          {customer.thresholdHistory.map((entry, index) => (
            <article key={`${entry.date}-${index}`}>
              <span><strong>{toDisplayDate(entry.date)}</strong><small>{entry.note}</small></span>
              <span><small>Dari</small><strong>{formatCurrency(entry.previousAmount)}</strong></span>
              <span><small>Menjadi</small><strong>{formatCurrency(entry.newAmount)}</strong></span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
