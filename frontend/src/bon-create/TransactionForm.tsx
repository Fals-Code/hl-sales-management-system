import { AlertTriangle, ArrowLeft, PackagePlus, Plus, ReceiptText, Save, Search, Trash2 } from "lucide-react";
import type { AcceptanceBonLine, CustomerProfile, ProductProfile } from "../acceptance-data";
import { formatCurrency } from "../data";
import { RupiahInput } from "../rupiah-input";
import type { BonCalculation, LineCalculation, Mode } from "./types";

export type TransactionFormProps = {
  presentation?: "page" | "dialog";
  mode: Mode;
  date: string;
  number: string;
  customerCode: string;
  description: string;
  shipping: number;
  lines: AcceptanceBonLine[];
  productSearch: string;
  ownerPin: string;
  negativeProfitReason: string;
  activeCustomers: CustomerProfile[];
  visibleProducts: ProductProfile[];
  customer?: CustomerProfile;
  lineCalculations: LineCalculation[];
  calculation: BonCalculation;
  validDate: boolean;
  valid: boolean;
  stockValid: boolean;
  needsApproval: boolean;
  saving: boolean;
  draftRestored: boolean;
  error: string | null;
  numberError?: string;
  customerError?: string;
  itemsError?: string;
  ownerPinError?: string;
  reasonError?: string;
  hasProducts: boolean;
  onCancel: () => void;
  onDiscardDraft: () => void;
  onModeChange: (mode: Mode) => void;
  onDateChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onAddProduct: (productId: string) => void;
  onQuantityChange: (productId: string, value: number) => void;
  onRemoveProduct: (productId: string) => void;
  onShippingChange: (value: number) => void;
  onOwnerPinChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSave: () => void;
};

