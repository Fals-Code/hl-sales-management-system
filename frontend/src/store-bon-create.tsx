import { AlertTriangle, ArrowLeft, CheckCircle2, PackagePlus, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AcceptanceBonLine } from "./acceptance-data";
import { currentIsoDate, generateNextBonNumber } from "./acceptance-data";
import { ApiClientError, bonApi, bonusBonApi, useApi } from "./api-client";
import { isValidBonNumber, normalizeBonNumber } from "./bon-number";
import { formatCurrency } from "./data";
import { AppStoreError, useAppStore, type StoredBon } from "./store";

type Mode = "normal" | "bonus";
type ApiBon = { id: string; bonNumber: string };

type LineCalculation = {
  line: AcceptanceBonLine;
  productName: string;
  productType: string;
  stock: number;
  unitPrice: number;
  subtotal: number;
  profit: number;
  invalidStock: boolean;
};

export function StoreBonCreatePage({
  prefillCustomerCode,
  initialMode = "normal",
  onCancel,
  onViewBon
}: {
  prefillCustomerCode?: string | null;
  initialMode?: Mode;
  onCancel: () => void;
  onViewBon: (bonNumber: string) => void;
}) {
  const { customers, products, bons, createBon, refreshFromApi } = useAppStore();
  const activeCustomers = useMemo(() => customers.filter((item) => item.active), [customers]);
  const activeProducts = useMemo(() => products.filter((item) => item.active), [products]);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [date, setDate] = useState(currentIsoDate());
  const [number, setNumber] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [description, setDescription] = useState("");
  const [shipping, setShipping] = useState(0);
  const [lines, setLines] = useState<AcceptanceBonLine[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [negativeProfitReason, setNegativeProfitReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<ApiBon | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = currentIsoDate();
    setMode(initialMode);
    setDate(today);
    setNumber(generateNextBonNumber(initialMode, today));
    setCustomerCode(prefillCustomerCode ?? activeCustomers[0]?.code ?? "");
    setDescription("");
    setShipping(0);
    setLines([]);
    setProductSearch("");
    setOwnerPin("");
    setNegativeProfitReason("");
    setSaved(null);
    setError(null);
  }, [initialMode, prefillCustomerCode]);

  const customer = customers.find((item) => item.code === customerCode);
  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return activeProducts;
    return activeProducts.filter((product) => `${product.name} ${product.id} ${product.type}`.toLowerCase().includes(query));
  }, [activeProducts, productSearch]);

  const lineCalculations = useMemo<LineCalculation[]>(() => lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product || !customer) {
      return { line, productName: "Produk tidak ditemukan", productType: "-", stock: 0, unitPrice: 0, subtotal: 0, profit: 0, invalidStock: true };
    }
    const discounts = product.type === "LM" ? customer.discountLm : customer.discountBr;
    const unitPrice = mode === "bonus"
      ? 0
      : roundHundred(discounts.reduce((value, discount) => Math.floor(value * (100 - discount) / 100), product.basePrice));
    return {
      line,
      productName: product.name,
      productType: product.type,
      stock: product.stock,
      unitPrice,
      subtotal: unitPrice * line.quantity,
      profit: mode === "bonus" ? 0 : (unitPrice - product.costPrice) * line.quantity,
      invalidStock: line.quantity > product.stock || product.stock <= 0
    };
  }), [lines, products, customer, mode]);

  const calculation = useMemo(() => {
    const omzet = lineCalculations.reduce((sum, item) => sum + item.subtotal, 0);
    const profit = lineCalculations.reduce((sum, item) => sum + item.profit, 0);
    const shippingAmount = mode === "bonus" ? 0 : roundHundred(shipping);
    return {
      omzet,
      profit,
      shipping: shippingAmount,
      total: mode === "bonus" ? 0 : omzet + shippingAmount,
      quantity: lines.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [lineCalculations, mode, shipping, lines]);

  const normalizedNumber = normalizeBonNumber(number);
  const duplicate = bons.some((item) => normalizeBonNumber(item.number) === normalizedNumber);
  const needsApproval = calculation.profit < 0;
  const approvalValid = !needsApproval || (ownerPin.length >= 4 && negativeProfitReason.trim().length >= 8);
  const stockValid = lineCalculations.every((item) => !item.invalidStock);
  const valid = isValidBonNumber(number)
    && !duplicate
    && Boolean(customer)
    && lines.length > 0
    && lines.every((line) => Number.isSafeInteger(line.quantity) && line.quantity >= 1)
    && stockValid
    && approvalValid;

  const addProduct = (productId: string) => {
    const product = activeProducts.find((item) => item.id === productId);
    if (!product || product.stock <= 0) return;
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (!existing) return [...current, { productId, quantity: 1 }];
      if (existing.quantity >= product.stock) return current;
      return current.map((line) => line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setLines((current) => current.map((line) => line.productId === productId
      ? { ...line, quantity: Math.max(1, Math.floor(quantity || 1)) }
      : line));
  };

  const resetForNextBon = () => {
    const today = currentIsoDate();
    setDate(today);
    setNumber(generateNextBonNumber(mode, today));
    setDescription("");
    setShipping(0);
    setLines([]);
    setOwnerPin("");
    setNegativeProfitReason("");
    setSaved(null);
    setError(null);
  };

  const save = async () => {
    if (!valid || !customer) return;
    setSaving(true);
    setError(null);
    const draft: StoredBon = {
      number: normalizedNumber,
      date,
      customerCode,
      description: description.trim(),
      status: mode === "bonus" ? "Bonus" : "Piutang",
      shipping: mode === "bonus" ? 0 : roundHundred(shipping),
      isBonus: mode === "bonus",
      lines
    };
    try {
      if (useApi) {
        if (!customer.backendId) throw new AppStoreError("MISSING_API_ID", "Data pelanggan belum disinkronkan dengan API.");
        const apiItems = draft.lines.map((line) => {
          const product = products.find((item) => item.id === line.productId);
          if (!product?.backendId) throw new AppStoreError("MISSING_API_ID", "Satu atau lebih produk belum disinkronkan dengan API.");
          return { productId: product.backendId, quantity: line.quantity, kind: mode === "bonus" ? "BONUS" : "REGULER" };
        });
        const commonPayload = {
          bonNumber: draft.number,
          bonDate: `${draft.date}T00:00:00.000Z`,
          customerId: customer.backendId,
          description: draft.description,
          items: apiItems
        };
        const created = mode === "bonus"
          ? await bonusBonApi.create<ApiBon>(commonPayload)
          : await bonApi.create<ApiBon>({
              ...commonPayload,
              shippingCost: draft.shipping,
              ownerPin: needsApproval ? ownerPin : undefined,
              negativeProfitReason: needsApproval ? negativeProfitReason.trim() : undefined
            });
        await refreshFromApi();
        setSaved(created);
      } else {
        createBon(draft);
        setSaved({ id: draft.number, bonNumber: draft.number });
      }
    } catch (caught) {
      const known = caught instanceof ApiClientError || caught instanceof AppStoreError;
      setError(known ? caught.message : "Bon gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <section className="bon-create-page bon-create-success">
        <span className="bon-create-success-icon"><CheckCircle2 size={42} /></span>
        <span className="eyebrow">Transaksi tersimpan</span>
        <h2>{saved.bonNumber}</h2>
        <p>Bon sudah tersimpan dan data aplikasi telah dimuat ulang.</p>
        <div className="bon-create-success-actions">
          <button className="button button--secondary" type="button" onClick={onCancel}>Kembali ke Daftar Bon</button>
          <button className="button button--secondary" type="button" onClick={resetForNextBon}>Buat Bon Baru</button>
          <button className="button button--primary" type="button" onClick={() => onViewBon(saved.bonNumber)}>Lihat Detail Bon</button>
        </div>
      </section>
    );
  }

  return (
    <section className="bon-create-page">
      <header className="bon-create-header">
        <button className="button button--secondary button--compact" type="button" onClick={onCancel}><ArrowLeft size={18} />Kembali</button>
        <div><span className="eyebrow">Transaksi baru</span><h2>Buat {mode === "bonus" ? "Bonus Bon" : "Bon"}</h2><p>Pilih pelanggan dan produk, lalu periksa ringkasan sebelum menyimpan.</p></div>
      </header>

      {(!activeCustomers.length || !activeProducts.length) && <div className="acceptance-warning"><AlertTriangle size={20} /><span>Tambahkan pelanggan dan produk aktif sebelum membuat Bon.</span></div>}
      {error && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{error}</span></div>}

      <div className="bon-pos-layout">
        <div className="bon-pos-main">
          <section className="acceptance-card bon-create-card">
            <div className="acceptance-card-heading"><div><span className="eyebrow">Informasi Bon</span><h3>Data transaksi</h3></div><ReceiptText size={24} /></div>
            <div className="bon-mode-grid bon-mode-grid--page">
              <button className={`bon-mode-card ${mode === "normal" ? "is-selected" : ""}`} type="button" aria-pressed={mode === "normal"} onClick={() => { setMode("normal"); setNumber(generateNextBonNumber("normal", date)); }}><ReceiptText size={23} /><span><strong>Penjualan Normal</strong><small>Membentuk Piutang dan dapat dilunasi.</small></span></button>
              <button className={`bon-mode-card ${mode === "bonus" ? "is-selected" : ""}`} type="button" aria-pressed={mode === "bonus"} onClick={() => { setMode("bonus"); setNumber(generateNextBonNumber("bonus", date)); setShipping(0); }}><ReceiptText size={23} /><span><strong>Bonus Bon</strong><small>Tidak menambah omzet maupun laba.</small></span></button>
            </div>
            <div className="acceptance-form-grid bon-create-meta-grid">
              <label className="field"><span>Tanggal *</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setNumber(generateNextBonNumber(mode, event.target.value)); }} /></label>
              <label className="field"><span>Nomor Bon *</span><input value={number} onChange={(event) => setNumber(event.target.value.toUpperCase())} />{duplicate && <small className="field-error">Nomor Bon sudah digunakan.</small>}{number && !isValidBonNumber(number) && <small className="field-error">Format Nomor Bon tidak valid.</small>}</label>
              <label className="field field--wide"><span>Pelanggan *</span><select value={customerCode} onChange={(event) => setCustomerCode(event.target.value)}><option value="">Pilih pelanggan</option>{activeCustomers.map((item) => <option key={item.code} value={item.code}>{item.name} · {item.code}</option>)}</select></label>
              <label className="field field--wide"><span>Deskripsi</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Catatan transaksi atau keterangan Bon" /></label>
            </div>
          </section>

          <section className="acceptance-card bon-create-card">
            <div className="acceptance-card-heading"><div><span className="eyebrow">Katalog produk</span><h3>Tambah produk</h3></div><span>{visibleProducts.length} tersedia</span></div>
            <label className="search-box bon-product-search"><Search size={20} /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Cari nama, kode, atau tipe produk" /></label>
            <div className="bon-product-catalog">
              {visibleProducts.map((product) => {
                const selectedQuantity = lines.find((line) => line.productId === product.id)?.quantity ?? 0;
                const disabled = product.stock <= 0 || selectedQuantity >= product.stock;
                return <article className={`bon-product-option ${product.stock <= 0 ? "is-empty" : ""}`} key={product.id}><div><span className={`status-badge status-badge--${product.type.toLowerCase()}`}>{product.type}</span><strong>{product.name}</strong><small>{product.id} · Stok {product.stock}</small></div><div><strong>{formatCurrency(product.basePrice)}</strong><button className="button button--secondary button--compact" type="button" disabled={disabled} onClick={() => addProduct(product.id)}><Plus size={17} />{product.stock <= 0 ? "Habis" : "Tambah"}</button></div></article>;
              })}
              {!visibleProducts.length && <div className="acceptance-empty-state"><PackagePlus size={30} /><strong>Produk tidak ditemukan</strong><span>Ubah kata pencarian atau tambahkan produk baru.</span></div>}
            </div>
          </section>

          <section className="acceptance-card bon-create-card">
            <div className="acceptance-card-heading"><div><span className="eyebrow">Rincian transaksi</span><h3>Produk dalam Bon</h3></div><span>{lines.length} produk · {calculation.quantity} unit</span></div>
            {!lines.length ? <div className="acceptance-empty-state"><PackagePlus size={32} /><strong>Belum ada produk</strong><span>Pilih produk dari katalog di atas.</span></div> : <div className="bon-cart-list">{lineCalculations.map((item) => <article className={`bon-cart-row ${item.invalidStock ? "has-error" : ""}`} key={item.line.productId}><div className="bon-cart-product"><span className={`status-badge status-badge--${item.productType.toLowerCase()}`}>{item.productType}</span><span><strong>{item.productName}</strong><small>Stok tersedia {item.stock}</small></span></div><label className="field"><span>Jumlah</span><input type="number" min={1} max={item.stock} value={item.line.quantity} onChange={(event) => updateQuantity(item.line.productId, Number(event.target.value))} />{item.invalidStock && <small className="field-error">Jumlah melebihi stok.</small>}</label><div className="bon-cart-price"><small>Harga akhir</small><strong>{formatCurrency(item.unitPrice)}</strong></div><div className="bon-cart-price"><small>Subtotal</small><strong>{formatCurrency(item.subtotal)}</strong></div><button className="icon-button" type="button" aria-label={`Hapus ${item.productName}`} onClick={() => setLines((current) => current.filter((line) => line.productId !== item.line.productId))}><Trash2 size={19} /></button></article>)}</div>}
          </section>
        </div>

        <aside className="bon-pos-summary">
          <section className="acceptance-card bon-summary-card">
            <div className="acceptance-card-heading"><div><span className="eyebrow">Review</span><h3>Ringkasan Bon</h3></div><ReceiptText size={23} /></div>
            <dl className="bon-summary-list">
              <div><dt>Pelanggan</dt><dd>{customer?.name ?? "Belum dipilih"}</dd></div>
              <div><dt>Total unit</dt><dd>{calculation.quantity}</dd></div>
              <div><dt>Subtotal produk</dt><dd>{formatCurrency(calculation.omzet)}</dd></div>
              {mode === "normal" && <div className="bon-summary-shipping"><dt>Ongkir</dt><dd><input aria-label="Ongkir" type="number" min={0} value={shipping} onChange={(event) => setShipping(Math.max(0, Number(event.target.value) || 0))} /></dd></div>}
            </dl>
            <div className="bon-summary-total"><span>Total {mode === "bonus" ? "Tagihan" : "Piutang"}</span><strong>{formatCurrency(calculation.total)}</strong></div>

            {needsApproval && <section className="negative-profit-card bon-summary-approval"><div><AlertTriangle size={22} /><span><strong>Laba transaksi negatif</strong><small>Memerlukan otorisasi Owner.</small></span></div><label className="field"><span>PIN Owner *</span><input type="password" inputMode="numeric" value={ownerPin} onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label className="field"><span>Alasan *</span><textarea rows={3} value={negativeProfitReason} onChange={(event) => setNegativeProfitReason(event.target.value)} /></label></section>}

            {!stockValid && <div className="bon-inline-error"><AlertTriangle size={18} /><span>Periksa jumlah produk dan stok tersedia.</span></div>}
            <p className="bon-summary-hint">{valid ? "Data siap disimpan." : "Lengkapi data dan perbaiki validasi sebelum menyimpan."}</p>
            <div className="bon-summary-actions"><button className="button button--secondary" type="button" disabled={saving} onClick={onCancel}>Batal</button><button className="button button--primary" type="button" disabled={!valid || saving} onClick={() => { void save(); }}>{saving ? "Menyimpan..." : "Simpan Bon"}</button></div>
          </section>
        </aside>
      </div>
    </section>
  );
}

const roundHundred = (value: number) => Math.floor((value + 50) / 100) * 100;
