import { CalendarDays, Check, CheckCircle2, HandCoins, ReceiptText, RotateCcw, UserRound, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { acceptanceBons, calculateBon, currentIsoDate, customerProfiles, getCustomer, toDisplayDate, type AcceptanceBon } from "./acceptance-data";
import { formatCurrency } from "./data";

export function AcceptanceSettlementPageV2({ prefillBonNumber, prefillCustomerCode, onViewBon }: { prefillBonNumber?: string | null; prefillCustomerCode?: string | null; onViewBon: (bonNumber: string) => void }) {
  const initialBon = acceptanceBons.find((bon) => bon.number === prefillBonNumber && bon.status === "Piutang");
  const [customerCode, setCustomerCode] = useState(initialBon?.customerCode ?? prefillCustomerCode ?? customerProfiles[0].code);
  const [month, setMonth] = useState("6");
  const [year, setYear] = useState("2026");
  const [paymentDate, setPaymentDate] = useState(currentIsoDate());
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>(initialBon ? [initialBon.number] : []);
  const [settledNumbers, setSettledNumbers] = useState<string[]>([]);
  const [cancelledNumbers, setCancelledNumbers] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AcceptanceBon | null>(null);
  const [ownerPin, setOwnerPin] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const monthKey = `${year}-${month.padStart(2, "0")}`;
  const customer = getCustomer(customerCode);
  const rows = acceptanceBons.filter((bon) => bon.customerCode === customerCode && bon.date.startsWith(monthKey) && !bon.isBonus && bon.status !== "Void").map((bon) => {
    if (settledNumbers.includes(bon.number)) return { ...bon, status: "Lunas" as const, paymentDate };
    if (cancelledNumbers.includes(bon.number)) return { ...bon, status: "Piutang" as const, paymentDate: undefined };
    return bon;
  });
  const unpaid = rows.filter((bon) => bon.status === "Piutang");
  const paid = rows.filter((bon) => bon.status === "Lunas");
  const selected = unpaid.filter((bon) => selectedNumbers.includes(bon.number));
  const selectedTotal = selected.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const outstandingTotal = unpaid.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const paidTotal = paid.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);

  const toggle = (number: string) => setSelectedNumbers((current) => current.includes(number) ? current.filter((item) => item !== number) : [...current, number]);
  const settle = () => {
    const numbers = selected.map((bon) => bon.number);
    setSettledNumbers((current) => Array.from(new Set([...current, ...numbers])));
    setCancelledNumbers((current) => current.filter((number) => !numbers.includes(number)));
    setSelectedNumbers([]);
    setConfirmOpen(false);
    setNotice(`${numbers.length} Bon menjadi Lunas pada ${toDisplayDate(paymentDate)}.`);
  };
  const cancelPayment = () => {
    if (!cancelTarget || ownerPin.length < 4 || reason.trim().length < 8) return;
    setCancelledNumbers((current) => Array.from(new Set([...current, cancelTarget.number])));
    setSettledNumbers((current) => current.filter((number) => number !== cancelTarget.number));
    setNotice(`${cancelTarget.number} kembali menjadi Piutang. Total cash basis sudah diperbarui.`);
    setCancelTarget(null);
    setOwnerPin("");
    setReason("");
  };

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header"><span className="acceptance-page-icon"><HandCoins size={30} /></span><div><span className="eyebrow">Cash basis</span><h2>Pelunasan</h2><p>Lunasi satu Bon atau seluruh Bon dalam bulan yang dipilih.</p></div></header>
      {notice && <div className="success-banner"><CheckCircle2 size={23} /><div><strong>Data diperbarui</strong><span>{notice}</span></div></div>}

      <section className="acceptance-filter-card settlement-filter-card">
        <label className="field"><span>Pelanggan</span><div className="input-icon-shell"><UserRound size={21} /><select value={customerCode} onChange={(event) => { setCustomerCode(event.target.value); setSelectedNumbers([]); setNotice(null); }}>{customerProfiles.filter((entry) => entry.active).map((entry) => <option value={entry.code} key={entry.code}>{entry.name}</option>)}</select></div></label>
        <label className="field"><span>Bulan</span><select value={month} onChange={(event) => { setMonth(event.target.value); setSelectedNumbers([]); setNotice(null); }}><option value="6">Juni</option><option value="5">Mei</option><option value="4">April</option></select></label>
        <label className="field"><span>Tahun</span><select value={year} onChange={(event) => { setYear(event.target.value); setSelectedNumbers([]); setNotice(null); }}><option>2026</option><option>2025</option></select></label>
        <label className="field"><span>Tanggal Pelunasan *</span><div className="input-icon-shell"><CalendarDays size={21} /><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div></label>
      </section>

      <div className="settlement-live-totals"><div><span>Piutang periode ini</span><strong>{formatCurrency(outstandingTotal)}</strong></div><div><span>Sudah dibayar</span><strong>{formatCurrency(paidTotal)}</strong></div><div><span>Bon Piutang</span><strong>{unpaid.length}</strong></div><div><span>Bon Lunas</span><strong>{paid.length}</strong></div></div>

      <div className="acceptance-detail-layout">
        <section className="acceptance-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">Bon belum lunas</span><h3>{customer.name} · {monthKey}</h3></div><button className="button button--secondary button--compact" type="button" disabled={unpaid.length === 0} onClick={() => setSelectedNumbers(unpaid.map((bon) => bon.number))}>Pilih Seluruh Bulan</button></div>
          {unpaid.length === 0 ? <div className="acceptance-inline-empty"><WalletCards size={30} /><span>Tidak ada Bon Piutang pada periode ini.</span></div> : <div className="settlement-selection-list">{unpaid.map((bon) => { const checked = selectedNumbers.includes(bon.number); return <article className={`settlement-selection-card ${checked ? "is-selected" : ""}`} key={bon.number}><label><input type="checkbox" checked={checked} onChange={() => toggle(bon.number)} /><span className="custom-checkbox">{checked && <Check size={18} />}</span><span><strong>{bon.number}</strong><small>{toDisplayDate(bon.date)}</small></span><strong>{formatCurrency(calculateBon(bon).amountOwed)}</strong></label><button className="text-button" type="button" onClick={() => onViewBon(bon.number)}>Lihat Detail</button></article>; })}</div>}
        </section>
        <aside className="acceptance-card settlement-acceptance-summary"><div className="acceptance-card-heading"><div><span className="eyebrow">Ringkasan pembayaran</span><h3>Periksa Pelunasan</h3></div><HandCoins size={24} /></div><div className="settlement-summary-facts"><div><span>Pelanggan</span><strong>{customer.name}</strong></div><div><span>Tanggal bayar</span><strong>{toDisplayDate(paymentDate)}</strong></div><div><span>Bon dipilih</span><strong>{selected.length}</strong></div></div><div className="acceptance-total"><span>Total akan dibayar</span><strong>{formatCurrency(selectedTotal)}</strong></div><button className="button button--primary button--full" type="button" disabled={selected.length === 0 || !paymentDate} onClick={() => setConfirmOpen(true)}><HandCoins size={20} />Catat Pelunasan</button></aside>
      </div>

      <section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Pembayaran periode ini</span><h3>Bon Sudah Lunas</h3></div><RotateCcw size={24} /></div>{paid.length === 0 ? <div className="acceptance-inline-empty"><ReceiptText size={30} /><span>Belum ada pembayaran pada periode ini.</span></div> : <div className="paid-bon-list">{paid.map((bon) => <article className="paid-bon-row" key={bon.number}><span><strong>{bon.number}</strong><small>Dibayar {toDisplayDate(bon.paymentDate)}</small></span><strong>{formatCurrency(calculateBon(bon).amountOwed)}</strong><button className="button button--danger button--compact" type="button" onClick={() => setCancelTarget(bon)}><RotateCcw size={18} />Batalkan Pembayaran</button></article>)}</div>}</section>

      {confirmOpen && <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={() => setConfirmOpen(false)}><section className="acceptance-confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><HandCoins size={38} /><h2>Konfirmasi Pelunasan</h2><p>{selected.length} Bon milik {customer.name} akan menjadi Lunas pada {toDisplayDate(paymentDate)}.</p><div className="acceptance-total"><span>Total dibayar</span><strong>{formatCurrency(selectedTotal)}</strong></div><div><button className="button button--secondary" type="button" onClick={() => setConfirmOpen(false)}>Kembali</button><button className="button button--primary" type="button" onClick={settle}>Ya, Catat Pelunasan</button></div></section></div>}
      {cancelTarget && <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={() => setCancelTarget(null)}><section className="acceptance-master-dialog acceptance-master-dialog--small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">Tindakan sensitif</span><h2>Batalkan Pembayaran</h2><p>{cancelTarget.number} akan kembali menjadi Piutang.</p></div><button className="icon-button" type="button" onClick={() => setCancelTarget(null)}><X size={22} /></button></header><div className="acceptance-master-body"><label className="field"><span>PIN Owner *</span><input type="password" inputMode="numeric" value={ownerPin} onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label className="field"><span>Alasan pembatalan *</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label></div><footer><button className="button button--secondary" type="button" onClick={() => setCancelTarget(null)}>Batal</button><button className="button button--danger" type="button" disabled={ownerPin.length < 4 || reason.trim().length < 8} onClick={cancelPayment}>Batalkan Pembayaran</button></footer></section></div>}
    </section>
  );
}
