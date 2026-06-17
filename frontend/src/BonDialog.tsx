import { AlertTriangle, ReceiptText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SummaryLine } from "./components";
import { customers, formatCurrency, products } from "./data";

export function BonDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedCustomer, setSelectedCustomer] = useState("Toko Sinar Abadi");
  const [quantity, setQuantity] = useState(1);
  const [shipping, setShipping] = useState(25000);

  const subtotal = useMemo(() => 1580000 * quantity, [quantity]);
  const discount = useMemo(() => Math.round(subtotal * 0.1), [subtotal]);
  const total = subtotal - discount + shipping;

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="bon-dialog" role="dialog" aria-modal="true" aria-labelledby="bon-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="dialog-header">
          <div>
            <span className="eyebrow">Transaksi baru</span>
            <h2 id="bon-dialog-title">Buat Bon</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup">
            <X size={24} />
          </button>
        </header>

        <div className="stepper" aria-label="Tahapan membuat bon">
          <span className="stepper-item stepper-item--active">1. Pelanggan</span>
          <span className="stepper-item stepper-item--active">2. Produk</span>
          <span className="stepper-item">3. Periksa</span>
        </div>

        <div className="dialog-body">
          <div className="form-grid">
            <label className="field field--wide">
              <span>Pelanggan</span>
              <select value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}>
                {customers.map((customer) => <option key={customer.code}>{customer.name}</option>)}
              </select>
              <small>Diskon LM 10% · Bonus tersedia 2 unit</small>
            </label>

            <label className="field field--wide">
              <span>Produk</span>
              <select defaultValue="Logam Mulia 1 Gram">
                {products.map((product) => <option key={product.name}>{product.name}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Jumlah</span>
              <div className="quantity-control">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Kurangi jumlah">−</button>
                <input value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} inputMode="numeric" />
                <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Tambah jumlah">+</button>
              </div>
            </label>

            <label className="field">
              <span>Ongkir</span>
              <input value={shipping} onChange={(event) => setShipping(Number(event.target.value) || 0)} inputMode="numeric" />
              <small>Masukkan angka tanpa titik.</small>
            </label>
          </div>

          <aside className="transaction-summary">
            <h3>Ringkasan Bon</h3>
            <SummaryLine label="Harga produk" value={subtotal} />
            <SummaryLine label="Diskon pelanggan" value={-discount} />
            <SummaryLine label="Ongkir" value={shipping} />
            <div className="summary-total">
              <span>Total Tagihan</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <div className="summary-note">
              <AlertTriangle size={20} />
              Harga dan diskon akan dihitung ulang oleh sistem saat disimpan.
            </div>
          </aside>
        </div>

        <footer className="dialog-footer">
          <button className="button button--secondary" onClick={onClose}>Batal</button>
          <button className="button button--primary" onClick={onClose}>
            <ReceiptText size={20} />
            Simpan Bon
          </button>
        </footer>
      </section>
    </div>
  );
}