export function TransactionForm(props: TransactionFormProps) {
  const {
    presentation = "page", mode, date, number, customerCode, description, shipping, lines, productSearch,
    ownerPin, negativeProfitReason, activeCustomers, visibleProducts, customer,
    lineCalculations, calculation, validDate, valid, stockValid, needsApproval,
    saving, draftRestored, error, numberError, customerError, itemsError,
    ownerPinError, reasonError, hasProducts
  } = props;

  return <section className={`bon-create-page ${presentation === "dialog" ? "bon-create-page--dialog" : ""}`} aria-labelledby="bon-create-title">
    {presentation === "page" && <header className="bon-create-header">
      <button className="button button--secondary button--compact" type="button" onClick={props.onCancel}><ArrowLeft size={18} />Kembali</button>
      <div><span className="eyebrow">Transaksi baru</span><h2 id="bon-create-title">Buat {mode === "bonus" ? "Bonus Bon" : "Bon"}</h2><p>Isi informasi transaksi, tambahkan produk, lalu simpan dari ringkasan di sisi kanan.</p></div>
    </header>}

    {draftRestored && <div className="bon-draft-banner"><Save size={20} /><div><strong>Draft sementara dipulihkan</strong><span>Data terakhir yang belum disimpan dimuat kembali. PIN Owner tidak pernah disimpan.</span></div><button className="button button--secondary button--compact" type="button" onClick={props.onDiscardDraft}>Mulai dari kosong</button></div>}
    {(!activeCustomers.length || !hasProducts) && <div className="acceptance-warning"><AlertTriangle size={20} /><span>Tambahkan pelanggan dan produk aktif sebelum membuat Bon.</span></div>}
    {error && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{error}</span></div>}

    <div className="bon-pos-layout">
      <div className="bon-pos-main">
        <section className="acceptance-card bon-create-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">1. Informasi Bon</span><h3>Data transaksi</h3></div><ReceiptText size={24} /></div>
          <div className="bon-mode-grid bon-mode-grid--page">
            <ModeButton selected={mode === "normal"} title="Penjualan Normal" helper="Membentuk Piutang dan dapat dilunasi." onClick={() => props.onModeChange("normal")} />
            <ModeButton selected={mode === "bonus"} title="Bonus Bon" helper="Tidak menambah omzet maupun laba." onClick={() => props.onModeChange("bonus")} />
          </div>
          <div className="acceptance-form-grid bon-create-meta-grid">
            <label className="field"><span>Tanggal *</span><input type="date" aria-invalid={!validDate} value={date} onChange={(event) => props.onDateChange(event.target.value)} />{!validDate && <small className="field-error">Tanggal Bon tidak valid.</small>}</label>
            <label className="field"><span>Nomor Bon *</span><input aria-invalid={Boolean(numberError)} value={number} onChange={(event) => props.onNumberChange(event.target.value.toUpperCase())} />{numberError && <small className="field-error">{numberError}</small>}</label>
            <label className="field field--wide"><span>Pelanggan *</span><select aria-invalid={Boolean(customerError)} value={customerCode} onChange={(event) => props.onCustomerChange(event.target.value)}><option value="">Pilih pelanggan</option>{activeCustomers.map((item) => <option key={item.code} value={item.code}>{item.name} · {item.code}</option>)}</select>{customerError && <small className="field-error">{customerError}</small>}</label>
            <label className="field field--wide"><span>Deskripsi</span><textarea rows={3} value={description} onChange={(event) => props.onDescriptionChange(event.target.value)} placeholder="Catatan transaksi atau keterangan Bon" /></label>
          </div>
        </section>

        <section className="acceptance-card bon-create-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">2. Produk</span><h3>Cari dan tambah produk</h3></div><span>{visibleProducts.length} tersedia</span></div>
          <label className="search-box bon-product-search"><Search size={20} /><input value={productSearch} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="Cari nama, kode, atau tipe produk" /></label>
          <div className="bon-product-catalog">
            {visibleProducts.map((product) => {
              const selectedQuantity = lines.find((line) => line.productId === product.id)?.quantity ?? 0;
              const disabled = product.stock <= 0 || selectedQuantity >= product.stock;
              const discounts = customer ? (product.type === "LM" ? customer.discountLm : customer.discountBr) : [];
              return <article className={`bon-product-option ${product.stock <= 0 ? "is-empty" : ""}`} key={product.id}>
                <div><span className={`status-badge status-badge--${product.type.toLowerCase()}`}>{product.type}</span><strong>{product.name}</strong><small>{product.id} · Stok {product.stock} · Diskon {discountText(discounts)}</small></div>
                <div><strong>{mode === "bonus" ? "Gratis" : formatCurrency(product.basePrice)}</strong><button className="button button--secondary button--compact" type="button" disabled={disabled} onClick={() => props.onAddProduct(product.id)}><Plus size={17} />{product.stock <= 0 ? "Habis" : selectedQuantity >= product.stock ? "Maksimal" : "Tambah"}</button></div>
              </article>;
            })}
            {!visibleProducts.length && <div className="acceptance-empty-state"><PackagePlus size={30} /><strong>Produk tidak ditemukan</strong><span>Ubah kata pencarian atau tambahkan produk baru.</span></div>}
          </div>
        </section>

        <section className={`acceptance-card bon-create-card ${itemsError ? "has-field-error" : ""}`}>
          <div className="acceptance-card-heading"><div><span className="eyebrow">Rincian transaksi</span><h3>Produk dalam Bon</h3></div><span>{lines.length} produk · {calculation.quantity} unit</span></div>
          {!lines.length ? <div className="acceptance-empty-state"><PackagePlus size={32} /><strong>Belum ada produk</strong><span>Pilih produk dari katalog di atas.</span>{itemsError && <small className="field-error">{itemsError}</small>}</div> : <div className="bon-cart-list">{lineCalculations.map((item) => <CartRow key={item.line.productId} item={item} onQuantityChange={props.onQuantityChange} onRemove={props.onRemoveProduct} />)}</div>}
        </section>
      </div>

      <aside className="bon-pos-summary">
        <section className="acceptance-card bon-summary-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">3. Ringkasan</span><h3>Review dan konfirmasi</h3></div><ReceiptText size={23} /></div>
          <dl className="bon-summary-list">
            <div><dt>Pelanggan</dt><dd>{customer?.name ?? "Belum dipilih"}</dd></div>
            <div><dt>Jumlah produk</dt><dd>{lines.length}</dd></div>
            <div><dt>Total unit</dt><dd>{calculation.quantity}</dd></div>
            <div><dt>Subtotal produk</dt><dd>{formatCurrency(calculation.omzet)}</dd></div>
            {mode === "normal" && <div className="bon-summary-shipping"><dt>Ongkir</dt><dd><RupiahInput compact aria-label="Ongkir" value={shipping} onValueChange={props.onShippingChange} /></dd></div>}
            {mode === "normal" && <div className={calculation.profit < 0 ? "is-negative" : ""}><dt>Laba internal</dt><dd>{formatCurrency(calculation.profit)}</dd></div>}
          </dl>
          <div className="bon-summary-total"><span>Total {mode === "bonus" ? "Tagihan" : "Piutang"}</span><strong>{formatCurrency(calculation.total)}</strong></div>

          {needsApproval && <section className="negative-profit-card bon-summary-approval"><div><AlertTriangle size={22} /><span><strong>Laba transaksi negatif</strong><small>Memerlukan otorisasi Owner dan alasan audit.</small></span></div><label className="field"><span>PIN Owner *</span><input type="password" inputMode="numeric" aria-invalid={Boolean(ownerPinError)} value={ownerPin} onChange={(event) => props.onOwnerPinChange(event.target.value)} />{ownerPinError && <small className="field-error">{ownerPinError}</small>}</label><label className="field"><span>Alasan *</span><textarea rows={3} aria-invalid={Boolean(reasonError)} value={negativeProfitReason} onChange={(event) => props.onReasonChange(event.target.value)} />{reasonError && <small className="field-error">{reasonError}</small>}</label></section>}
          {!stockValid && <div className="bon-inline-error"><AlertTriangle size={18} /><span>Periksa jumlah produk dan stok tersedia.</span></div>}
          <p className="bon-summary-hint">{valid ? "Data siap disimpan." : "Lengkapi data dan perbaiki validasi pada bagian terkait."}</p>
          <div className="bon-summary-actions"><button className="button button--secondary" type="button" disabled={saving} onClick={props.onCancel}>Batal</button><button className="button button--primary" type="button" disabled={!valid || saving} onClick={props.onSave}>{saving ? "Menyimpan..." : "Simpan Bon"}</button></div>
        </section>
      </aside>
    </div>

    <div className="bon-mobile-save-bar" aria-label="Aksi simpan Bon">
      <div><span>Total</span><strong>{formatCurrency(calculation.total)}</strong></div>
      <button className="button button--secondary button--compact" type="button" disabled={saving} onClick={props.onCancel}>Batal</button>
      <button className="button button--primary button--compact" type="button" disabled={!valid || saving} onClick={props.onSave}>{saving ? "Menyimpan..." : "Simpan Bon"}</button>
    </div>
  </section>;
}

