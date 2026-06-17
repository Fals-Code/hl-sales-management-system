import { CalendarDays, CheckCircle2, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateBon, customerProfiles, productProfiles, roundToHundred, type AcceptanceBon } from "./acceptance-data";
import { formatCurrency } from "./data";

export function AcceptanceBonEditDialog({ bon, onClose, onSaved }: { bon: AcceptanceBon | null; onClose: () => void; onSaved: () => void }) {
  if (!bon) return null;
  return <EditForm key={bon.number} bon={bon} onClose={onClose} onSaved={onSaved} />;
}

function EditForm({ bon, onClose, onSaved }: { bon: AcceptanceBon; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(bon.date);
  const [customerCode, setCustomerCode] = useState(bon.customerCode);
  const [description, setDescription] = useState(bon.description);
  const [shipping, setShipping] = useState(bon.shipping);
  const [lines, setLines] = useState(bon.lines);
  const [saved, setSaved] = useState(false);
  const draft = useMemo(() => ({ ...bon, date, customerCode, description, shipping: roundToHundred(Math.max(0, shipping)), lines }), [bon, date, customerCode, description, shipping, lines]);
  const totals = useMemo(() => calculateBon(draft), [draft]);
  const valid = Boolean(date) && lines.every((line) => line.quantity >= 1);

  const save = () => {
    if (!valid) return;
    setSaved(true);
    window.setTimeout(onSaved, 500);
  };

  return (
    <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="acceptance-master-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">Bon Piutang</span><h2>Edit {bon.number}</h2><p>Perubahan menghitung ulang omzet, laba, ongkir, dan total.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header>
        {saved ? <div className="acceptance-dialog-success"><CheckCircle2 size={45} /><h3>Perubahan disimpan</h3><p>Bon siap diperbarui melalui API saat fase integrasi.</p></div> : <><div className="acceptance-master-body"><div className="acceptance-form-grid"><label className="field"><span>Tanggal *</span><div className="input-icon-shell"><CalendarDays size={21} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></label><label className="field"><span>Nomor Bon</span><input value={bon.number} disabled /></label><label className="field field--wide"><span>Pelanggan *</span><select value={customerCode} onChange={(event) => setCustomerCode(event.target.value)}>{customerProfiles.filter((entry) => entry.active).map((entry) => <option value={entry.code} key={entry.code}>{entry.name}</option>)}</select></label><label className="field field--wide"><span>Deskripsi</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><div className="acceptance-line-list">{lines.map((line, index) => <article className="acceptance-line-card" key={`${line.productId}-${index}`}><label className="field"><span>Produk {index + 1}</span><select value={line.productId} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: event.target.value } : item))}>{productProfiles.filter((entry) => entry.active).map((entry) => <option value={entry.id} key={entry.id}>{entry.name} · {entry.type}</option>)}</select></label><label className="field"><span>Jumlah</span><input type="number" min={1} value={line.quantity} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) } : item))} /></label></article>)}</div><label className="field"><span>Ongkir</span><input inputMode="numeric" value={shipping} onChange={(event) => setShipping(Math.max(0, Number(event.target.value) || 0))} /><small>{formatCurrency(roundToHundred(shipping))}</small></label><aside className="acceptance-live-summary"><h3>Ringkasan Perubahan</h3><Summary label="Omzet" value={totals.omzet} /><Summary label="Laba HL" value={totals.profit} /><div className="acceptance-total"><span>Total Piutang</span><strong>{formatCurrency(totals.amountOwed)}</strong></div></aside></div><footer><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--primary" type="button" disabled={!valid} onClick={save}><Save size={20} />Simpan Perubahan</button></footer></>}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="acceptance-summary-row"><span>{label}</span><strong>{formatCurrency(value)}</strong></div>;
}
