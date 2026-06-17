import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Download,
  HandCoins,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { useState } from "react";
import {
  acceptanceBons,
  bonusesAvailable,
  calculateBon,
  currentIsoDate,
  customerProfiles,
  effectiveDiscount,
  toDisplayDate,
  type CustomerProfile
} from "./acceptance-data";
import { CustomerMonthlySettlementDialog } from "./CustomerMonthlySettlementDialog";
import { CustomerPdfPreview } from "./CustomerPdfPreview";
import { formatCurrency } from "./data";
import { ThresholdHistoryList } from "./ThresholdHistoryList";

export function AcceptanceCustomersPage({
  onCreateBon,
  onSettlement,
  onViewBon
}: {
  onCreateBon: (customerCode?: string) => void;
  onSettlement: (customerCode?: string) => void;
  onViewBon: (bonNumber: string) => void;
}) {
  const [customers, setCustomers] = useState(customerProfiles);
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; customer?: CustomerProfile } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerProfile | null>(null);

  const activeCustomers = customers.filter((customer) => customer.active);
  const filteredCustomers = activeCustomers.filter((customer) => `${customer.name} ${customer.code}`.toLowerCase().includes(search.toLowerCase()));
  const selectedCustomer = customers.find((customer) => customer.code === selectedCode) ?? null;

  const saveCustomer = (nextCustomer: CustomerProfile) => {
    setCustomers((current) => {
      const previous = current.find((customer) => customer.code === nextCustomer.code);
      const thresholdHistory = previous && previous.bonusThreshold !== nextCustomer.bonusThreshold
        ? [...previous.thresholdHistory, {
            date: currentIsoDate(),
            previousAmount: previous.bonusThreshold,
            newAmount: nextCustomer.bonusThreshold,
            note: "Diubah melalui form pelanggan"
          }]
        : nextCustomer.thresholdHistory;
      const normalized = { ...nextCustomer, thresholdHistory };
      return previous
        ? current.map((customer) => customer.code === normalized.code ? normalized : customer)
        : [...current, normalized];
    });
    setEditor(null);
  };

  const softDelete = () => {
    if (!deleteTarget) return;
    setCustomers((current) => current.map((customer) => customer.code === deleteTarget.code ? { ...customer, active: false } : customer));
    setDeleteTarget(null);
    setSelectedCode(null);
  };

  if (selectedCustomer) {
    return (
      <AcceptanceCustomerDetail
        customer={selectedCustomer}
        onBack={() => setSelectedCode(null)}
        onEdit={() => setEditor({ mode: "edit", customer: selectedCustomer })}
        onDelete={() => setDeleteTarget(selectedCustomer)}
        onCreateBon={() => onCreateBon(selectedCustomer.code)}
        onSettlement={() => onSettlement(selectedCustomer.code)}
        onViewBon={onViewBon}
      >
        {editor && <CustomerEditor key={`${editor.mode}-${editor.customer?.code ?? "new"}`} mode={editor.mode} customer={editor.customer} onClose={() => setEditor(null)} onSave={saveCustomer} />}
        <DeleteCustomerDialog customer={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={softDelete} />
      </AcceptanceCustomerDetail>
    );
  }

  return (
    <section className="acceptance-page">
      <header className="acceptance-page-header">
        <span className="acceptance-page-icon"><Users size={30} /></span>
        <div><span className="eyebrow">Data master</span><h2>Pelanggan</h2><p>Kelola identitas, diskon bertingkat, threshold bonus, dan riwayat transaksi.</p></div>
        <button className="button button--primary" type="button" onClick={() => setEditor({ mode: "create" })}><UserPlus size={20} />Tambah Pelanggan</button>
      </header>

      <section className="acceptance-toolbar">
        <label className="search-box"><Search size={21} /><span className="sr-only">Cari pelanggan</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau kode pelanggan" /></label>
        <span>{filteredCustomers.length} pelanggan aktif</span>
      </section>

      {filteredCustomers.length === 0 ? (
        <section className="acceptance-empty"><Users size={38} /><h3>Pelanggan tidak ditemukan</h3><p>Periksa kata pencarian atau tambahkan pelanggan baru.</p><button className="button button--primary" type="button" onClick={() => setEditor({ mode: "create" })}>Tambah Pelanggan</button></section>
      ) : (
        <div className="acceptance-customer-grid">
          {filteredCustomers.map((customer) => {
            const customerBons = acceptanceBons.filter((bon) => bon.customerCode === customer.code);
            const receivable = customerBons.filter((bon) => bon.status === "Piutang").reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
            return <button className="acceptance-customer-card" type="button" key={customer.code} onClick={() => setSelectedCode(customer.code)}><span className="customer-avatar">{customer.name.slice(0, 2).toUpperCase()}</span><span><span className="eyebrow">{customer.code}</span><strong>{customer.name}</strong><small>{customer.address} · {customer.phone}</small><span className="customer-card-facts"><span>Piutang <strong>{formatCurrency(receivable)}</strong></span><span>Bonus <strong>{bonusesAvailable(customer)} unit</strong></span></span></span><ChevronRight size={22} /></button>;
          })}
        </div>
      )}

      {editor && <CustomerEditor key={`${editor.mode}-${editor.customer?.code ?? "new"}`} mode={editor.mode} customer={editor.customer} onClose={() => setEditor(null)} onSave={saveCustomer} />}
    </section>
  );
}

