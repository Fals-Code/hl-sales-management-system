import { AlertTriangle, PackagePlus, Pencil, Save, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useApi } from "./api-client";
import { formatCurrency } from "./data";
import { RupiahInput } from "./rupiah-input";
import { useAppStore, type StoredProduct } from "./store";
import { productResourceApi, type ProductWriteInput } from "./write-resources";

export function StoreProducts() {
  const { products, saveProduct, softDeleteProduct, refreshFromApi } = useAppStore();
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<StoredProduct | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoredProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const visible = products.filter((item) => item.active && `${item.name} ${item.id} ${item.type}`.toLowerCase().includes(search.toLowerCase()));

  const persist = async (product: StoredProduct) => {
    setSaving(true);
    setOperationError(null);
    try {
      if (useApi) {
        const payload = toProductPayload(product);
        if (product.backendId) {
          const { sku: _sku, type: _type, ...updatePayload } = payload;
          await productResourceApi.update(product.backendId, updatePayload);
        } else {
          await productResourceApi.create(payload);
        }
        await refreshFromApi();
      } else {
        saveProduct(product);
      }
      setEditor(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Produk gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: StoredProduct) => {
    setSaving(true);
    setOperationError(null);
    try {
      if (useApi) {
        if (!product.backendId) throw new Error("ID backend produk tidak tersedia.");
        await productResourceApi.remove(product.backendId);
        await refreshFromApi();
      } else {
        softDeleteProduct(product.id);
      }
      setDeleteTarget(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Produk gagal dinonaktifkan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header"><span className="acceptance-page-icon"><ShoppingBag size={30} /></span><div><span className="eyebrow">Data master</span><h2>Produk</h2><p>Perubahan produk tersimpan pada backend dan riwayat Bon tetap memakai snapshot.</p></div><button className="button button--primary" type="button" onClick={() => setEditor("new")}><PackagePlus size={20} />Tambah Produk</button></header>
      {operationError && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{operationError}</span></div>}
      <section className="acceptance-toolbar"><label className="search-box"><Search size={21} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk" /></label><span>{visible.length} produk aktif</span></section>
      <div className="acceptance-product-list">{visible.map((product) => <article className="acceptance-product-card" key={product.id}><span className="product-icon"><ShoppingBag size={24} /></span><div><span className="eyebrow">{product.id}</span><h3>{product.name}</h3><span className={`status-badge status-badge--${product.type.toLowerCase()}`}>{product.type}</span><div className="acceptance-product-facts"><span>Harga Base <strong>{formatCurrency(product.basePrice)}</strong></span><span>Harga Modal <strong>{formatCurrency(product.costPrice)}</strong></span><span>Stok <strong>{product.stock}</strong></span></div></div><div className="acceptance-product-actions"><button className="button button--secondary button--compact" type="button" onClick={() => setEditor(product)}><Pencil size={18} />Edit</button><button className="button button--danger button--compact" type="button" onClick={() => setDeleteTarget(product)}><Trash2 size={18} />Nonaktifkan</button></div></article>)}</div>
      {editor && <ProductEditor value={editor === "new" ? undefined : editor} nextId={`PRD-${String(products.length + 1).padStart(3, "0")}`} saving={saving} onClose={() => setEditor(null)} onSave={persist} />}
      {deleteTarget && <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}><section className="acceptance-confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><AlertTriangle size={36} /><h2>Nonaktifkan produk?</h2><p>{deleteTarget.name} tidak lagi muncul pada transaksi baru. Snapshot pada Bon lama tetap utuh.</p><div><button className="button button--secondary" type="button" disabled={saving} onClick={() => setDeleteTarget(null)}>Batal</button><button className="button button--danger" type="button" disabled={saving} onClick={() => { void remove(deleteTarget); }}>{saving ? "Memproses..." : "Nonaktifkan"}</button></div></section></div>}
    </section>
  );
}

function toProductPayload(product: StoredProduct): ProductWriteInput {
  return { sku: product.id, name: product.name.trim(), type: product.type, stock: product.stock, costPrice: product.costPrice, basePrice: product.basePrice };
}

function ProductEditor({ value, nextId, saving, onClose, onSave }: { value?: StoredProduct; nextId: string; saving: boolean; onClose: () => void; onSave: (product: StoredProduct) => Promise<void> }) {
  const [draft, setDraft] = useState<StoredProduct>(value ?? { id: nextId, name: "", type: "LM", basePrice: 0, costPrice: 0, stock: 0, active: true });
  const valid = draft.name.trim().length > 0 && [draft.basePrice, draft.costPrice, draft.stock].every((amount) => Number.isFinite(amount) && amount >= 0);
  return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-master-dialog acceptance-master-dialog--small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">Data produk</span><h2>{value ? "Edit Produk" : "Tambah Produk"}</h2><p>Harga Modal tidak ditampilkan kepada pelanggan.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header><div className="acceptance-master-body"><div className="acceptance-form-grid"><label className="field field--wide"><span>Nama produk *</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label className="field"><span>Kode</span><input value={draft.id} disabled /></label><label className="field"><span>Tipe *</span><select value={draft.type} disabled={Boolean(value)} onChange={(event) => setDraft({ ...draft, type: event.target.value as "LM" | "BR" })}><option value="LM">LM</option><option value="BR">BR</option></select><small>{value ? "Tipe dikunci agar klasifikasi riwayat tetap konsisten." : "Pilih klasifikasi produk."}</small></label><label className="field"><span>Harga Base *</span><RupiahInput aria-label="Harga Base" value={draft.basePrice} onValueChange={(basePrice) => setDraft({ ...draft, basePrice })} /></label><label className="field"><span>Harga Modal *</span><RupiahInput aria-label="Harga Modal" value={draft.costPrice} onValueChange={(costPrice) => setDraft({ ...draft, costPrice })} /></label><label className="field"><span>Stok *</span><input type="number" min={0} step={1} value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /></label></div></div><footer><button className="button button--secondary" type="button" disabled={saving} onClick={onClose}>Batal</button><button className="button button--primary" type="button" disabled={!valid || saving} onClick={() => { void onSave({ ...draft, name: draft.name.trim() }); }}><Save size={19} />{saving ? "Menyimpan..." : "Simpan Produk"}</button></footer></section></div>;
}
