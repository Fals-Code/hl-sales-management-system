import { FileText, X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function AcceptancePdfPreviewDialog({ open, title, subtitle, children, onClose, onPrint }: { open: boolean; title: string; subtitle: string; children: ReactNode; onClose: () => void; onPrint: () => void }) {
  if (!open) return null;

  return createPortal(
    <div className="dialog-backdrop acceptance-dialog-backdrop acceptance-pdf-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="acceptance-pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="acceptance-pdf-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="acceptance-pdf-header">
          <div className="acceptance-pdf-heading">
            <span className="acceptance-page-icon"><FileText size={27} /></span>
            <div><span className="eyebrow">Preview dokumen</span><h2 id="acceptance-pdf-title">{title}</h2><p>{subtitle}</p></div>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup preview"><X size={23} /></button>
        </header>
        <div className="acceptance-pdf-body">
          <div className="acceptance-paper-preview">
            <div className="acceptance-paper-brand"><div><strong>HL</strong><span>Sales & Receivables Management</span></div><small>IDR (Rp) · Tanpa PPN</small></div>
            {children}
            <footer className="acceptance-paper-footer"><span>HL Sales</span><span>Dokumen laporan</span></footer>
          </div>
        </div>
        <footer className="acceptance-pdf-actions">
          <p>Gunakan dialog cetak browser untuk menyimpan dokumen sebagai PDF.</p>
          <div><button className="button button--secondary" type="button" onClick={onClose}>Tutup</button><button className="button button--primary" type="button" onClick={onPrint}>Cetak Dokumen</button></div>
        </footer>
      </section>
    </div>,
    document.body
  );
}

export function PdfMetric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return <div className="acceptance-pdf-metric"><span>{label}</span><strong>{value}</strong>{helper && <small>{helper}</small>}</div>;
}
