import { AlertTriangle, CheckCircle2, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AcceptanceBonLine } from "./acceptance-data";
import { currentIsoDate, generateNextBonNumber } from "./acceptance-data";
import { ApiClientError, bonApi, useApi } from "./api-client";
import { isValidBonNumber, normalizeBonNumber } from "./bon-number";
import { formatCurrency } from "./data";
import { AppStoreError, useAppStore } from "./store";

type Mode = "normal" | "bonus";

export function StoreBonDialog({
  open,
  onClose,
  prefillCustomerCode,
  initialMode = "normal"
}: {
  open: boolean;
  onClose: () => void;
  prefillCustomerCode?: string | null;
  initialMode?: Mode;
}) {
  const { customers, products, bons, createBon } = useAppStore();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [date, setDate] = useState(currentIsoDate());
  const [number, setNumber] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [description, setDescription] = useState("");
  const [shipping, setShipping] = useState(0);
  const [lines, setLines] = useState<AcceptanceBonLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCustomers = customers.filter((item) => item.active);
  const activeProducts = products.filter((item) => item.active);

  useEffect(() => {
    if (!open) return;
    const today = currentIsoDate();
    setMode(initialMode);
    setDate(today);
    setNumber(generateNextBonNumber(initialMode, today));
    setCustomerCode(prefillCustomerCode ?? activeCustomers[0]?.code ?? "");
    setDescription("");
    setShipping(0);
    setLines(activeProducts[0] ? [{ productId: activeProducts[0].id, quantity: 1 }] : []);
    setSaved(null);
    setError(null);
  }, [open, prefillCustomerCode, initialMode]);

  const customer = customers.find((item) => item.code === customerCode);
  const calculation = useMemo(() => {
    const details = lines.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product || !customer) return { omzet: 0, profit: 0 };
      const discounts = product.type === "LM" ? customer.discountLm : customer.discountBr;
      const discounted = mode === "bonus"
        ? 0
        : roundHundred(discounts.reduce(
            (value, discount) => Math.floor(value * (100 - discount) / 100),
            product.basePrice
          ));
      return {
        omzet: discounted * line.quantity,
        profit: mode === "bonus" ? 0 : (discounted - product.costPrice) * line.quantity
      };
    });
    const omzet = details.reduce((sum, item) => sum + item.omzet, 0);
    const profit = details.reduce((sum, item) => sum + item.profit, 0);
    return { omzet, profit, total: mode === "bonus" ? 0 : omzet + roundHundred(shipping) };
  }, [lines, products, customer, mode, shipping]);

  if (!open) return null;
  const normalizedNumber = normalizeBonNumber(number);
  const duplicate = bons.some((item) => normalizeBonNumber(item.number) === normalizedNumber);
  const valid = isValidBonNumber(number)
    && !duplicate
    && Boolean(customer)
    && lines.length > 0
    && lines.every((line) => line.quantity >= 1);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const draft = {
      number: normalizedNumber,
      date,
      customerCode,
      description,
      status: mode === "bonus" ? "Bonus" as const : "Piutang" as const,
      shipping: mode === "bonus" ? 0 : roundHundred(shipping),
      isBonus: mode === "bonus",
      lines
    };
    try {
      if (useApi) {
        const payload = {
          bonNumber: draft.number,
          bonDate: draft.date,
          customerId: draft.customerCode,
          description: draft.description,
          shippingCost: draft.shipping,
          items: draft.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            kind: mode === "bonus" ? "BONUS" : "REGULER"
          }))
        };
        const availability = await bonApi.validateNumber(draft.number);
        if (!availability.available) {
          throw new ApiClientError("DUPLICATE_VALUE", "Nomor Bon sudah digunakan.");
        }
        await bonApi.create(payload);
      }
      createBon(draft);
      setSaved(draft.number);
    } catch (caught) {
      const known = caught instanceof ApiClientError || caught instanceof AppStoreError;
      setError(known ? caught.message : "Bon gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const updateLine = (index: number, changes: Partial<AcceptanceBonLine>) => {
    setLines((current) => current.map((item, position) => (
      position === index ? { ...item, ...changes } : item
    )));
  };

  return (
    <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="acceptance-bon-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        {saved ? (
          <div className="acceptance-success-state">
            <CheckCircle2 size={44} />
            <h2>{saved}</h2>
            <p>Bon berhasil disimpan pada data bersama.</p>
            <button className="button button--primary" type="button" onClick={onClose}>Selesai</button>
          </div>
        ) : (
          <>
            <header className="acceptance-dialog-header">
              <div>
                <span className="eyebrow">Transaksi baru</span>
                <h2>Buat {mode === "bonus" ? "Bonus Bon" : "Bon"}</h2>
                <p>Harga, modal, dan diskon dikunci sebagai snapshot saat disimpan.</p>
              </div>
              <button className="icon-button" type="button" onClick={onClose}><X size={24} /></button>
            </header>

            <div className="acceptance-dialog-body">
              <section className="acceptance-form-section">
                <div className="bon-mode-grid">
                  <button className={`bon-mode-card ${mode === "normal" ? "is-selected" : ""}`} type="button" onClick={() => setMode("normal")}><ReceiptText size={24} /><strong>Penjualan Normal</strong></button>
                  <button className={`bon-mode-card ${mode === "bonus" ? "is-selected" : ""}`} type="button" onClick={() => setMode("bonus")}><ReceiptText size={24} /><strong>Bonus Bon</strong></button>
                </div>

                <div className="acceptance-form-grid">
                  <label className="field"><span>Tanggal *</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
                  <label className="field"><span>Nomor Bon *</span><input value={number} onChange={(event) => setNumber(event.target.value.toUpperCase())} />{duplicate && <small className="field-error">Nomor Bon sudah digunakan.</small>}</label>
                  <label className="field field--wide"><span>Pelanggan *</span><select value={customerCode} onChange={(event) => setCustomerCode(event.target.value)}>{activeCustomers.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
                  <label className="field field--wide"><span>Deskripsi</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
                </div>

                <div className="acceptance-line-list">
                  {lines.map((line, index) => (
                    <article className="acceptance-line-card" key={`${line.productId}-${index}`}>
                      <label className="field">
                        <span>Produk</span>
                        <select value={line.productId} onChange={(event) => updateLine(index, { productId: event.target.value })}>
                          {activeProducts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type}</option>)}
                        </select>
                      </label>
                      <label className="field"><span>Jumlah</span><input type="number" min={1} value={line.quantity} onChange={(event) => updateLine(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
                      <button className="icon-button" type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, position) => position !== index))}><Trash2 size={20} /></button>
                    </article>
                  ))}
                </div>

                <button className="button button--secondary" type="button" onClick={() => activeProducts[0] && setLines((current) => [...current, { productId: activeProducts[0].id, quantity: 1 }])}><Plus size={20} />Tambah Produk</button>
                {mode === "normal" && <label className="field"><span>Ongkir</span><input inputMode="numeric" value={shipping} onChange={(event) => setShipping(Math.max(0, Number(event.target.value) || 0))} /></label>}
                <div className="acceptance-total"><span>Total {mode === "bonus" ? "Tagihan" : "Piutang"}</span><strong>{formatCurrency(calculation.total)}</strong></div>
                {calculation.profit < 0 && <div className="acceptance-warning"><AlertTriangle size={20} /><span>Transaksi memiliki laba negatif dan memerlukan otorisasi Owner pada mode API.</span></div>}
                {error && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{error}</span></div>}
              </section>
            </div>

            <footer className="acceptance-dialog-footer">
              <span>{valid ? "Data siap disimpan." : "Lengkapi data dan gunakan Nomor Bon yang valid."}</span>
              <div className="acceptance-footer-buttons">
                <button className="button button--secondary" type="button" onClick={onClose}>Batal</button>
                <button className="button button--primary" type="button" disabled={!valid || saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan Bon"}</button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

const roundHundred = (value: number) => Math.floor((value + 50) / 100) * 100;
