import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Gift,
  Hash,
  PackagePlus,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  acceptanceBons,
  bonusesAvailable,
  calculateBon,
  cascadingPrice,
  currentIsoDate,
  customerProfiles,
  effectiveDiscount,
  getCustomer,
  getProduct,
  productProfiles,
  roundToHundred,
  type AcceptanceBon,
  type AcceptanceBonLine
} from "./acceptance-data";
import { formatCurrency } from "./data";

type BonMode = "normal" | "bonus";
type FormStep = 1 | 2 | 3 | 4;

type AcceptanceBonDialogProps = {
  open: boolean;
  onClose: () => void;
  prefillCustomerCode?: string | null;
  initialMode?: BonMode;
};

const makeLine = (): AcceptanceBonLine => ({ productId: productProfiles[0].id, quantity: 1 });

export function AcceptanceBonDialog({
  open,
  onClose,
  prefillCustomerCode,
  initialMode = "normal"
}: AcceptanceBonDialogProps) {
  const [step, setStep] = useState<FormStep>(1);
  const [mode, setMode] = useState<BonMode>(initialMode);
  const [date, setDate] = useState(currentIsoDate());
  const [number, setNumber] = useState("");
  const [customerCode, setCustomerCode] = useState(prefillCustomerCode ?? customerProfiles[0].code);
  const [description, setDescription] = useState("");
  const [shipping, setShipping] = useState(0);
  const [lines, setLines] = useState<AcceptanceBonLine[]>([makeLine()]);
  const [ownerPin, setOwnerPin] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [savedNumber, setSavedNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const resolvedMode = initialMode;
    const prefix = resolvedMode === "bonus" ? "BONUS" : "BON";
    setStep(1);
    setMode(resolvedMode);
    setDate(currentIsoDate());
    setNumber(`${prefix}-${currentIsoDate().replaceAll("-", "")}-`);
    setCustomerCode(prefillCustomerCode ?? customerProfiles[0].code);
    setDescription("");
    setShipping(0);
    setLines([makeLine()]);
    setOwnerPin("");
    setApprovalReason("");
    setSavedNumber(null);
  }, [open, prefillCustomerCode, initialMode]);

  const customer = getCustomer(customerCode);
  const availableBonus = bonusesAvailable(customer);
  const activeCustomers = customerProfiles.filter((entry) => entry.active && (mode === "normal" || bonusesAvailable(entry) > 0));
  const activeProducts = productProfiles.filter((entry) => entry.active);
  const duplicateNumber = acceptanceBons.some((bon) => bon.number.toLowerCase() === number.trim().toLowerCase());
  const validNumber = number.trim().length >= 8 && !duplicateNumber;

  const draftBon: AcceptanceBon = useMemo(() => ({
    number: number.trim(),
    date,
    customerCode,
    description: description.trim(),
    status: mode === "bonus" ? "Bonus" : "Piutang",
    shipping: mode === "bonus" ? 0 : Math.max(0, roundToHundred(shipping)),
    isBonus: mode === "bonus",
    lines
  }), [number, date, customerCode, description, shipping, mode, lines]);

  const calculation = useMemo(() => calculateBon(draftBon), [draftBon]);
  const requestedBonusUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
  const bonusQuantityValid = mode === "normal" || requestedBonusUnits <= availableBonus;
  const negativeProfit = mode === "normal" && calculation.profit < 0;
  const ownerApprovalValid = !negativeProfit || (ownerPin.length >= 4 && approvalReason.trim().length >= 8);
  const linesValid = lines.length > 0 && lines.every((line) => line.quantity >= 1);

  const canAdvance = step === 1
    ? validNumber && Boolean(date) && Boolean(customerCode)
    : step === 2
      ? linesValid && bonusQuantityValid
      : step === 3
        ? ownerApprovalValid
        : true;

  if (!open) return null;

  const switchMode = (nextMode: BonMode) => {
    setMode(nextMode);
    const prefix = nextMode === "bonus" ? "BONUS" : "BON";
    setNumber(`${prefix}-${date.replaceAll("-", "")}-`);
    const eligible = customerProfiles.find((entry) => entry.active && bonusesAvailable(entry) > 0);
    if (nextMode === "bonus" && eligible) setCustomerCode(eligible.code);
    setShipping(0);
    setLines([makeLine()]);
  };

  const updateLine = (index: number, changes: Partial<AcceptanceBonLine>) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line));
  };

  const removeLine = (index: number) => {
    setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index));
  };

  const saveBon = () => {
    if (!validNumber || !linesValid || !bonusQuantityValid || !ownerApprovalValid) return;
    setSavedNumber(number.trim());
  };

  return (
    <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="acceptance-bon-dialog" role="dialog" aria-modal="true" aria-labelledby="acceptance-bon-title" onMouseDown={(event) => event.stopPropagation()}>
        {savedNumber ? (
          <div className="acceptance-success-state">
            <span className="acceptance-success-icon"><CheckCircle2 size={44} /></span>
            <span className="eyebrow">{mode === "bonus" ? "Bonus Bon" : "Bon"} berhasil disiapkan</span>
            <h2>{savedNumber}</h2>
            <p>{mode === "bonus" ? "Bonus tercatat tanpa omzet, piutang, dan dampak laba." : `Status awal Piutang dengan total ${formatCurrency(calculation.amountOwed)}.`}</p>
            <div className="acceptance-info-box"><ShieldCheck size={22} /><span>Data ini masih mock dan siap dihubungkan ke API pada fase integrasi.</span></div>
            <button className="button button--primary button--large" type="button" onClick={onClose}>Selesai</button>
          </div>
        ) : (
          <>
            <header className="acceptance-dialog-header">
              <div>
                <span className="eyebrow">Transaksi baru</span>
                <h2 id="acceptance-bon-title">{mode === "bonus" ? "Buat Bonus Bon" : "Buat Bon"}</h2>
                <p>Isi satu tahap dalam satu waktu. Semua nilai dihitung otomatis.</p>
              </div>
              <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup form"><X size={24} /></button>
            </header>

            <ol className="acceptance-stepper" aria-label="Tahapan membuat Bon">
              {["Jenis & Data", "Produk", "Periksa", "Konfirmasi"].map((label, index) => {
                const itemStep = (index + 1) as FormStep;
                return <li className={`${step === itemStep ? "is-active" : ""} ${step > itemStep ? "is-complete" : ""}`} key={label}><span>{step > itemStep ? <Check size={17} /> : itemStep}</span><strong>{label}</strong></li>;
              })}
            </ol>

            <div className="acceptance-dialog-body">
              {step === 1 && (
                <section className="acceptance-form-section">
                  <SectionIntro icon={<ReceiptText size={25} />} eyebrow="Tahap 1 dari 4" title="Jenis dan data Bon" description="Nomor Bon harus unik. Status transaksi normal selalu dimulai sebagai Piutang." />

                  <div className="bon-mode-grid">
                    <button className={`bon-mode-card ${mode === "normal" ? "is-selected" : ""}`} type="button" onClick={() => switchMode("normal")}>
                      <ReceiptText size={26} /><span><strong>Penjualan Normal</strong><small>Status awal Piutang. Omzet dan laba diakui setelah Lunas.</small></span><span className="choice-circle">{mode === "normal" && <Check size={18} />}</span>
                    </button>
                    <button className={`bon-mode-card ${mode === "bonus" ? "is-selected" : ""}`} type="button" onClick={() => switchMode("bonus")}>
                      <Gift size={26} /><span><strong>Bonus Bon</strong><small>Harga jual Rp0. Tidak menambah omzet, piutang, atau laba.</small></span><span className="choice-circle">{mode === "bonus" && <Check size={18} />}</span>
                    </button>
                  </div>

                  <div className="acceptance-form-grid">
                    <label className="field"><span>Tanggal transaksi *</span><div className="input-icon-shell"><CalendarDays size={21} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></label>
                    <label className="field"><span>Nomor Bon *</span><div className={`input-icon-shell ${duplicateNumber ? "has-error" : ""}`}><Hash size={21} /><input value={number} onChange={(event) => setNumber(event.target.value.toUpperCase())} placeholder="BON-20260618-015" /></div>{duplicateNumber ? <small className="field-error">Nomor Bon sudah digunakan.</small> : <small>Nomor harus unik dan mudah dilacak.</small>}</label>
                    <label className="field field--wide"><span>Pelanggan *</span><div className="input-icon-shell"><UserRound size={21} /><select value={customerCode} onChange={(event) => setCustomerCode(event.target.value)}>{activeCustomers.map((entry) => <option value={entry.code} key={entry.code}>{entry.name} · {entry.code}</option>)}</select></div>{mode === "bonus" && <small>{availableBonus} bonus tersedia untuk pelanggan ini.</small>}</label>
                    <label className="field field--wide"><span>Deskripsi</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Catatan singkat transaksi" /></label>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="acceptance-form-section">
                  <SectionIntro icon={<PackagePlus size={25} />} eyebrow="Tahap 2 dari 4" title={mode === "bonus" ? "Pilih produk bonus" : "Tambahkan produk"} description={mode === "bonus" ? `Tersedia ${availableBonus} bonus. Setiap unit produk memakai satu bonus.` : "Harga setelah diskon bertingkat dihitung otomatis dari pelanggan dan tipe produk."} />

                  <div className="acceptance-product-layout">
                    <div className="acceptance-line-list">
                      {lines.map((line, index) => {
                        const product = getProduct(line.productId);
                        const discountSteps = product.type === "LM" ? customer.discountLm : customer.discountBr;
                        const discountedPrice = mode === "bonus" ? 0 : cascadingPrice(product.basePrice, discountSteps);
                        return (
                          <article className="acceptance-line-card" key={`${line.productId}-${index}`}>
                            <header><div><span className="eyebrow">Produk {index + 1}</span><h3>{product.name}</h3></div><button className="icon-button" type="button" disabled={lines.length === 1} onClick={() => removeLine(index)} aria-label={`Hapus produk ${index + 1}`}><Trash2 size={20} /></button></header>
                            <label className="field"><span>Produk *</span><select value={line.productId} onChange={(event) => updateLine(index, { productId: event.target.value })}>{activeProducts.map((entry) => <option value={entry.id} key={entry.id}>{entry.name} · {entry.type}</option>)}</select></label>
                            <div className="line-price-grid">
                              <PriceFact label="Tipe" value={product.type} />
                              <PriceFact label="Harga Base" value={formatCurrency(product.basePrice)} />
                              <PriceFact label="Diskon Bertingkat" value={mode === "bonus" ? "Bonus" : discountSteps.map((value) => `${value}%`).join(" → ")} />
                              <PriceFact label="Harga Diterapkan" value={formatCurrency(discountedPrice)} strong />
                            </div>
                            <label className="field"><span>Jumlah *</span><div className="quantity-control acceptance-quantity"><button type="button" onClick={() => updateLine(index, { quantity: Math.max(1, line.quantity - 1) })}>−</button><input value={line.quantity} inputMode="numeric" onChange={(event) => updateLine(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} /><button type="button" onClick={() => updateLine(index, { quantity: line.quantity + 1 })}>+</button></div></label>
                            <div className="line-total-strip"><span>{mode === "bonus" ? "Nilai bonus" : "Omzet baris"}</span><strong>{formatCurrency(mode === "bonus" ? 0 : discountedPrice * line.quantity)}</strong></div>
                          </article>
                        );
                      })}
                      <button className="button button--secondary acceptance-add-line" type="button" onClick={() => setLines((current) => [...current, makeLine()])}><Plus size={20} />Tambah Produk Lain</button>
                    </div>

                    <aside className="acceptance-live-summary">
                      <h3>Ringkasan Sementara</h3>
                      <SummaryRow label="Jumlah produk" value={`${lines.length} jenis`} />
                      <SummaryRow label="Total unit" value={`${requestedBonusUnits} unit`} />
                      {mode === "normal" ? <><SummaryMoney label="Omzet" value={calculation.omzet} /><label className="field"><span>Ongkir</span><input inputMode="numeric" value={shipping} onChange={(event) => setShipping(Math.max(0, Number(event.target.value) || 0))} /><small>{formatCurrency(roundToHundred(shipping))}</small></label><div className="acceptance-total"><span>Total Piutang</span><strong>{formatCurrency(calculation.amountOwed)}</strong></div></> : <><SummaryRow label="Bonus tersedia" value={`${availableBonus} unit`} /><SummaryRow label="Bonus digunakan" value={`${requestedBonusUnits} unit`} /><div className="acceptance-total"><span>Total Tagihan</span><strong>{formatCurrency(0)}</strong></div></>}
                      {!bonusQuantityValid && <div className="acceptance-warning"><AlertTriangle size={20} /><span>Jumlah produk bonus melebihi bonus tersedia.</span></div>}
                    </aside>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="acceptance-form-section">
                  <SectionIntro icon={<BadgeCheck size={25} />} eyebrow="Tahap 3 dari 4" title="Periksa perhitungan" description="Ongkir tidak masuk omzet atau laba. Bonus Bon selalu bernilai Rp0." />
                  <div className="acceptance-review-layout">
                    <div className="acceptance-review-main">
                      <section className="acceptance-review-card"><span className="eyebrow">Pelanggan</span><h3>{customer.name}</h3><p>{customer.code} · {mode === "normal" ? "Status awal Piutang" : `${availableBonus} bonus tersedia`}</p></section>
                      <section className="acceptance-review-card"><span className="eyebrow">Rincian produk</span><div className="review-line-list">{calculation.lineDetails.map((line, index) => <div className="review-line" key={`${line.product.id}-${index}`}><span><strong>{line.product.name}</strong><small>{line.product.type} · {line.quantity} unit · {mode === "bonus" ? "Harga Rp0" : `Diskon ${line.discounts.join("% → ")}%`}</small></span><strong>{formatCurrency(line.lineOmzet)}</strong></div>)}</div></section>
                      {negativeProfit && <section className="negative-profit-card"><div><AlertTriangle size={25} /><span><strong>Transaksi rugi memerlukan persetujuan Owner</strong><small>PIN dan alasan wajib sebelum Bon dapat disimpan.</small></span></div><div className="acceptance-form-grid"><label className="field"><span>PIN Owner *</span><input type="password" inputMode="numeric" value={ownerPin} onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Minimal 4 angka" /></label><label className="field field--wide"><span>Alasan persetujuan *</span><textarea rows={3} value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} placeholder="Minimal 8 karakter" /></label></div></section>}
                    </div>
                    <aside className="acceptance-final-summary"><h3>Ringkasan Akhir</h3><SummaryMoney label="Omzet" value={calculation.omzet} /><SummaryMoney label="Ongkir" value={draftBon.shipping} /><SummaryMoney label="Laba HL" value={calculation.profit} /><div className="acceptance-total"><span>{mode === "bonus" ? "Total Bonus Bon" : "Total Piutang"}</span><strong>{formatCurrency(calculation.amountOwed)}</strong></div><div className="acceptance-info-box"><ShieldCheck size={20} /><span>{mode === "bonus" ? "Bonus tidak memengaruhi omzet dan laba." : "Omzet dan laba baru diakui saat status menjadi Lunas."}</span></div></aside>
                  </div>
                </section>
              )}

              {step === 4 && (
                <section className="acceptance-form-section acceptance-confirm-section">
                  <span className="acceptance-confirm-icon"><ShieldCheck size={38} /></span>
                  <span className="eyebrow">Tahap 4 dari 4</span>
                  <h3>Konfirmasi penyimpanan</h3>
                  <p>Periksa sekali lagi. Setelah disimpan, Bon berstatus {mode === "bonus" ? "Bonus" : "Piutang"}.</p>
                  <dl className="acceptance-confirm-grid"><div><dt>Nomor Bon</dt><dd>{number}</dd></div><div><dt>Tanggal</dt><dd>{date}</dd></div><div><dt>Pelanggan</dt><dd>{customer.name}</dd></div><div><dt>Jenis</dt><dd>{mode === "bonus" ? "Bonus Bon" : "Penjualan normal"}</dd></div><div><dt>Total unit</dt><dd>{requestedBonusUnits}</dd></div><div><dt>Total tagihan</dt><dd>{formatCurrency(calculation.amountOwed)}</dd></div></dl>
                </section>
              )}
            </div>

            <footer className="acceptance-dialog-footer">
              {step === 1 ? <button className="button button--secondary" type="button" onClick={onClose}>Batal</button> : <button className="button button--secondary" type="button" onClick={() => setStep((step - 1) as FormStep)}><ArrowLeft size={19} />Kembali</button>}
              {step < 4 ? <button className="button button--primary" type="button" disabled={!canAdvance} onClick={() => setStep((step + 1) as FormStep)}>Lanjutkan<ChevronRight size={19} /></button> : <button className="button button--primary" type="button" onClick={saveBon}><ReceiptText size={20} />Simpan Bon</button>}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function SectionIntro({ icon, eyebrow, title, description }: { icon: React.ReactNode; eyebrow: string; title: string; description: string }) {
  return <div className="acceptance-section-intro"><span>{icon}</span><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{description}</p></div></div>;
}

function PriceFact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <span className={strong ? "is-strong" : ""}><small>{label}</small><strong>{value}</strong></span>;
}

function SummaryMoney({ label, value }: { label: string; value: number }) {
  return <div className="acceptance-summary-row"><span>{label}</span><strong>{formatCurrency(value)}</strong></div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="acceptance-summary-row"><span>{label}</span><strong>{value}</strong></div>;
}
