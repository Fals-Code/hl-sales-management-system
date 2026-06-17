import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  HandCoins,
  Pencil,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { useState } from "react";
import {
  acceptanceBons,
  calculateBon,
  currentIsoDate,
  customerProfiles,
  getCustomer,
  toDisplayDate,
  type AcceptanceBon,
  type AcceptanceBonStatus
} from "./acceptance-data";
import { AcceptanceBonEditDialog } from "./AcceptanceBonEditDialog";
import { formatCurrency } from "./data";

export function AcceptanceSettlementPage({
  prefillBonNumber,
  prefillCustomerCode,
  onViewBon
}: {
  prefillBonNumber?: string | null;
  prefillCustomerCode?: string | null;
  onViewBon: (bonNumber: string) => void;
}) {
  const initialBon = acceptanceBons.find((bon) => bon.number === prefillBonNumber && bon.status === "Piutang");
  const initialCustomer = initialBon?.customerCode ?? prefillCustomerCode ?? customerProfiles[0].code;
  const [customerCode, setCustomerCode] = useState(initialCustomer);
  const [month, setMonth] = useState("6");
  const [year, setYear] = useState("2026");
  const [paymentDate, setPaymentDate] = useState(currentIsoDate());
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>(initialBon ? [initialBon.number] : []);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AcceptanceBon | null>(null);
  const [ownerPin, setOwnerPin] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const monthKey = `${year}-${month.padStart(2, "0")}`;
  const customer = getCustomer(customerCode);
  const customerBons = acceptanceBons.filter((bon) => bon.customerCode === customerCode && bon.date.startsWith(monthKey) && !bon.isBonus && bon.status !== "Void");
  const unpaidBons = customerBons.filter((bon) => bon.status === "Piutang");
  const paidBons = customerBons.filter((bon) => bon.status === "Lunas");
  const selectedBons = unpaidBons.filter((bon) => selectedNumbers.includes(bon.number));
  const total = selectedBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);

  const toggleBon = (number: string) => setSelectedNumbers((current) => current.includes(number) ? current.filter((item) => item !== number) : [...current, number]);
  const selectMonth = () => setSelectedNumbers(unpaidBons.map((bon) => bon.number));

  const confirmSettlement = () => {
    if (!paymentDate || selectedBons.length === 0) return;
    setConfirmationOpen(false);
    setNotice(`${selectedBons.length} Bon dicatat Lunas pada ${toDisplayDate(paymentDate)}. Total ${formatCurrency(total)}.`);
  };

  const confirmCancelPayment = () => {
    if (!cancelTarget || ownerPin.length < 4 || cancelReason.trim().length < 8) return;
    setNotice(`Pembayaran ${cancelTarget.number} dibatalkan. Omzet, laba, dan bonus akan disesuaikan kembali saat integrasi API.`);
    setCancelTarget(null);
    setOwnerPin("");
    setCancelReason("");
  };

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><HandCoins size={30} /></span>
        <div><span className="eyebrow">Cash basis</span><h2>Pelunasan</h2><p>Pilih periode, tanggal pembayaran, lalu lunasi satu Bon atau seluruh Bon dalam bulan tersebut.</p></div>
      </header>

      {notice && <div className="success-banner" role="status"><CheckCircle2 size={23} /><div><strong>Tindakan berhasil</strong><span>{notice}</span></div></div>}

      <section className="acceptance-filter-card settlement-filter-card">
        <label className="field"><span>Pelanggan</span><div className="input-icon-shell"><UserRound size={21} /><select value={customerCode} onChange={(event) => { setCustomerCode(event.target.value); setSelectedNumbers([]); }}>{customerProfiles.filter((entry) => entry.active).map((entry) => <option value={entry.code} key={entry.code}>{entry.name}</option>)}</select></div></label>
        <label className="field"><span>Bulan</span><select value={month} onChange={(event) => { setMonth(event.target.value); setSelectedNumbers([]); }}><option value="6">Juni</option><option value="5">Mei</option><option value="4">April</option></select></label>
        <label className="field"><span>Tahun</span><select value={year} onChange={(event) => { setYear(event.target.value); setSelectedNumbers([]); }}><option>2026</option><option>2025</option></select></label>
        <label className="field"><span>Tanggal Pelunasan *</span><div className="input-icon-shell"><CalendarDays size={21} /><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div></label>
      </section>

      <div className="acceptance-detail-layout">
        <section className="acceptance-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">Bon belum lunas</span><h3>{customer.name} · {monthKey}</h3></div><button className="button button--secondary button--compact" type="button" disabled={unpaidBons.length === 0} onClick={selectMonth}>Pilih Seluruh Bulan</button></div>
          {unpaidBons.length === 0 ? <div className="acceptance-inline-empty"><WalletCards size={30} /><span>Tidak ada Bon Piutang pada periode ini.</span></div> : <div className="settlement-selection-list">{unpaidBons.map((bon) => { const checked = selectedNumbers.includes(bon.number); const totals = calculateBon(bon); return <article className={`settlement-selection-card ${checked ? "is-selected" : ""}`} key={bon.number}><label><input type="checkbox" checked={checked} onChange={() => toggleBon(bon.number)} /><span className="custom-checkbox">{checked && <Check size={18} />}</span><span><strong>{bon.number}</strong><small>{toDisplayDate(bon.date)}</small></span><strong>{formatCurrency(totals.amountOwed)}</strong></label><button className="text-button" type="button" onClick={() => onViewBon(bon.number)}>Lihat Detail</button></article>; })}</div>}
        </section>

        <aside className="acceptance-card settlement-acceptance-summary">
          <div className="acceptance-card-heading"><div><span className="eyebrow">Ringkasan pembayaran</span><h3>Periksa Pelunasan</h3></div><HandCoins size={24} /></div>
          <div className="settlement-summary-facts"><div><span>Pelanggan</span><strong>{customer.name}</strong></div><div><span>Tanggal bayar</span><strong>{toDisplayDate(paymentDate)}</strong></div><div><span>Bon dipilih</span><strong>{selectedBons.length}</strong></div></div>
          <div className="acceptance-total"><span>Total Sudah Dibayar</span><strong>{formatCurrency(total)}</strong></div>
          <button className="button button--primary button--full" type="button" disabled={selectedBons.length === 0 || !paymentDate} onClick={() => setConfirmationOpen(true)}><HandCoins size={20} />Catat Pelunasan</button>
        </aside>
      </div>

      <section className="acceptance-card">
        <div className="acceptance-card-heading"><div><span className="eyebrow">Pembayaran periode ini</span><h3>Bon Sudah Lunas</h3></div><RotateCcw size={24} /></div>
        {paidBons.length === 0 ? <div className="acceptance-inline-empty"><ReceiptText size={30} /><span>Belum ada pembayaran pada periode ini.</span></div> : <div className="paid-bon-list">{paidBons.map((bon) => <article className="paid-bon-row" key={bon.number}><span><strong>{bon.number}</strong><small>Dibayar {toDisplayDate(bon.paymentDate)}</small></span><strong>{formatCurrency(calculateBon(bon).amountOwed)}</strong><button className="button button--danger button--compact" type="button" onClick={() => setCancelTarget(bon)}><RotateCcw size={18} />Batalkan Pembayaran</button></article>)}</div>}
      </section>

      <ConfirmSettlementDialog open={confirmationOpen} customer={customer.name} date={paymentDate} count={selectedBons.length} total={total} onClose={() => setConfirmationOpen(false)} onConfirm={confirmSettlement} />
      <CancelPaymentDialog bon={cancelTarget} ownerPin={ownerPin} setOwnerPin={setOwnerPin} reason={cancelReason} setReason={setCancelReason} onClose={() => setCancelTarget(null)} onConfirm={confirmCancelPayment} />
    </section>
  );
}