function AcceptanceCustomerDetail({ customer, onBack, onEdit, onDelete, onCreateBon, onSettlement, onViewBon, children }: { customer: CustomerProfile; onBack: () => void; onEdit: () => void; onDelete: () => void; onCreateBon: () => void; onSettlement: () => void; onViewBon: (bonNumber: string) => void; children: React.ReactNode }) {
  const [month, setMonth] = useState("6");
  const [year, setYear] = useState("2026");
  const [settledNumbers, setSettledNumbers] = useState<string[]>([]);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(currentIsoDate());
  const [pdfOpen, setPdfOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const monthKey = `${year}-${month.padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${monthKey}-01T00:00:00`));
  const monthlyBons = acceptanceBons
    .filter((bon) => bon.customerCode === customer.code && bon.date.startsWith(monthKey))
    .map((bon) => settledNumbers.includes(bon.number) ? { ...bon, status: "Lunas" as const, paymentDate } : bon);
  const normalBons = monthlyBons.filter((bon) => !bon.isBonus && bon.status !== "Void");
  const paidBons = normalBons.filter((bon) => bon.status === "Lunas");
  const unpaidBons = normalBons.filter((bon) => bon.status === "Piutang");
  const totalReceivable = unpaidBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const totalPaid = paidBons.reduce((sum, bon) => sum + calculateBon(bon).amountOwed, 0);
  const paidOmzet = paidBons.reduce((sum, bon) => sum + calculateBon(bon).omzet, 0);
  const paidProfit = paidBons.reduce((sum, bon) => sum + calculateBon(bon).profit, 0);
  const omzetLm = paidBons.reduce((sum, bon) => sum + calculateBon(bon).lineDetails.filter((line) => line.product.type === "LM").reduce((lineSum, line) => lineSum + line.lineOmzet, 0), 0);
  const omzetBr = paidBons.reduce((sum, bon) => sum + calculateBon(bon).lineDetails.filter((line) => line.product.type === "BR").reduce((lineSum, line) => lineSum + line.lineOmzet, 0), 0);

  const settleMonth = () => {
    setSettledNumbers((current) => Array.from(new Set([...current, ...unpaidBons.map((bon) => bon.number)])));
    setSettlementOpen(false);
    setNotice(`${unpaidBons.length} Bon pada ${monthLabel} ditandai Lunas tanggal ${toDisplayDate(paymentDate)}.`);
  };

  return (
    <section className="acceptance-page">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={20} />Kembali ke daftar pelanggan</button>
      {notice && <div className="success-banner" role="status"><CheckCircle2 size={23} /><div><strong>Pelunasan dicatat</strong><span>{notice}</span></div></div>}

      <header className="acceptance-customer-hero">
        <div className="customer-hero-copy"><span className="customer-avatar customer-avatar--large">{customer.name.slice(0, 2).toUpperCase()}</span><div><span className="eyebrow">{customer.code}</span><h2>{customer.name}</h2><p>{customer.address} · {customer.phone}</p></div></div>
        <div className="customer-hero-actions"><button className="button button--secondary" type="button" onClick={onEdit}><Pencil size={19} />Edit</button><button className="button button--secondary" type="button" onClick={onSettlement}><HandCoins size={19} />Pelunasan Lain</button><button className="button button--primary" type="button" onClick={onCreateBon}><Plus size={19} />Buat Bon</button><button className="button button--danger" type="button" onClick={onDelete}><Trash2 size={19} />Nonaktifkan</button></div>
      </header>

      <section className="acceptance-filter-card customer-period-filter">
        <div><span className="eyebrow">Periode transaksi</span><h3>{monthLabel}</h3></div>
        <label className="field"><span>Bulan</span><select value={month} onChange={(event) => { setMonth(event.target.value); setNotice(null); }}><option value="6">Juni</option><option value="5">Mei</option><option value="4">April</option></select></label>
        <label className="field"><span>Tahun</span><select value={year} onChange={(event) => { setYear(event.target.value); setNotice(null); }}><option>2026</option><option>2025</option></select></label>
        <div className="customer-period-actions"><button className="button button--secondary" type="button" onClick={() => setPdfOpen(true)}><Download size={19} />Preview PDF</button><button className="button button--primary" type="button" disabled={unpaidBons.length === 0} onClick={() => setSettlementOpen(true)}><HandCoins size={19} />Lunasi Bulan Ini</button></div>
      </section>

      <div className="acceptance-stat-grid">
        <Stat label="Total Piutang" value={formatCurrency(totalReceivable)} helper={`${unpaidBons.length} Bon Piutang`} icon={<WalletCards size={23} />} />
        <Stat label="Sudah Dibayar" value={formatCurrency(totalPaid)} helper={`${paidBons.length} Bon Lunas`} icon={<HandCoins size={23} />} />
        <Stat label="Omzet Lunas" value={formatCurrency(paidOmzet)} helper={`LM ${formatCurrency(omzetLm)} · BR ${formatCurrency(omzetBr)}`} icon={<BarChart3 size={23} />} />
        <Stat label="Laba HL" value={formatCurrency(paidProfit)} helper="Cash basis" icon={<BadgePercent size={23} />} />
      </div>

      <div className="customer-type-breakdown" aria-label="Breakdown omzet berdasarkan tipe"><div><span>Omzet LM</span><strong>{formatCurrency(omzetLm)}</strong></div><div><span>Omzet BR</span><strong>{formatCurrency(omzetBr)}</strong></div><div><span>Total Omzet</span><strong>{formatCurrency(paidOmzet)}</strong></div></div>

      <div className="acceptance-detail-layout">
        <section className="acceptance-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">Transaksi periode terpilih</span><h3>Daftar Bon</h3></div><ReceiptText size={24} /></div>
          {monthlyBons.length === 0 ? <div className="acceptance-inline-empty"><ReceiptText size={30} /><span>Belum ada transaksi pada periode ini.</span></div> : <div className="acceptance-bon-list">{monthlyBons.map((bon) => { const totals = calculateBon(bon); return <button className={`acceptance-bon-row ${bon.status === "Lunas" ? "is-paid" : ""}`} type="button" key={bon.number} onClick={() => onViewBon(bon.number)}><span><strong>{bon.number}</strong><small>{toDisplayDate(bon.date)} · {bon.status}{bon.paymentDate ? ` · Dibayar ${toDisplayDate(bon.paymentDate)}` : ""}</small></span><strong>{formatCurrency(totals.amountOwed)}</strong><ChevronRight size={20} /></button>; })}</div>}
        </section>

        <aside className="acceptance-card">
          <div className="acceptance-card-heading"><div><span className="eyebrow">Aturan pelanggan</span><h3>Diskon dan Bonus</h3></div><BadgePercent size={24} /></div>
          <DiscountSummary label="Diskon LM" steps={customer.discountLm} />
          <DiscountSummary label="Diskon BR" steps={customer.discountBr} />
          <dl className="customer-rule-list"><div><dt>Threshold bonus</dt><dd>{formatCurrency(customer.bonusThreshold)}</dd></div><div><dt>Akumulasi omzet Lunas</dt><dd>{formatCurrency(customer.accumulatedPaidOmzet)}</dd></div><div><dt>Bonus tersedia</dt><dd>{bonusesAvailable(customer)} unit</dd></div></dl>
          <ThresholdHistoryList customer={customer} />
        </aside>
      </div>

      <CustomerMonthlySettlementDialog open={settlementOpen} customerName={customer.name} monthLabel={monthLabel} count={unpaidBons.length} total={totalReceivable} paymentDate={paymentDate} setPaymentDate={setPaymentDate} onClose={() => setSettlementOpen(false)} onConfirm={settleMonth} />
      <CustomerPdfPreview open={pdfOpen} customer={customer} monthLabel={monthLabel} bons={monthlyBons} onClose={() => setPdfOpen(false)} onPrint={() => window.print()} />
      {children}
    </section>
  );
}

