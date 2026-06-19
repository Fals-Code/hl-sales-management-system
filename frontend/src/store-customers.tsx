import { AlertTriangle, ArrowLeft, BadgePercent, ChevronRight, Pencil, Plus, Save, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";
import { calculateBon, currentIsoDate, effectiveDiscount, type CustomerProfile } from "./acceptance-data";
import { useApi } from "./api-client";
import { formatCurrency } from "./data";
import { useAppStore, type StoredCustomer } from "./store";
import { customerResourceApi, type CustomerWriteInput } from "./write-resources";

export function StoreCustomers({ onCreateBon, onSettlement, onViewBon }: { onCreateBon: (customerCode?: string) => void; onSettlement: (customerCode?: string) => void; onViewBon: (bonNumber: string) => void }) {
  const { customers, bons, saveCustomer, softDeleteCustomer, refreshFromApi } = useAppStore();
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [editor, setEditor] = useState<StoredCustomer | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoredCustomer | null>(null);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const active = customers.filter((customer) => customer.active);
  const visible = active.filter((customer) => `${customer.name} ${customer.code}`.toLowerCase().includes(search.toLowerCase()));
  const selected = customers.find((customer) => customer.code === selectedCode) ?? null;

  const save = async (next: StoredCustomer) => {
    const previous = customers.find((customer) => customer.code === next.code);
    const thresholdHistory = previous && previous.bonusThreshold !== next.bonusThreshold
      ? [...previous.thresholdHistory, { date: currentIsoDate(), previousAmount: previous.bonusThreshold, newAmount: next.bonusThreshold, note: "Diubah melalui form pelanggan" }]
      : next.thresholdHistory;
    const prepared = { ...next, name: next.name.trim(), thresholdHistory };

    setSaving(true);
    setOperationError(null);
    try {
      if (useApi) {
        const payload = toCustomerPayload(prepared);
        if (prepared.backendId) {
          const { code: _code, ...updatePayload } = payload;
          await customerResourceApi.update(prepared.backendId, updatePayload);
        } else {
          await customerResourceApi.create(payload);
        }
        await refreshFromApi();
      } else {
        saveCustomer(prepared);
      }
      setEditor(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Data pelanggan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (customer: StoredCustomer) => {
    setSaving(true);
    setOperationError(null);
    try {
      if (useApi) {
        if (!customer.backendId) throw new Error("ID backend pelanggan tidak tersedia.");
        await customerResourceApi.remove(customer.backendId);
        await refreshFromApi();
      } else {
        softDeleteCustomer(customer.code);
      }
      setDeleteTarget(null);
      setSelectedCode(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Pelanggan gagal dinonaktifkan.");
    } finally {
      setSaving(false);
    }
  };

  if (selected) {
    const customerBons = bons.filter((bon) => !bon.deletedAt && bon.customerCode === selected.code);
    const receivable = customerBons.filter((bon) => bon.status === "Piutang" && !bon.isBonus).reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
    return <section className="acceptance-page">
      <button className="back-button" type="button" onClick={() => setSelectedCode(null)}><ArrowLeft size={20} />Kembali ke daftar pelanggan</button>
      <header className="acceptance-customer-hero"><div className="customer-hero-copy"><span className="customer-avatar customer-avatar--large">{selected.name.slice(0, 2).toUpperCase()}</span><div><span className="eyebrow">{selected.code}</span><h2>{selected.name}</h2><p>{selected.address} · {selected.phone}</p></div></div><div className="customer-hero-actions"><button className="button button--secondary" type="button" onClick={() => setEditor(selected)}><Pencil size={19} />Edit</button><button className="button button--secondary" type="button" onClick={() => onSettlement(selected.code)}>Pelunasan</button><button className="button button--primary" type="button" onClick={() => onCreateBon(selected.code)}><Plus size={19} />Buat Bon</button><button className="button button--danger" type="button" onClick={() => setDeleteTarget(selected)}><Trash2 size={19} />Nonaktifkan</button></div></header>
      {operationError && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{operationError}</span></div>}
      <div className="acceptance-stat-grid"><Stat label="Total Piutang" value={formatCurrency(receivable)} /><Stat label="Omzet Lunas" value={formatCurrency(selected.accumulatedPaidOmzet)} /><Stat label="Threshold Bonus" value={formatCurrency(selected.bonusThreshold)} /><Stat label="Jumlah Bon" value={`${customerBons.length} Bon`} /></div>
      <div className="acceptance-detail-layout"><section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Riwayat transaksi</span><h3>Daftar Bon</h3></div></div><div className="acceptance-bon-list">{customerBons.map((bon) => <button className="acceptance-bon-row" type="button" key={bon.number} onClick={() => onViewBon(bon.number)}><span><strong>{bon.number}</strong><small>{bon.date} · {bon.status}</small></span><strong>{formatCurrency(calculateBon(bon).amountOwed)}</strong><ChevronRight size={20} /></button>)}</div></section><aside className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Aturan pelanggan</span><h3>Diskon dan Bonus</h3></div><BadgePercent size={24} /></div><Rule label="Diskon LM" value={`${selected.discountLm.join(" → ")}% (efektif ${effectiveDiscount(selected.discountLm)}%)`} /><Rule label="Diskon BR" value={`${selected.discountBr.join(" → ")}% (efektif ${effectiveDiscount(selected.discountBr)}%)`} /><Rule label="Bonus diberikan" value={`${selected.bonusesGranted} unit`} /></aside></div>
      {editor && <CustomerEditor value={editor === "new" ? undefined : editor} nextCode={`PLG-${String(customers.length + 1).padStart(3, "0")}`} saving={saving} onClose={() => setEditor(null)} onSave={save} />}
      {deleteTarget && <ConfirmDelete customer={deleteTarget} saving={saving} onClose={() => setDeleteTarget(null)} onConfirm={() => { void remove(deleteTarget); }} />}
    </section>;
  }

  return <section className="acceptance-page">
    <header className="acceptance-page-header"><span className="acceptance-page-icon"><Users size={30} /></span><div><span className="eyebrow">Data master</span><h2>Pelanggan</h2><p>Kelola identitas, diskon bertingkat, threshold bonus, dan riwayat transaksi.</p></div><button className="button button--primary" type="button" onClick={() => setEditor("new")}><UserPlus size={20} />Tambah Pelanggan</button></header>
    {operationError && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{operationError}</span></div>}
    <section className="acceptance-toolbar"><label className="search-box"><Search size={21} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau kode pelanggan" /></label><span>{visible.length} pelanggan aktif</span></section>
    <div className="acceptance-customer-grid">{visible.map((customer) => { const receivable = bons.filter((bon) => !bon.deletedAt && bon.customerCode === customer.code && bon.status === "Piutang" && !bon.isBonus).reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0); return <button className="acceptance-customer-card" type="button" key={customer.code} onClick={() => setSelectedCode(customer.code)}><span className="customer-avatar">{customer.name.slice(0, 2).toUpperCase()}</span><span><span className="eyebrow">{customer.code}</span><strong>{customer.name}</strong><small>{customer.address} · {customer.phone}</small><span className="customer-card-facts"><span>Piutang <strong>{formatCurrency(receivable)}</strong></span></span></span><ChevronRight size={22} /></button>; })}</div>
    {editor && <CustomerEditor value={editor === "new" ? undefined : editor} nextCode={`PLG-${String(customers.length + 1).padStart(3, "0")}`} saving={saving} onClose={() => setEditor(null)} onSave={save} />}
  </section>;
}

function toCustomerPayload(customer: StoredCustomer): CustomerWriteInput {
  return {
    code: customer.code,
    name: customer.name.trim(),
    phone: customer.phone.trim() || undefined,
    address: customer.address.trim() || undefined,
    bonusThreshold: customer.bonusThreshold,
    discountTiers: [
      ...customer.discountLm.map((percent, index) => ({ productType: "LM" as const, sequence: index + 1, percentBps: Math.round(percent * 100) })),
      ...customer.discountBr.map((percent, index) => ({ productType: "BR" as const, sequence: index + 1, percentBps: Math.round(percent * 100) }))
    ]
  };
}

function CustomerEditor({ value, nextCode, saving, onClose, onSave }: { value?: StoredCustomer; nextCode: string; saving: boolean; onClose: () => void; onSave: (customer: StoredCustomer) => Promise<void> }) {
  const [draft, setDraft] = useState<StoredCustomer>(value ?? { code: nextCode, name: "", phone: "", address: "", discountLm: [0], discountBr: [0], bonusThreshold: 10_000_000, accumulatedPaidOmzet: 0, bonusesGranted: 0, thresholdHistory: [], active: true });
  const valid = draft.name.trim().length > 0 && draft.bonusThreshold > 0 && [...draft.discountLm, ...draft.discountBr].every((step) => step >= 0 && step <= 100);
  const updateDiscount = (type: "LM" | "BR", index: number, amount: number) => { const key = type === "LM" ? "discountLm" : "discountBr"; setDraft((current) => ({ ...current, [key]: current[key].map((step, position) => position === index ? amount : step) })); };
  const addDiscount = (type: "LM" | "BR") => { const key = type === "LM" ? "discountLm" : "discountBr"; setDraft((current) => ({ ...current, [key]: [...current[key], 0] })); };
  const removeDiscount = (type: "LM" | "BR", index: number) => { const key = type === "LM" ? "discountLm" : "discountBr"; setDraft((current) => ({ ...current, [key]: current[key].length === 1 ? current[key] : current[key].filter((_, position) => position !== index) })); };
  return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-master-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">Data pelanggan</span><h2>{value ? "Edit Pelanggan" : "Tambah Pelanggan"}</h2></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header><div className="acceptance-master-body"><div className="acceptance-form-grid"><label className="field field--wide"><span>Nama *</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label className="field"><span>Kode</span><input value={draft.code} disabled={Boolean(value)} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} /></label><label className="field"><span>Telepon</span><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label><label className="field field--wide"><span>Alamat</span><textarea value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label><label className="field field--wide"><span>Threshold Bonus *</span><input type="number" min={1} value={draft.bonusThreshold} onChange={(event) => setDraft({ ...draft, bonusThreshold: Number(event.target.value) })} /></label></div><div className="discount-editor-grid"><DiscountEditor label="LM" steps={draft.discountLm} onAdd={() => addDiscount("LM")} onChange={(index, amount) => updateDiscount("LM", index, amount)} onRemove={(index) => removeDiscount("LM", index)} /><DiscountEditor label="BR" steps={draft.discountBr} onAdd={() => addDiscount("BR")} onChange={(index, amount) => updateDiscount("BR", index, amount)} onRemove={(index) => removeDiscount("BR", index)} /></div></div><footer><button className="button button--secondary" type="button" disabled={saving} onClick={onClose}>Batal</button><button className="button button--primary" type="button" disabled={!valid || saving} onClick={() => { void onSave(draft); }}><Save size={19} />{saving ? "Menyimpan..." : "Simpan"}</button></footer></section></div>;
}

function DiscountEditor({ label, steps, onAdd, onChange, onRemove }: { label: string; steps: number[]; onAdd: () => void; onChange: (index: number, amount: number) => void; onRemove: (index: number) => void }) { return <section className="discount-step-editor"><header><h3>{label}</h3><button className="button button--secondary button--compact" type="button" onClick={onAdd}><Plus size={17} />Tahap</button></header><div className="discount-step-list">{steps.map((step, index) => <label className="discount-step-row" key={`${label}-${index}`}><span>Tahap {index + 1}</span><input type="number" min={0} max={100} value={step} onChange={(event) => onChange(index, Number(event.target.value))} /><span>%</span><button className="icon-button" type="button" disabled={steps.length === 1} onClick={() => onRemove(index)}><Trash2 size={17} /></button></label>)}</div></section>; }
function ConfirmDelete({ customer, saving, onClose, onConfirm }: { customer: CustomerProfile; saving: boolean; onClose: () => void; onConfirm: () => void }) { return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><Trash2 size={34} /><h2>Nonaktifkan pelanggan?</h2><p>{customer.name} tidak lagi dapat dipilih untuk transaksi baru. Riwayat tetap tersimpan.</p><div><button className="button button--secondary" type="button" disabled={saving} onClick={onClose}>Batal</button><button className="button button--danger" type="button" disabled={saving} onClick={onConfirm}>{saving ? "Memproses..." : "Nonaktifkan"}</button></div></section></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <article className="acceptance-stat"><div><small>{label}</small><strong>{value}</strong></div></article>; }
function Rule({ label, value }: { label: string; value: string }) { return <div className="discount-summary"><span>{label}</span><strong>{value}</strong></div>; }