export function AcceptanceBonDetailPage({ bonNumber, onBack, onSettlement }: { bonNumber: string; onBack: () => void; onSettlement: (bonNumber: string) => void }) {
  const sourceBon = acceptanceBons.find((bon) => bon.number === bonNumber) ?? acceptanceBons[0];
  const [status, setStatus] = useState<AcceptanceBonStatus>(sourceBon.status);
  const [action, setAction] = useState<"delete" | "void" | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [ownerPin, setOwnerPin] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const calculation = calculateBon({ ...sourceBon, status });

  const confirmSensitiveAction = () => {
    if (action === "delete") {
      setStatus("Void");
      setNotice("Bon Piutang dinonaktifkan. Riwayat tetap tersimpan.");
      setAction(null);
      return;
    }
    if (action === "void" && ownerPin.length >= 4 && reason.trim().length >= 8) {
      setStatus("Void");
      setNotice("Bon Lunas berhasil di-Void dengan otorisasi Owner.");
      setAction(null);
      setOwnerPin("");
      setReason("");
    }
  };

  return (
    <section className="acceptance-page">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={20} />Kembali ke daftar Bon</button>
      <header className="acceptance-bon-hero"><div><span className="eyebrow">Detail transaksi</span><h2>{sourceBon.number}</h2><p>{calculation.customer.name} · {toDisplayDate(sourceBon.date)}</p></div><AcceptanceStatusBadge status={status} /></header>
      {notice && <div className="success-banner"><CheckCircle2 size={23} /><div><strong>Tindakan berhasil</strong><span>{notice}</span></div></div>}

      <div className="acceptance-detail-layout">
        <div className="acceptance-detail-main">
          <section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Produk</span><h3>Rincian Baris</h3></div><ReceiptText size={24} /></div><div className="bon-detail-line-list">{calculation.lineDetails.map((line) => <article className="bon-detail-line" key={line.product.id}><div><strong>{line.product.name}</strong><small>{line.product.type} · {line.quantity} unit · Diskon {line.discounts.map((value) => `${value}%`).join(" → ")}</small></div><dl><div><dt>Harga Base</dt><dd>{formatCurrency(line.product.basePrice)}</dd></div><div><dt>Harga Diterapkan</dt><dd>{formatCurrency(line.discountedUnitPrice)}</dd></div><div><dt>Omzet Baris</dt><dd>{formatCurrency(line.lineOmzet)}</dd></div></dl></article>)}</div></section>
          <section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Informasi Bon</span><h3>Data Transaksi</h3></div><ReceiptText size={24} /></div><dl className="bon-information-grid"><div><dt>Tanggal</dt><dd>{toDisplayDate(sourceBon.date)}</dd></div><div><dt>Status</dt><dd>{status}</dd></div><div><dt>Tanggal Pelunasan</dt><dd>{toDisplayDate(sourceBon.paymentDate)}</dd></div><div><dt>Deskripsi</dt><dd>{sourceBon.description || "-"}</dd></div><div><dt>Jenis</dt><dd>{sourceBon.isBonus ? "Bonus Bon" : "Penjualan Normal"}</dd></div><div><dt>Ongkir</dt><dd>{formatCurrency(sourceBon.shipping)}</dd></div></dl></section>
        </div>

        <aside className="acceptance-card bon-acceptance-summary"><h3>Ringkasan</h3><SummaryMoney label="Omzet" value={calculation.omzet} /><SummaryMoney label="Ongkir" value={sourceBon.shipping} /><SummaryMoney label="Laba HL" value={calculation.profit} /><div className="acceptance-total"><span>Total Tagihan</span><strong>{formatCurrency(calculation.amountOwed)}</strong></div><div className="bon-detail-action-stack"><button className="button button--secondary button--full" type="button"><Download size={19} />Unduh PDF</button>{status === "Piutang" && <><button className="button button--primary button--full" type="button" onClick={() => onSettlement(sourceBon.number)}><HandCoins size={19} />Lunasi Bon</button><button className="button button--secondary button--full" type="button" onClick={() => setEditOpen(true)}><Pencil size={19} />Edit Bon</button><button className="button button--danger button--full" type="button" onClick={() => setAction("delete")}><Trash2 size={19} />Nonaktifkan Bon</button></>}{status === "Lunas" && <button className="button button--danger button--full" type="button" onClick={() => setAction("void")}><ShieldAlert size={19} />Void Bon</button>}</div></aside>
      </div>

      <AcceptanceBonEditDialog bon={editOpen ? sourceBon : null} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); setNotice("Perubahan Bon Piutang berhasil disimpan dan perhitungan diperbarui."); }} />
      <SensitiveBonDialog action={action} bonNumber={sourceBon.number} ownerPin={ownerPin} setOwnerPin={setOwnerPin} reason={reason} setReason={setReason} onClose={() => setAction(null)} onConfirm={confirmSensitiveAction} />
    </section>
  );
}

