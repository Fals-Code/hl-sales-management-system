import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  FileText,
  HandCoins,
  PackageCheck,
  Pencil,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "./components";
import type { BonRow, BonStatus } from "./data";
import { bons, formatCurrency } from "./data";

type SettlementPageProps = {
  initialBonNumber?: string | null;
  onClearInitialBon?: () => void;
  onViewBon: (bonNumber: string) => void;
};

type BonDetailPageProps = {
  bon: BonRow;
  onBack: () => void;
  onRecordSettlement: (bonNumber: string) => void;
};

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
};

const unpaidBons = bons.filter((bon) => bon.status === "Belum Lunas");

export function SettlementPage({
  initialBonNumber,
  onClearInitialBon,
  onViewBon
}: SettlementPageProps) {
  const initialBon = unpaidBons.find((bon) => bon.number === initialBonNumber);
  const initialCustomer = initialBon?.customer ?? unpaidBons[0]?.customer ?? "";
  const [customer, setCustomer] = useState(initialCustomer);
  const [selectedBonNumbers, setSelectedBonNumbers] = useState<string[]>(
    initialBon ? [initialBon.number] : []
  );
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [paymentNumber, setPaymentNumber] = useState<string | null>(null);

  const customerOptions = useMemo(
    () => Array.from(new Set(unpaidBons.map((bon) => bon.customer))),
    []
  );

  const customerBons = useMemo(
    () => unpaidBons.filter((bon) => bon.customer === customer),
    [customer]
  );

  const selectedBons = useMemo(
    () => unpaidBons.filter((bon) => selectedBonNumbers.includes(bon.number)),
    [selectedBonNumbers]
  );

  const total = selectedBons.reduce((sum, bon) => sum + bon.amount, 0);

  const changeCustomer = (value: string) => {
    setCustomer(value);
    setSelectedBonNumbers([]);
    setPaymentNumber(null);
    onClearInitialBon?.();
  };

  const toggleBon = (bonNumber: string) => {
    setSelectedBonNumbers((current) =>
      current.includes(bonNumber)
        ? current.filter((number) => number !== bonNumber)
        : [...current, bonNumber]
    );
  };

  const selectAll = () => {
    const allSelected = customerBons.every((bon) => selectedBonNumbers.includes(bon.number));
    setSelectedBonNumbers(allSelected ? [] : customerBons.map((bon) => bon.number));
  };

  const saveSettlement = () => {
    const timestamp = new Date();
    const number = `PAY-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, "0")}${String(timestamp.getDate()).padStart(2, "0")}-${String(timestamp.getTime()).slice(-4)}`;
    setPaymentNumber(number);
    setConfirmationOpen(false);
  };

  return (
    <section className="workflow-page" aria-labelledby="settlement-title">
      <div className="workflow-heading">
        <div>
          <span className="eyebrow">Pembayaran pelanggan</span>
          <h2 id="settlement-title">Catat Pelunasan</h2>
          <p>Pilih pelanggan, tandai Bon yang dibayar, lalu periksa total sebelum menyimpan.</p>
        </div>
        <div className="workflow-heading-icon" aria-hidden="true">
          <HandCoins size={30} />
        </div>
      </div>

      {paymentNumber && (
        <div className="success-banner" role="status">
          <CheckCircle2 size={24} />
          <div>
            <strong>Pelunasan berhasil dicatat</strong>
            <span>Nomor pembayaran {paymentNumber}. Riwayat Bon tetap tersimpan.</span>
          </div>
        </div>
      )}

      <div className="settlement-layout">
        <div className="workflow-main-column">
          <section className="workflow-card">
            <div className="workflow-card-heading">
              <div className="step-number">1</div>
              <div>
                <h3>Pilih pelanggan</h3>
                <p>Hanya pelanggan yang memiliki Bon belum lunas yang ditampilkan.</p>
              </div>
            </div>

            <label className="field settlement-customer-field">
              <span>Nama pelanggan</span>
              <div className="select-with-icon">
                <UserRound size={22} aria-hidden="true" />
                <select value={customer} onChange={(event) => changeCustomer(event.target.value)}>
                  {customerOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </label>
          </section>

          <section className="workflow-card">
            <div className="workflow-card-heading workflow-card-heading--split">
              <div className="workflow-card-heading-copy">
                <div className="step-number">2</div>
                <div>
                  <h3>Pilih Bon yang dibayar</h3>
                  <p>{customerBons.length} Bon belum lunas untuk pelanggan ini.</p>
                </div>
              </div>
              <button className="text-button" type="button" onClick={selectAll}>
                {customerBons.every((bon) => selectedBonNumbers.includes(bon.number)) ? "Batalkan semua" : "Pilih semua"}
              </button>
            </div>

            <div className="settlement-bon-list">
              {customerBons.map((bon) => {
                const selected = selectedBonNumbers.includes(bon.number);
                return (
                  <article className={`settlement-bon-card ${selected ? "settlement-bon-card--selected" : ""}`} key={bon.number}>
                    <label className="settlement-checkbox-row">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleBon(bon.number)}
                      />
                      <span className="custom-checkbox" aria-hidden="true">
                        {selected && <Check size={18} />}
                      </span>
                      <span className="settlement-bon-copy">
                        <strong>{bon.number}</strong>
                        <small>{bon.date}</small>
                      </span>
                      <strong className="settlement-bon-amount">{formatCurrency(bon.amount)}</strong>
                    </label>
                    <button className="text-button settlement-detail-button" type="button" onClick={() => onViewBon(bon.number)}>
                      Lihat rincian
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="settlement-summary workflow-card" aria-label="Ringkasan pelunasan">
          <div className="workflow-card-heading">
            <div className="step-number">3</div>
            <div>
              <h3>Periksa pembayaran</h3>
              <p>Pastikan Bon dan total sudah benar.</p>
            </div>
          </div>

          <div className="settlement-summary-customer">
            <span>Pelanggan</span>
            <strong>{customer}</strong>
          </div>

          <div className="settlement-summary-list">
            {selectedBons.length === 0 ? (
              <div className="empty-selection">
                <WalletCards size={28} />
                <span>Belum ada Bon yang dipilih.</span>
              </div>
            ) : (
              selectedBons.map((bon) => (
                <div className="settlement-summary-row" key={bon.number}>
                  <span>{bon.number}</span>
                  <strong>{formatCurrency(bon.amount)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="settlement-total">
            <span>Total pembayaran</span>
            <strong>{formatCurrency(total)}</strong>
            <small>{selectedBons.length} Bon dipilih</small>
          </div>

          <button
            className="button button--primary button--large button--full"
            type="button"
            disabled={selectedBons.length === 0}
            onClick={() => setConfirmationOpen(true)}
          >
            <HandCoins size={21} />
            Catat Pelunasan
          </button>
        </aside>
      </div>

      <ConfirmationDialog
        open={confirmationOpen}
        title="Catat pelunasan sekarang?"
        description="Setelah disimpan, Bon yang dipilih akan berubah menjadi Lunas dan masuk ke laporan kas."
        confirmLabel="Ya, Catat Pelunasan"
        onClose={() => setConfirmationOpen(false)}
        onConfirm={saveSettlement}
      >
        <div className="confirmation-summary">
          <span>{customer}</span>
          <strong>{formatCurrency(total)}</strong>
          <small>{selectedBons.length} Bon akan dilunasi</small>
        </div>
      </ConfirmationDialog>
    </section>
  );
}

export function BonDetailPage({ bon, onBack, onRecordSettlement }: BonDetailPageProps) {
  const [status, setStatus] = useState<BonStatus>(bon.status);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const breakdown = getBonBreakdown(bon);

  const confirmVoid = () => {
    if (!voidReason.trim() || ownerPin.length < 4) return;
    setStatus("Dibatalkan");
    setVoidOpen(false);
    setNotice("Bon berhasil dibatalkan. Riwayat pembayaran tetap disimpan.");
  };

  return (
    <section className="workflow-page" aria-labelledby="bon-detail-title">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={20} />
        Kembali ke daftar Bon
      </button>

      <div className="bon-detail-hero">
        <div>
          <span className="eyebrow">Detail transaksi</span>
          <h2 id="bon-detail-title">{bon.number}</h2>
          <p>{bon.customer} · {bon.date}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {notice && (
        <div className="success-banner" role="status">
          <CheckCircle2 size={24} />
          <div>
            <strong>Tindakan berhasil</strong>
            <span>{notice}</span>
          </div>
        </div>
      )}

      <div className="bon-detail-layout">
        <div className="workflow-main-column">
          <section className="workflow-card">
            <div className="workflow-card-heading">
              <div className="workflow-icon-badge"><PackageCheck size={24} /></div>
              <div>
                <h3>Produk dalam Bon</h3>
                <p>Harga dan diskon tersimpan sebagai snapshot transaksi.</p>
              </div>
            </div>

            <div className="bon-item-list">
              {breakdown.items.map((item) => (
                <article className="bon-item-row" key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.type} · {item.quantity} item</span>
                  </div>
                  <div className="bon-item-price">
                    <span>{formatCurrency(item.unitPrice)} × {item.quantity}</span>
                    <strong>{formatCurrency(item.subtotal)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="workflow-card">
            <div className="workflow-card-heading">
              <div className="workflow-icon-badge"><ReceiptText size={24} /></div>
              <div>
                <h3>Informasi transaksi</h3>
                <p>Rincian yang diperlukan untuk pemeriksaan dan pencatatan.</p>
              </div>
            </div>

            <dl className="detail-definition-grid">
              <div><dt>Pelanggan</dt><dd>{bon.customer}</dd></div>
              <div><dt>Tanggal</dt><dd>{bon.date}</dd></div>
              <div><dt>Diskon LM</dt><dd>{breakdown.discountLm}%</dd></div>
              <div><dt>Diskon BR</dt><dd>{breakdown.discountBr}%</dd></div>
              <div><dt>Ongkir</dt><dd>{formatCurrency(breakdown.shipping)}</dd></div>
              <div><dt>Laba transaksi</dt><dd>{formatCurrency(breakdown.profit)}</dd></div>
            </dl>
          </section>

          {status === "Dibatalkan" && (
            <section className="workflow-card danger-information-card">
              <ShieldAlert size={26} />
              <div>
                <h3>Bon telah dibatalkan</h3>
                <p>Alasan: {voidReason || "Kesalahan input transaksi"}</p>
                <small>Bon tidak dapat diedit atau dibayar kembali.</small>
              </div>
            </section>
          )}
        </div>

        <aside className="bon-total-card workflow-card">
          <h3>Ringkasan Tagihan</h3>
          <div className="bon-total-row"><span>Subtotal produk</span><strong>{formatCurrency(breakdown.subtotal)}</strong></div>
          <div className="bon-total-row"><span>Diskon pelanggan</span><strong>-{formatCurrency(breakdown.discount)}</strong></div>
          <div className="bon-total-row"><span>Ongkir</span><strong>{formatCurrency(breakdown.shipping)}</strong></div>
          <div className="bon-grand-total"><span>Total Bon</span><strong>{formatCurrency(bon.amount)}</strong></div>

          <div className="bon-action-stack">
            <button className="button button--secondary button--full" type="button" onClick={() => setNotice("PDF Bon siap diunduh pada fase integrasi API.")}>
              <Download size={20} />
              Unduh PDF
            </button>

            {status === "Belum Lunas" && (
              <>
                <button className="button button--primary button--full" type="button" onClick={() => onRecordSettlement(bon.number)}>
                  <HandCoins size={20} />
                  Catat Pelunasan
                </button>
                <button className="button button--secondary button--full" type="button" onClick={() => setNotice("Form edit Bon akan dibuka pada pengembangan berikutnya.")}>
                  <Pencil size={20} />
                  Edit Bon
                </button>
              </>
            )}

            {status === "Lunas" && (
              <button className="button button--danger button--full" type="button" onClick={() => setVoidOpen(true)}>
                <RotateCcw size={20} />
                Batalkan Bon
              </button>
            )}
          </div>

          <div className="history-card">
            <FileText size={21} />
            <div>
              <strong>Riwayat tersimpan</strong>
              <span>Perubahan status dan pembayaran tidak menghapus data lama.</span>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmationDialog
        open={voidOpen}
        title="Batalkan Bon ini?"
        description="Tindakan ini memerlukan PIN Owner dan alasan. Bon akan berstatus Dibatalkan dan tidak dapat dibayar lagi."
        confirmLabel="Batalkan Bon"
        tone="danger"
        onClose={() => setVoidOpen(false)}
        onConfirm={confirmVoid}
      >
        <label className="field">
          <span>PIN Owner</span>
          <input
            type="password"
            inputMode="numeric"
            value={ownerPin}
            onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Masukkan PIN"
          />
        </label>
        <label className="field">
          <span>Alasan pembatalan</span>
          <textarea
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            placeholder="Contoh: kesalahan input produk"
            rows={3}
          />
        </label>
        {(!voidReason.trim() || ownerPin.length < 4) && (
          <div className="form-warning">
            <AlertTriangle size={19} />
            PIN minimal 4 angka dan alasan wajib diisi.
          </div>
        )}
      </ConfirmationDialog>
    </section>
  );
}

function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "primary",
  onClose,
  onConfirm,
  children
}: ConfirmationDialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop workflow-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="confirmation-dialog-header">
          <div>
            <span className="eyebrow">Periksa kembali</span>
            <h2 id="confirmation-title">{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup dialog">
            <X size={22} />
          </button>
        </header>
        <p>{description}</p>
        {children && <div className="confirmation-dialog-content">{children}</div>}
        <footer className="confirmation-dialog-actions">
          <button className="button button--secondary" type="button" onClick={onClose}>Kembali</button>
          <button className={`button ${tone === "danger" ? "button--danger" : "button--primary"}`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

function getBonBreakdown(bon: BonRow) {
  const shipping = bon.number.endsWith("014") ? 25000 : bon.number.endsWith("012") ? 15000 : 0;
  const discount = Math.round((bon.amount - shipping) * 0.08);
  const subtotal = bon.amount - shipping + discount;
  const firstSubtotal = Math.round(subtotal * 0.62);
  const secondSubtotal = subtotal - firstSubtotal;

  return {
    subtotal,
    discount,
    shipping,
    profit: Math.round(bon.amount * 0.17),
    discountLm: 10,
    discountBr: 5,
    items: [
      {
        name: "Logam Mulia 1 Gram",
        type: "LM",
        quantity: 1,
        unitPrice: firstSubtotal,
        subtotal: firstSubtotal
      },
      {
        name: "Produk Retail Pilihan",
        type: "BR",
        quantity: 1,
        unitPrice: secondSubtotal,
        subtotal: secondSubtotal
      }
    ]
  };
}