function CustomerEditor({ mode, customer, onClose, onSave }: { mode: "create" | "edit"; customer?: CustomerProfile; onClose: () => void; onSave: (customer: CustomerProfile) => void }) {
  const initial = customer ?? { code: `PLG-${String(customerProfiles.length + 1).padStart(3, "0")}`, name: "", phone: "", address: "", discountLm: [0], discountBr: [0], bonusThreshold: 10_000_000, accumulatedPaidOmzet: 0, bonusesGranted: 0, thresholdHistory: [], active: true };
  const [draft, setDraft] = useState<CustomerProfile>(initial);
  const [saved, setSaved] = useState(false);
  const validDiscounts = [...draft.discountLm, ...draft.discountBr].every((value) => Number.isFinite(value) && value >= 0 && value <= 100);
  const canSave = draft.name.trim().length > 0 && validDiscounts && draft.bonusThreshold > 0;

  const updateStep = (type: "LM" | "BR", index: number, value: number) => {
    const key = type === "LM" ? "discountLm" : "discountBr";
    setDraft((current) => ({ ...current, [key]: current[key].map((step, stepIndex) => stepIndex === index ? value : step) }));
  };

  const addStep = (type: "LM" | "BR") => {
    const key = type === "LM" ? "discountLm" : "discountBr";
    setDraft((current) => ({ ...current, [key]: [...current[key], 0] }));
  };

  const removeStep = (type: "LM" | "BR", index: number) => {
    const key = type === "LM" ? "discountLm" : "discountBr";
    setDraft((current) => ({ ...current, [key]: current[key].length === 1 ? current[key] : current[key].filter((_, stepIndex) => stepIndex !== index) }));
  };

  const save = () => {
    if (!canSave) return;
    setSaved(true);
    window.setTimeout(() => onSave({ ...draft, name: draft.name.trim() }), 500);
  };

  return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-master-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">Data pelanggan</span><h2>{mode === "create" ? "Tambah Pelanggan" : "Edit Pelanggan"}</h2><p>Diskon LM dan BR disusun berurutan, bukan dijumlahkan.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header>{saved ? <div className="acceptance-dialog-success"><CheckCircle2 size={45} /><h3>Data pelanggan disimpan</h3><p>Perubahan siap dikirim ke API saat fase integrasi.</p></div> : <><div className="acceptance-master-body"><div className="acceptance-form-grid"><label className="field field--wide"><span>Nama pelanggan *</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nama pelanggan" /></label><label className="field"><span>Kode pelanggan</span><input value={draft.code} disabled={mode === "edit"} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} /></label><label className="field"><span>Nomor telepon</span><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} inputMode="tel" /></label><label className="field field--wide"><span>Alamat</span><textarea rows={3} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label><label className="field field--wide"><span>Threshold bonus *</span><input value={draft.bonusThreshold} inputMode="numeric" onChange={(event) => setDraft({ ...draft, bonusThreshold: Math.max(0, Number(event.target.value) || 0) })} /><small>{draft.bonusThreshold > 0 ? formatCurrency(draft.bonusThreshold) : "Threshold harus lebih dari Rp0"}</small></label></div><div className="discount-editor-grid"><DiscountStepEditor type="LM" steps={draft.discountLm} onAdd={() => addStep("LM")} onChange={(index, value) => updateStep("LM", index, value)} onRemove={(index) => removeStep("LM", index)} /><DiscountStepEditor type="BR" steps={draft.discountBr} onAdd={() => addStep("BR")} onChange={(index, value) => updateStep("BR", index, value)} onRemove={(index) => removeStep("BR", index)} /></div>{!validDiscounts && <div className="acceptance-warning"><AlertTriangle size={20} /><span>Setiap diskon harus berada di antara 0 dan 100.</span></div>}</div><footer><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--primary" type="button" disabled={!canSave} onClick={save}><Save size={20} />Simpan Pelanggan</button></footer></>}</section></div>;
}

