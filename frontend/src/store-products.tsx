import { PackagePlus, Pencil, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ProductProfile } from "./acceptance-data";
import { formatCurrency } from "./data";
import { useAppStore } from "./store";

export function StoreProducts() {
  const { products, saveProduct, softDeleteProduct } = useAppStore();
  const [search, setSearch] = useState("");
  const visible = products.filter((item) => item.active && `${item.name} ${item.id} ${item.type}`.toLowerCase().includes(search.toLowerCase()));

  const editProduct = (product?: ProductProfile) => {
    const name = window.prompt("Nama produk", product?.name ?? "");
    if (!name?.trim()) return;
    const type = window.prompt("Tipe produk: LM atau BR", product?.type ?? "LM")?.toUpperCase();
    if (type !== "LM" && type !== "BR") return;
    const basePrice = Number(window.prompt("Harga Base", String(product?.basePrice ?? 0)));
    const costPrice = Number(window.prompt("Harga Modal", String(product?.costPrice ?? 0)));
    const stock = Number(window.prompt("Stok", String(product?.stock ?? 0)));
    if (![basePrice, costPrice, stock].every(Number.isFinite) || basePrice < 0 || costPrice < 0 || stock < 0) return;
    saveProduct({
      id: product?.id ?? `PRD-${String(products.length + 1).padStart(3, "0")}`,
      name: name.trim(),
      type,
      basePrice,
      costPrice,
      stock,
      active: true
    });
  };

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><ShoppingBag size={30} /></span>
        <div><span className="eyebrow">Data master</span><h2>Produk</h2><p>Perubahan produk tersimpan pada store bersama.</p></div>
        <button className="button button--primary" type="button" onClick={() => editProduct()}><PackagePlus size={20} />Tambah Produk</button>
      </header>
      <section className="acceptance-toolbar">
        <label className="search-box"><Search size={21} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk" /></label>
        <span>{visible.length} produk aktif</span>
      </section>
      <div className="acceptance-product-list">
        {visible.map((product) => (
          <article className="acceptance-product-card" key={product.id}>
            <span className="product-icon"><ShoppingBag size={24} /></span>
            <div><span className="eyebrow">{product.id}</span><h3>{product.name}</h3><span className={`status-badge status-badge--${product.type.toLowerCase()}`}>{product.type}</span><div className="acceptance-product-facts"><span>Harga Base <strong>{formatCurrency(product.basePrice)}</strong></span><span>Harga Modal <strong>{formatCurrency(product.costPrice)}</strong></span><span>Stok <strong>{product.stock}</strong></span></div></div>
            <div className="acceptance-product-actions"><button className="button button--secondary button--compact" type="button" onClick={() => editProduct(product)}><Pencil size={18} />Edit</button><button className="button button--danger button--compact" type="button" onClick={() => softDeleteProduct(product.id)}><Trash2 size={18} />Nonaktifkan</button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
