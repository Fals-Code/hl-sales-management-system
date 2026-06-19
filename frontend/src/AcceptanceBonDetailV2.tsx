import { AlertTriangle, ArrowLeft, CheckCircle2, Download, HandCoins, Pencil, ReceiptText, ShieldAlert, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { calculateBon, currentIsoDate, toDisplayDate, type AcceptanceBonStatus } from "./acceptance-data";
import { bonApi, createApiFileObjectUrl, downloadApiFile, useApi } from "./api-client";
import { AcceptanceBonEditDialog } from "./AcceptanceBonEditDialog";
import { AcceptancePdfPreviewDialog } from "./AcceptancePdfPreviewDialog";
import { formatCurrency } from "./data";
import { SingleBonSettlementDialog } from "./SingleBonSettlementDialog";
import { useAppStore } from "./store";
import { settlementResourceApi, transactionResourceApi } from "./write-resources";

export function AcceptanceBonDetailPageV2({ bonNumber, onBack }: { bonNumber: string; onBack: () => void }) {
  const { customers, bons, updateBonStatus, softDeleteBon, refreshFromApi } = useAppStore();
  const sourceBon = bons.find((bon) => bon.number === bonNumber && !bon.deletedAt);
  const [paymentDate, setPaymentDate] = useState(sourceBon?.paymentDate ?? currentIsoDate());
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [action, setAction] = useState<"delete" | "void" | null>(null);
  const [ownerPin, setOwnerPin] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!pdfOpen || !useApi || !sourceBon?.backendId) {
      setPdfUrl(null);
      setPdfLoading(false);
      setPdfError(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setPdfUrl(null);
    setPdfLoading(true);
    setPdfError(null);

    void createApiFileObjectUrl(`/api/v1/pdf/bons/${encodeURIComponent(sourceBon.backendId)}`)
      .then((result) => {
        objectUrl = result.url;
        if (!active) {
          URL.revokeObjectURL(result.url);
          return;
        }
        setPdfUrl(result.url);
      })
      .catch((error) => {
        if (active) setPdfError(error instanceof Error ? error.message : "PDF Bon gagal dimuat.");
      })
      .finally(() => {
        if (active) setPdfLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfOpen, sourceBon?.backendId]);

  if (!sourceBon) return <section className="acceptance-empty"><ReceiptText size={38} /><h3>Bon tidak ditemukan</h3><p>Data mungkin telah dinonaktifkan atau Nomor Bon tidak valid.</p><button className="button button--primary" type="button" onClick={onBack}>Kembali</button></section>;

  const calculation = calculateBon(sourceBon);
  const status = sourceBon.status;

  const confirmSettlement = async () => {
    setProcessing(true);
    setOperationError(null);
    try {
      if (useApi) {
        const customer = customers.find((entry) => entry.code === sourceBon.customerCode);
        if (!sourceBon.backendId || !customer?.backendId) throw new Error("Data Bon atau pelanggan belum memiliki ID backend.");
        await settlementResourceApi.settle(customer.backendId, [sourceBon.backendId], paymentDate);
        await refreshFromApi();
      } else {
        updateBonStatus(sourceBon.number, "Lunas", paymentDate);
      }
      setSettlementOpen(false);
      setNotice(`Bon ditandai Lunas pada ${toDisplayDate(paymentDate)}. Omzet dan laba sekarang diakui.`);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Pelunasan Bon gagal diproses.");
    } finally {
      setProcessing(false);
    }
  };

  const confirmSensitiveAction = async () => {
    setProcessing(true);
    setOperationError(null);
    try {
      if (action === "delete") {
        if (useApi) {
          if (!sourceBon.backendId) throw new Error("ID backend Bon tidak tersedia.");
          await bonApi.remove(sourceBon.backendId);
          await refreshFromApi();
        } else {
          softDeleteBon(sourceBon.number);
        }
        setAction(null);
        onBack();
        return;
      }
      if (action === "void" && ownerPin.length >= 4 && reason.trim().length >= 8) {
        if (useApi) {
          if (!sourceBon.backendId) throw new Error("ID backend Bon tidak tersedia.");
          await transactionResourceApi.void(sourceBon.backendId, ownerPin, reason.trim());
          await refreshFromApi();
        } else {
          updateBonStatus(sourceBon.number, "Void");
        }
        setNotice("Bon Lunas berhasil di-Void dengan otorisasi Owner.");
        setAction(null);
        setOwnerPin("");
        setReason("");
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Tindakan pada Bon gagal diproses.");
    } finally {
      setProcessing(false);
    }
  };

  const downloadBonPdf = async () => {
    if (!useApi || !sourceBon.backendId) {
      window.print();
      return;
    }
    try {
      await downloadApiFile(`/api/v1/pdf/bons/${encodeURIComponent(sourceBon.backendId)}`, `bon-${sourceBon.number}.pdf`);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "PDF Bon gagal diunduh.");
    }
  };

  const openPrintablePdf = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.print();
  };

  return (
    <section className="acceptance-page">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={20} />Kembali ke daftar Bon</button>
      <header className="acceptance-bon-hero"><div><span className="eyebrow">Detail transaksi</span><h2>{sourceBon.number}</h2><p>{calculation.customer.name} · {toDisplayDate(sourceBon.date)}</p></div><StatusBadge status={status} /></header>
      {notice && <div className="success-banner"><CheckCircle2 size={23} /><div><strong>Tindakan berhasil</strong><span>{notice}</span></div></div>}
      {operationError && <div className="acceptance-warning"><AlertTriangle size={20} /><span>{operationError}</span></div>}

      <div className="acceptance-detail-layout">
        <div className="acceptance-detail-main">
          <section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Produk dan snapshot</span><h3>Rincian Baris</h3></div><ReceiptText size={24} /></div><div className="bon-detail-line-list">{calculation.lineDetails.map((line, index) => <article className="bon-detail-line" key={`${line.product.id}-${index}`}><div><strong>{line.product.name}</strong><small>{line.product.type} · {line.quantity} unit · Diskon {line.discounts.map((value) => `${value}%`).join(" → ")}</small>{line.usesSnapshot && <span className="mini-info-badge">Snapshot saat transaksi</span>}</div><dl><div><dt>Harga Base</dt><dd>{formatCurrency(line.product.basePrice)}</dd></div><div><dt>Harga Diterapkan</dt><dd>{formatCurrency(line.discountedUnitPrice)}</dd></div><div><dt>{sourceBon.isBonus ? "Biaya Bonus" : "Omzet Baris"}</dt><dd>{formatCurrency(sourceBon.isBonus ? line.lineBonusCost : line.lineOmzet)}</dd></div></dl></article>)}</div></section>
          <section className="acceptance-card"><div className="acceptance-card-heading"><div><span className="eyebrow">Informasi Bon</span><h3>Data Transaksi</h3></div><ReceiptText size={24} /></div><dl className="bon-information-grid"><div><dt>Tanggal transaksi</dt><dd>{toDisplayDate(sourceBon.date)}</dd></div><div><dt>Status</dt><dd>{status}</dd></div><div><dt>Tanggal Pelunasan</dt><dd>{status === "Lunas" ? toDisplayDate(sourceBon.paymentDate) : "-"}</dd></div><div><dt>Deskripsi</dt><dd>{sourceBon.description || "-"}</dd></div><div><dt>Jenis</dt><dd>{sourceBon.isBonus ? "Bonus Bon" : "Penjualan Normal"}</dd></div><div><dt>Ongkir</dt><dd>{formatCurrency(sourceBon.shipping)}</dd></div><div><dt>Pajak/PPN</dt><dd>Tidak ada</dd></div><div><dt>Mata uang</dt><dd>IDR (Rp)</dd></div></dl></section>
        </div>

        <aside className="acceptance-card bon-acceptance-summary"><h3>Ringkasan</h3><SummaryMoney label="Omzet" value={calculation.omzet} /><SummaryMoney label="Ongkir" value={sourceBon.shipping} /><SummaryMoney label="Laba HL" value={calculation.profit} />{sourceBon.isBonus && <SummaryMoney label="Biaya bonus/promosi" value={calculation.bonusCost} />}<div className="acceptance-total"><span>Total Tagihan</span><strong>{formatCurrency(calculation.amountOwed)}</strong></div>{calculation.negativeProfit && <div className="acceptance-warning"><AlertTriangle size={20} /><span>Transaksi memiliki laba negatif. Jejak otorisasi Owner wajib disimpan.</span></div>}<div className="bon-detail-action-stack"><button className="button button--secondary button--full" type="button" onClick={() => setPdfOpen(true)}><Download size={19} />Preview PDF</button>{status === "Piutang" && <><button className="button button--primary button--full" type="button" disabled={processing} onClick={() => setSettlementOpen(true)}><HandCoins size={19} />Tandai Lunas</button><button className="button button--secondary button--full" type="button" disabled={processing} onClick={() => setEditOpen(true)}><Pencil size={19} />Edit Bon</button><button className="button button--danger button--full" type="button" disabled={processing} onClick={() => setAction("delete")}><Trash2 size={19} />Nonaktifkan Bon</button></>}{status === "Lunas" && <button className="button button--danger button--full" type="button" disabled={processing} onClick={() => setAction("void")}><ShieldAlert size={19} />Void Bon</button>}</div></aside>
      </div>

      <SingleBonSettlementDialog open={settlementOpen} bonNumber={sourceBon.number} customerName={calculation.customer.name} total={calculation.amountOwed} paymentDate={paymentDate} setPaymentDate={setPaymentDate} processing={processing} onClose={() => setSettlementOpen(false)} onConfirm={() => { void confirmSettlement(); }} />
      <AcceptanceBonEditDialog bon={editOpen ? sourceBon : null} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); setNotice("Perubahan Bon Piutang berhasil disimpan dan perhitungan diperbarui."); }} />
      <SensitiveDialog action={action} bonNumber={sourceBon.number} ownerPin={ownerPin} setOwnerPin={setOwnerPin} reason={reason} setReason={setReason} processing={processing} onClose={() => setAction(null)} onConfirm={() => { void confirmSensitiveAction(); }} />

      <AcceptancePdfPreviewDialog
        open={pdfOpen}
        title={sourceBon.number}
        subtitle={`${calculation.customer.name} · ${toDisplayDate(sourceBon.date)} · ${status}`}
        documentUrl={pdfUrl}
        loading={pdfLoading}
        error={pdfError}
        onClose={() => setPdfOpen(false)}
        onPrint={openPrintablePdf}
        onDownload={() => { void downloadBonPdf(); }}
      >
        <div className="acceptance-paper-brand"><div><strong>HL</strong><span>Bon Penjualan</span></div><small>IDR (Rp) · Tanpa PPN</small></div>
        <section className="acceptance-paper-title"><span className="eyebrow">{status}</span><h2>{sourceBon.number}</h2><p>{calculation.customer.name} · {toDisplayDate(sourceBon.date)}</p></section>
        <table className="acceptance-paper-table"><thead><tr><th>Produk</th><th>Tipe</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>{calculation.lineDetails.map((line, index) => <tr key={`${line.product.id}-${index}`}><td>{line.product.name}</td><td>{line.product.type}</td><td>{line.quantity}</td><td>{formatCurrency(sourceBon.isBonus ? 0 : line.discountedUnitPrice)}</td><td>{formatCurrency(sourceBon.isBonus ? 0 : line.lineOmzet)}</td></tr>)}</tbody></table>
        <div className="acceptance-paper-total"><span>Total Tagihan</span><strong>{formatCurrency(sourceBon.isBonus ? 0 : calculation.amountOwed)}</strong></div>
        <footer className="acceptance-paper-footer"><span>Simpan sebagai bukti transaksi</span><span>Dokumen dibuat otomatis</span></footer>
      </AcceptancePdfPreviewDialog>
    </section>
  );
}

