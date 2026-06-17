import { CalendarDays, HandCoins } from "lucide-react";
import { formatCurrency } from "./data";

export function SingleBonSettlementDialog({ open, bonNumber, customerName, total, paymentDate, setPaymentDate, onClose, onConfirm }: { open: boolean; bonNumber: string; customerName: string; total: number; paymentDate: string; setPaymentDate: (date: string) => void; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="acceptance-master-dialog acceptance-master-dialog--small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">Pelunasan satu Bon</span><h2>Tandai Bon Sudah Lunas</h2><p>{bonNumber} milik {customerName} akan diubah dari Piutang menjadi Lunas.</p></div></header>
        <div className="acceptance-master-body">
          <label className="field"><span>Tanggal Pelunasan *</span><div className="input-icon-shell"><CalendarDays size={21} /><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div></label>
          <div className="acceptance-total"><span>Total dibayar</span><strong>{formatCurrency(total)}</strong></div>
          <div className="acceptance-info-box"><HandCoins size={20} /><span>Omzet, laba, dan akumulasi bonus baru diakui setelah konfirmasi ini.</span></div>
        </div>
        <footer><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--primary" type="button" disabled={!paymentDate} onClick={onConfirm}>Ya, Tandai Lunas</button></footer>
      </section>
    </div>
  );
}
