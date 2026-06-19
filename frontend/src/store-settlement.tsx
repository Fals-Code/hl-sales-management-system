import { AlertTriangle, CalendarDays, Check, CheckCircle2, HandCoins, ReceiptText, RotateCcw, UserRound, WalletCards, X } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateBon, currentIsoDate, toDisplayDate } from "./acceptance-data";
import { useApi } from "./api-client";
import { formatCurrency } from "./data";
import { useAppStore, type StoredBon } from "./store";
import { settlementResourceApi } from "./write-resources";

export function StoreSettlement({ prefillCustomerCode, onViewBon }: { prefillCustomerCode?: string | null; onViewBon: (bonNumber: string) => void }) {
  const { customers, bons, updateBonStatus, refreshFromApi } = useAppStore();
  const activeCustomers = customers.filter((entry) => entry.active);
  const [customerCode, setCustomerCode] = useState(prefillCustomerCode ?? activeCustomers[0]?.code ?? "");
  const [period, setPeriod] = useState("2026-06");
  const [paymentDate, setPaymentDate] = useState(currentIsoDate());
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<StoredBon | null>(null);
  const [ownerPin, setOwnerPin] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const customer = customers.find((entry) => entry.code === customerCode) ?? activeCustomers[0];
  const rows = useMemo(() => bons.filter((bon) => !bon.deletedAt && bon.customerCode === customerCode && bon.date.startsWith(period) && !bon.isBonus && bon.status !== "Void"), [bons, customerCode, period]);
  const unpaid = rows.filter((bon) => bon.status === "Piutang");
  const paid = rows.filter((bon) => bon.status === "Lunas");
  const selected = unpaid.filter((bon) => selectedNumbers.includes(bon.number));
  const selectedTotal = selected.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const outstandingTotal = unpaid.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const paidTotal = paid.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);

  const settle = async () => {
    if (!customer || selected.length === 0) return;
    setProcessing(true);
    setOperationError(null);
    try {
      if (useApi) {
        if (!customer.backendId || selected.some((bon) => !bon.backendId)) throw new Error("Data pelunasan belum memiliki ID backend lengkap.");
        await settlementResourceApi.settle(customer.backendId, selected.map((bon) => bon.backendId as string), paymentDate);
        await refreshFromApi();
      } else {
        selected.forEach((bon) => updateBonStatus(bon.number, "Lunas", paymentDate));
      }
      setSelectedNumbers([]);
      setConfirmOpen(false);
      setNotice(`${selected.length} Bon menjadi Lunas pada ${toDisplayDate(paymentDate)}.`);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Pelunasan gagal diproses.");
    } finally {
      setProcessing(false);
    }
  };

  const cancel = async () => {
    if (!cancelTarget || ownerPin.length < 4 || reason.trim().length < 8) return;
    const targetCustomer = customers.find((entry) => entry.code === cancelTarget.customerCode);
    setProcessing(true);
    setOperationError(null);
    try {
      if (useApi) {
        if (!targetCustomer?.backendId || !cancelTarget.backendId) throw new Error("Data pembayaran belum memiliki ID backend lengkap.");
        await settlementResourceApi.cancelForBon(targetCustomer.backendId, cancelTarget.backendId, ownerPin, reason.trim());
        await refreshFromApi();
      } else {
        updateBonStatus(cancelTarget.number, "Piutang");
      }
      setNotice(`${cancelTarget.number} kembali menjadi Piutang. Ringkasan cash basis telah diperbarui.`);
      setCancelTarget(null);
      setOwnerPin("");
      setReason("");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Pembatalan pembayaran gagal diproses.");
    } finally {
      setProcessing(false);
    }
  };

  if (!customer) return <section className="acceptance-empty"><UsersFallback /></section>;

  return <section className="acceptance-page">
    <header className="acceptance-page-header"><span className="acceptance-page-icon"><HandCoins size={30} /></span><div><span className="eyebrow">Cash basis</span><h2>Pelunasan</h2><p>Lunasi satu Bon atau seluruh Bon dalam bulan yang dipilih.</p></div></header>
    {notice && <div className="success-banner"><CheckCircle2 size={23} /><div><strong>Data diperbarui</strong><span>{notice}</span></div></div>}
    {operationError && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{operationError}</span></div>}
    <section className="acceptance-filter-card settlement-filter-card"><label className="field"><span>Pelanggan</span><div className="input-icon-shell"><UserRound size={21} /><select value={customerCode} onChange={(event) => { setCustomerCode(event.target.value); setSelectedNumbers([]); setNotice(null); setOperationError(null); }}>{activeCustomers.map((entry) => <option value={entry.code} key={entry.code}>{entry.name}</option>)}</select></div></label><label className="field"><span>Periode Bon</span><input type="month" value={period} onChange={(event) => { setPeriod(event.target.value); setSelectedNumbers([]); setNotice(null); setOperationError(null); }} /></label><label className="field"><span>Tanggal Pelunasan *</span><div className="input-icon-shell"><CalendarDays size={21} /><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div></label></section>
    <div className="settlement-live-totals"><div><span>Piutang periode ini</span><strong>{formatCurrency(outstandingTotal)}</strong></div><div><span>Sudah dibayar</span><strong>{formatCurrency(paidTotal)}</strong></div><div><span>Bon Piutang</span><strong>{unpaid.length}</strong></div><div><span>Bon Lunas</span><strong>{paid.length}</strong></div></div>
    <div className="acceptance-detail-layout"><section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Bon belum lunas</span><h3>{customer.name} · {period}</h3></div><button className="button button--secondary button--compact" type="button" disabled={unpaid.length === 0 || processing} onClick={() => setSelectedNumbers(unpaid.map((bon) => bon.number))}>Pilih Seluruh Bulan</button></div>{unpaid.length === 0 ? <div className="acceptance-inline-empty"><WalletCards size={30} /><span>Tidak ada Bon Piutang pada periode ini.</span></div> : <div className="settlement-selection-list">{unpaid.map((bon) => { const checked = selectedNumbers.includes(bon.number); return <article className={`settlement-selection-card ${checked ? "is-selected" : ""}`} key={bon.number}><label><input type="checkbox" checked={checked} onChange={() => setSelectedNumbers((current) => current.includes(bon.number) ? current.filter((number) => number !== bon.number) : [...current, bon.number])} /><span className="custom-checkbox">{checked && <Check size={18} />}</span><span><strong>{bon.number}</strong><small>{toDisplayDate(bon.date)}</small></span><strong>{formatCurrency(calculateBon(bon).amountOwed)}</strong></label><button className="text-button" type="button" onClick={() => onViewBon(bon.number)}>Lihat Detail</button></article>; })}</div>}</section><aside className="acceptance-card settlement-acceptance-summary"><div className="acceptance-card-heading"><div><span className="eyebrow">Ringkasan pembayaran</span><h3>Periksa Pelunasan</h3></div><HandCoins size={24} /></div><div className="settlement-summary-facts"><div><span>Pelanggan</span><strong>{customer.name}</strong></div><div><span>Tanggal bayar</span><strong>{toDisplayDate(paymentDate)}</strong></div><div><span>Bon dipilih</span><strong>{selected.length}</strong></div></div><div className="acceptance-total"><span>Total akan dibayar</span><strong>{formatCurrency(selectedTotal)}</strong></div><button className="button button--primary button--full" type="button" disabled={selected.length === 0 || !paymentDate || processing} onClick={() => setConfirmOpen(true)}><HandCoins size={20} />Catat Pelunasan</button></aside></div>
    <section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Pembayaran periode ini</span><h3>Bon Sudah Lunas</h3></div><RotateCcw size={24} /></div>{paid.length === 0 ? <div className="acceptance-inline-empty"><ReceiptText size={30} /><span>Belum ada pembayaran pada periode ini.</span></div> : <div className="paid-bon-list">{paid.map((bon) => <article className="paid-bon-row" key={bon.number}><span><strong>{bon.number}</strong><small>Dibayar {toDisplayDate(bon.paymentDate)}</small></span><strong>{formatCurrency(calculateBon(bon).amountOwed)}</strong><button className="button button--danger button--compact" type="button" disabled={processing} onClick={() => setCancelTarget(bon)}><RotateCcw size={18} />Batalkan Pembayaran</button></article>)}</div>}</section>
    {confirmOpen && <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={() => setConfirmOpen(false)}><section className="acceptance-confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><HandCoins size={38} /><h2>Konfirmasi Pelunasan</h2><p>{selected.length} Bon milik {customer.name} akan menjadi Lunas pada {toDisplayDate(paymentDate)}.</p><div className="acceptance-total"><span>Total dibayar</span><strong>{formatCurrency(selectedTotal)}</strong></div><div><button className="button button--secondary" type="button" disabled={processing} onClick={() => setConfirmOpen(false)}>Kembali</button><button className="button button--primary" type="button" disabled={processing} onClick={() => { void settle(); }}>{processing ? "Memproses..." : "Ya, Catat Pelunasan"}</button></div></section></div>}
    {cancelTarget && <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={() => setCancelTarget(null)}><section className="acceptance-master-dialog acceptance-master-dialog--small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">Tindakan sensitif</span><h2>Batalkan Pembayaran</h2><p>{cancelTarget.number} akan kembali menjadi Piutang.</p></div><button className="icon-button" type="button" onClick={() => setCancelTarget(null)}><X size={22} /></button></header><div className="acceptance-master-body"><label className="field"><span>PIN Owner *</span><input type="password" inputMode="numeric" value={ownerPin} onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label className="field"><span>Alasan pembatalan *</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label></div><footer><button className="button button--secondary" type="button" disabled={processing} onClick={() => setCancelTarget(null)}>Batal</button><button className="button button--danger" type="button" disabled={ownerPin.length < 4 || reason.trim().length < 8 || processing} onClick={() => { void cancel(); }}>{processing ? "Memproses..." : "Batalkan Pembayaran"}</button></footer></section></div>}
  </section>;
}

function UsersFallback() { return <><ReceiptText size={36} /><h3>Belum ada pelanggan aktif</h3><p>Tambahkan pelanggan sebelum mencatat pelunasan.</p></>; }