function ConfirmSettlementDialog({ open, customer, date, count, total, onClose, onConfirm }: { open: boolean; customer: string; date: string; count: number; total: number; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><HandCoins size={38} /><h2>Konfirmasi Pelunasan</h2><p>{count} Bon milik {customer} akan menjadi Lunas pada {toDisplayDate(date)}.</p><div className="acceptance-total"><span>Total dibayar</span><strong>{formatCurrency(total)}</strong></div><div><button className="button button--secondary" type="button" onClick={onClose}>Kembali</button><button className="button button--primary" type="button" onClick={onConfirm}>Ya, Catat Pelunasan</button></div></section></div>;
}

function CancelPaymentDialog({ bon, ownerPin, setOwnerPin, reason, setReason, onClose, onConfirm }: { bon: AcceptanceBon | null; ownerPin: string; setOwnerPin: (value: string) => void; reason: string; setReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  if (!bon) return null;
  const valid = ownerPin.length >= 4 && reason.trim().length >= 8;
  return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-master-dialog acceptance-master-dialog--small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">Tindakan sensitif</span><h2>Batalkan Pembayaran</h2><p>{bon.number} akan kembali menjadi Piutang dan total cash basis akan disesuaikan.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header><div className="acceptance-master-body"><label className="field"><span>PIN Owner *</span><input type="password" inputMode="numeric" value={ownerPin} onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label className="field"><span>Alasan pembatalan *</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label></div><footer><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--danger" type="button" disabled={!valid} onClick={onConfirm}>Batalkan Pembayaran</button></footer></section></div>;
}

function SensitiveBonDialog({ action, bonNumber, ownerPin, setOwnerPin, reason, setReason, onClose, onConfirm }: { action: "delete" | "void" | null; bonNumber: string; ownerPin: string; setOwnerPin: (value: string) => void; reason: string; setReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  if (!action) return null;
  const voidAction = action === "void";
  const valid = !voidAction || (ownerPin.length >= 4 && reason.trim().length >= 8);
  return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-master-dialog acceptance-master-dialog--small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">{voidAction ? "Otorisasi Owner" : "Soft-delete"}</span><h2>{voidAction ? "Void Bon Lunas" : "Nonaktifkan Bon Piutang"}</h2><p>{bonNumber} tetap tersimpan dalam riwayat dan laporan audit.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header><div className="acceptance-master-body">{voidAction ? <><label className="field"><span>PIN Owner *</span><input type="password" inputMode="numeric" value={ownerPin} onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label className="field"><span>Alasan Void *</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label></> : <div className="acceptance-warning"><AlertTriangle size={20} /><span>Bon tidak akan muncul dalam transaksi aktif, tetapi riwayatnya tidak dihapus.</span></div>}</div><footer><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--danger" type="button" disabled={!valid} onClick={onConfirm}>{voidAction ? "Void Bon" : "Nonaktifkan Bon"}</button></footer></section></div>;
}

function AcceptanceStatusBadge({ status }: { status: AcceptanceBonStatus }) {
  const tone = status === "Lunas" ? "success" : status === "Piutang" ? "warning" : status === "Bonus" ? "bonus" : "danger";
  return <span className={`acceptance-status acceptance-status--${tone}`}>{status}</span>;
}

function SummaryMoney({ label, value }: { label: string; value: number }) {
  return <div className="acceptance-summary-row"><span>{label}</span><strong>{formatCurrency(value)}</strong></div>;
}