function ModeButton({ selected, title, helper, onClick }: { selected: boolean; title: string; helper: string; onClick: () => void }) {
  return <button className={`bon-mode-card ${selected ? "is-selected" : ""}`} type="button" aria-pressed={selected} onClick={onClick}><ReceiptText size={23} /><span><strong>{title}</strong><small>{helper}</small></span></button>;
}

function CartRow({ item, onQuantityChange, onRemove }: { item: LineCalculation; onQuantityChange: (productId: string, value: number) => void; onRemove: (productId: string) => void }) {
  return <article className={`bon-cart-row ${item.invalidStock ? "has-error" : ""}`}>
    <div className="bon-cart-product"><span className={`status-badge status-badge--${item.productType.toLowerCase()}`}>{item.productType}</span><span><strong>{item.productName}</strong><small>{item.productCode} · Stok {item.stock} · Diskon {discountText(item.discounts)}</small></span></div>
    <label className="field"><span>Jumlah</span><input type="number" min={1} max={item.stock} value={item.line.quantity} onChange={(event) => onQuantityChange(item.line.productId, Number(event.target.value))} />{item.invalidStock && <small className="field-error">Jumlah melebihi stok.</small>}</label>
    <div className="bon-cart-price"><small>Harga akhir</small><strong>{formatCurrency(item.unitPrice)}</strong></div>
    <div className="bon-cart-price"><small>Subtotal</small><strong>{formatCurrency(item.subtotal)}</strong></div>
    <button className="icon-button" type="button" aria-label={`Hapus ${item.productName}`} onClick={() => onRemove(item.line.productId)}><Trash2 size={19} /></button>
  </article>;
}

function discountText(discounts: number[]) {
  return discounts.length ? discounts.map((value) => `${value}%`).join(" → ") : "-";
}