function DiscountStepEditor({ type, steps, onAdd, onChange, onRemove }: { type: "LM" | "BR"; steps: number[]; onAdd: () => void; onChange: (index: number, value: number) => void; onRemove: (index: number) => void }) {
  return <section className="discount-step-editor"><header><div><span className="eyebrow">Diskon bertingkat</span><h3>{type}</h3></div><button className="button button--secondary button--compact" type="button" onClick={onAdd}><Plus size={18} />Tambah Tahap</button></header><div className="discount-step-list">{steps.map((step, index) => <label className="discount-step-row" key={`${type}-${index}`}><span>Tahap {index + 1}</span><input type="number" min={0} max={100} value={step} onChange={(event) => onChange(index, Number(event.target.value))} /><span>%</span><button className="icon-button" type="button" disabled={steps.length === 1} onClick={() => onRemove(index)}><Trash2 size={18} /></button></label>)}</div><div className="discount-result"><span>Diskon efektif</span><strong>{effectiveDiscount(steps)}%</strong></div></section>;
}

function DeleteCustomerDialog({ customer, onClose, onConfirm }: { customer: CustomerProfile | null; onClose: () => void; onConfirm: () => void }) {
  if (!customer) return null;
  return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><AlertTriangle size={36} /><h2>Nonaktifkan pelanggan?</h2><p>{customer.name} akan disembunyikan dari pilihan transaksi baru. Riwayat Bon tetap tersimpan.</p><div><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--danger" type="button" onClick={onConfirm}>Ya, Nonaktifkan</button></div></section></div>;
}

function DiscountSummary({ label, steps }: { label: string; steps: number[] }) {
  return <div className="discount-summary"><span>{label}</span><strong>{steps.map((step) => `${step}%`).join(" → ")}</strong><small>Efektif {effectiveDiscount(steps)}%</small></div>;
}

function Stat({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) {
  return <article className="acceptance-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{helper}</p></div></article>;
}
