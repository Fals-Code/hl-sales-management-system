import { AlertTriangle, CheckCircle2, Printer, RotateCcw } from "lucide-react";
import { formatCurrency } from "../data";
import type { ApiBon, SavedBonSnapshot } from "./types";

export function TransactionCreateResult({ saved, snapshot, error, printing, onPrint, onReset, onViewBon, onBack }: {
  saved: ApiBon;
  snapshot: SavedBonSnapshot | null;
  error: string | null;
  printing: boolean;
  onPrint: () => void;
  onReset: () => void;
  onViewBon: (bonNumber: string) => void;
  onBack: () => void;
}) {
  return <section className="bon-create-page bon-create-success">
    <span className="bon-create-success-icon"><CheckCircle2 size={42} /></span>
    <span className="eyebrow">Transaksi tersimpan</span>
    <h2>{saved.bonNumber}</h2>
    <p>Bon sudah tersimpan. Detail transaksi dan file PDF siap digunakan.</p>
    {error && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{error}</span></div>}
    <div className="bon-create-success-actions">
      <button className="button button--secondary" type="button" disabled={printing} onClick={onPrint}><Printer size={18} />{printing ? "Menyiapkan PDF..." : "Cetak Bon"}</button>
      <button className="button button--secondary" type="button" onClick={onReset}><RotateCcw size={18} />Buat Bon Baru</button>
      <button className="button button--primary" type="button" onClick={() => onViewBon(saved.bonNumber)}>Lihat Detail Bon</button>
    </div>
    <button className="bon-success-back-link" type="button" onClick={onBack}>Kembali ke daftar transaksi</button>
    {snapshot && <FallbackPrintSheet snapshot={snapshot} />}
  </section>;
}

function FallbackPrintSheet({ snapshot }: { snapshot: SavedBonSnapshot }) {
  const { bon, customerName, lines, total } = snapshot;
  return <article className="bon-print-sheet" aria-hidden="true">
    <header><div><strong>HL</strong><span>{bon.isBonus ? "Bonus Bon" : "Bon Penjualan"}</span></div><div><small>Nomor Bon</small><strong>{bon.number}</strong></div></header>
    <section className="bon-print-meta"><div><span>Pelanggan</span><strong>{customerName}</strong></div><div><span>Tanggal</span><strong>{bon.date}</strong></div><div><span>Status</span><strong>{bon.status}</strong></div></section>
    <table><thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>{lines.map((item) => <tr key={item.line.productId}><td>{item.productName}<small>{item.productType}</small></td><td>{item.line.quantity}</td><td>{formatCurrency(item.unitPrice)}</td><td>{formatCurrency(item.subtotal)}</td></tr>)}</tbody></table>
    <section className="bon-print-totals"><div><span>Subtotal</span><strong>{formatCurrency(lines.reduce((sum, item) => sum + item.subtotal, 0))}</strong></div><div><span>Ongkir</span><strong>{formatCurrency(bon.shipping)}</strong></div><div className="is-total"><span>Total</span><strong>{formatCurrency(total)}</strong></div></section>
    <footer>Terima kasih. Dokumen dibuat oleh HL Sales Management.</footer>
  </article>;
}