function SensitiveDialog({ action, bonNumber, ownerPin, setOwnerPin, reason, setReason, processing, onClose, onConfirm }: { action: "delete" | "void" | null; bonNumber: string; ownerPin: string; setOwnerPin: (value: string) => void; reason: string; setReason: (value: string) => void; processing: boolean; onClose: () => void; onConfirm: () => void }) { if (!action) return null; const voidAction = action === "void"; const valid = !voidAction || (ownerPin.length >= 4 && reason.trim().length >= 8); return <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="acceptance-master-dialog acceptance-master-dialog--small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">{voidAction ? "Otorisasi Owner" : "Soft-delete"}</span><h2>{voidAction ? "Void Bon Lunas" : "Nonaktifkan Bon Piutang"}</h2><p>{bonNumber} tetap tersimpan dalam riwayat audit.</p></div><button className="icon-button" type="button" disabled={processing} onClick={onClose}><X size={22} /></button></header><div className="acceptance-master-body">{voidAction ? <><label className="field"><span>PIN Owner *</span><input type="password" inputMode="numeric" disabled={processing} value={ownerPin} onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label className="field"><span>Alasan Void *</span><textarea rows={3} disabled={processing} value={reason} onChange={(event) => setReason(event.target.value)} /></label></> : <div className="acceptance-warning"><AlertTriangle size={20} /><span>Bon disembunyikan dari transaksi aktif, tetapi data historis tidak dihapus.</span></div>}</div><footer><button className="button button--secondary" type="button" disabled={processing} onClick={onClose}>Batal</button><button className="button button--danger" type="button" disabled={!valid || processing} onClick={onConfirm}>{processing ? "Memproses..." : voidAction ? "Void Bon" : "Nonaktifkan Bon"}</button></footer></section></div>; }
function StatusBadge({ status }: { status: AcceptanceBonStatus }) { const tone = status === "Lunas" ? "success" : status === "Piutang" ? "warning" : status === "Bonus" ? "bonus" : "danger"; return <span className={`acceptance-status acceptance-status--${tone}`}>{status}</span>; }
function SummaryMoney({ label, value }: { label: string; value: number }) { return <div className="acceptance-summary-row"><span>{label}</span><strong>{formatCurrency(value)}</strong></div>; }
