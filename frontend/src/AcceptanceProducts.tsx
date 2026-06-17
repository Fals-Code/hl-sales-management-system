import {
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  Pencil,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import { useState } from "react";
import { productProfiles, type ProductProfile } from "./acceptance-data";
import { formatCurrency } from "./data";

export function AcceptanceProductsPage() {
  const [products, setProducts] = useState(productProfiles);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; product?: ProductProfile } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductProfile | null>(null);

  const filtered = products.filter((product) => product.active && `${product.name} ${product.id} ${product.type}`.toLowerCase().includes(search.toLowerCase()));

  const saveProduct = (nextProduct: ProductProfile) => {
    setProducts((current) => {
      const exists = current.some((product) => product.id === nextProduct.id);
      return exists ? current.map((product) => product.id === nextProduct.id ? nextProduct : product) : [...current, nextProduct];
    });
    setEditor(null);
  };

  const softDelete = () => {
    if (!deleteTarget) return;
    setProducts((current) => current.map((product) => product.id === deleteTarget.id ? { ...product, active: false } : product));
    setDeleteTarget(null);
  };

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><ShoppingBag size={30} /></span>
        <div><span className="eyebrow">Data master</span><h2>Produk</h2><p>Harga Modal hanya digunakan untuk laba. Harga Base menjadi dasar diskon pelanggan.</p></div>
        <button className="button button--primary" type="button" onClick={() => setEditor({ mode: "create" })}><PackagePlus size={20} />Tambah Produk</button>
      </header>

      <section className="acceptance-toolbar">
        <label className="search-box"><Search size={21} /><span className="sr-only">Cari produk</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, kode, atau tipe produk" /></label>
        <span>{filtered.length} produk aktif</span>
      </section>

      {filtered.length === 0 ? (
        <section className="acceptance-empty"><ShoppingBag size={38} /><h3>Produk tidak ditemukan</h3><p>Periksa pencarian atau tambahkan produk baru.</p><button className="button button--primary" type="button" onClick={() => setEditor({ mode: "create" })}>Tambah Produk</button></section>
      ) : (
        <div className="acceptance-product-list">
          {filtered.map((product) => (
            <article className="acceptance-product-card" key={product.id}>
              <span className="product-icon"><ShoppingBag size={24} /></span>
              <div><span className="eyebrow">{product.id}</span><h3>{product.name}</h3><span className={`status-badge status-badge--${product.type.toLowerCase()}`}>{product.type}</span><div className="acceptance-product-facts"><span>Harga Base <strong>{formatCurrency(product.basePrice)}</strong></span><span>Harga Modal <strong>{formatCurrency(product.costPrice)}</strong></span><span>Stok <strong>{product.stock}</strong></span></div></div>
              <div className="acceptance-product-actions"><button className="button button--secondary button--compact" type="button" onClick={() => setEditor({ mode: "edit", product })}><Pencil size={18} />Edit</button><button className="button button--danger button--compact" type="button" onClick={() => setDeleteTarget(product)}><Trash2 size={18} />Nonaktifkan</button></div>
            </article>
          ))}
        </div>
      )}

      {editor && <ProductEditor key={`${editor.mode}-${editor.product?.id ?? "new"}`} mode={editor.mode} product={editor.product} onClose={() => setEditor(null)} onSave={saveProduct} />}
      <DeleteProductDialog product={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={softDelete} />
    </section>
  );
}

function ProductEditor({ mode, product, onClose, onSave }: { mode: "create" | "edit"; product?: ProductProfile; onClose: () => void; onSave: (product: ProductProfile) => void }) {
  const initial = product ?? { id: `PRD-${String(productProfiles.length + 1).padStart(3, "0")}`, name: "", type: "LM" as const, stock: 0, costPrice: 0, basePrice: 0, active: true };
  const [draft, setDraft] = useState<ProductProfile>(initial);
  const [saved, setSaved] = useState(false);
  const canSave = draft.name.trim().length > 0 && draft.costPrice >= 0 && draft.basePrice >= 0 && draft.stock >= 0;

  const save = () => {
    if (!canSave) return;
    setSaved(true);
    window.setTimeout(() => onSave({ ...draft, name: draft.name.trim() }), 500);
  };

  return (
    <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="acceptance-master-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">Data produk</span><h2>{mode === "create" ? "Tambah Produk" : "Edit Produk"}</h2><p>Tipe hanya LM atau BR. Semua harga menggunakan Rupiah.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header>
        {saved ? <div className="acceptance-dialog-success"><CheckCircle2 size={45} /><h3>Data produk disimpan</h3><p>Perubahan siap dikirim ke API saat fase integrasi.</p></div> : <><div className="acceptance-master-body"><div className="acceptance-form-grid"><label className="field field--wide"><span>Nama produk *</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nama produk" /></label><label className="field"><span>Kode produk</span><input value={draft.id} disabled={mode === "edit"} onChange={(event) => setDraft({ ...draft, id: event.target.value.toUpperCase() })} /></label><label className="field"><span>Tipe *</span><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as "LM" | "BR" })}><option value="LM">LM</option><option value="BR">BR</option></select></label><label className="field"><span>Harga Modal *</span><input inputMode="numeric" value={draft.costPrice} onChange={(event) => setDraft({ ...draft, costPrice: Math.max(0, Number(event.target.value) || 0) })} /><small>{formatCurrency(draft.costPrice)}</small></label><label className="field"><span>Harga Base/Jual *</span><input inputMode="numeric" value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: Math.max(0, Number(event.target.value) || 0) })} /><small>{formatCurrency(draft.basePrice)}</small></label><label className="field"><span>Stok</span><input type="number" min={0} value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Math.max(0, Number(event.target.value) || 0) })} /></label></div><div className="acceptance-info-box"><AlertTriangle size={20} /><span>Harga Modal tidak ditampilkan sebagai harga pelanggan. Nilai ini hanya dipakai untuk menghitung laba.</span></div></div><footer><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--primary" type="button" disabled={!canSave} onClick={save}><Save size={20} />Simpan Produk</button></footer></>}
      </section>
    </div>
  );
}

function DeleteProductDialog({ product, onClose, onConfirm }: { product: ProductProfile | null; onClose: () => void; onConfirm: () => void }) {
  if (!product) return null;
  return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><AlertTriangle size={36} /><h2>Nonaktifkan produk?</h2><p>{product.name} akan disembunyikan dari Bon baru. Riwayat transaksi lama tetap utuh.</p><div><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--danger" type="button" onClick={onConfirm}>Ya, Nonaktifkan</button></div></section></div>;
}
