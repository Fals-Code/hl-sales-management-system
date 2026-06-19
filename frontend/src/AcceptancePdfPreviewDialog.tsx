import { Download, FileText, LoaderCircle, Printer, X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function AcceptancePdfPreviewDialog({
  open,
  title,
  subtitle,
  children,
  documentUrl,
  loading = false,
  error,
  onClose,
  onDownload,
  onPrint
}: {
  open: boolean;
  title: string;
  subtitle: string;
  children?: ReactNode;
  documentUrl?: string | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div className="dialog-backdrop acceptance-dialog-backdrop acceptance-pdf-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="acceptance-pdf-dialog acceptance-pdf-dialog--document" role="dialog" aria-modal="true" aria-labelledby="acceptance-pdf-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="acceptance-pdf-header">
          <div className="acceptance-pdf-heading">
            <span className="acceptance-page-icon"><FileText size={27} /></span>
            <div><span className="eyebrow">Preview PDF resmi</span><h2 id="acceptance-pdf-title">{title}</h2><p>{subtitle}</p></div>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup preview"><X size={23} /></button>
        </header>

        <div className="acceptance-pdf-body acceptance-pdf-body--document">
          {loading && <div className="acceptance-pdf-state" role="status"><LoaderCircle className="spin" size={34} /><strong>Menyiapkan dokumen</strong><span>PDF sedang dibuat dari data transaksi terbaru.</span></div>}
          {!loading && error && <div className="acceptance-pdf-state acceptance-pdf-state--error" role="alert"><FileText size={34} /><strong>Preview gagal dimuat</strong><span>{error}</span></div>}
          {!loading && !error && documentUrl && <iframe className="acceptance-pdf-frame" title={`Preview ${title}`} src={`${documentUrl}#toolbar=0&navpanes=0&view=FitH`} />}
          {!loading && !error && !documentUrl && children && <div className="acceptance-paper-preview">{children}</div>}
        </div>

        <footer className="acceptance-pdf-actions">
          <p>Preview menampilkan file PDF yang sama dengan hasil unduhan, bukan simulasi halaman HTML.</p>
          <div>
            <button className="button button--secondary" type="button" onClick={onClose}>Tutup</button>
            <button className="button button--secondary" type="button" disabled={loading || Boolean(error)} onClick={onPrint}><Printer size={18} />Buka / Cetak</button>
            <button className="button button--primary" type="button" disabled={loading || Boolean(error)} onClick={onDownload}><Download size={18} />Unduh PDF</button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
}

export function PdfMetric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return <div className="acceptance-pdf-metric"><span>{label}</span><strong>{value}</strong>{helper && <small>{helper}</small>}</div>;
}
