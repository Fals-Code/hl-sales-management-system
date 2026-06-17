import { LogOut } from "lucide-react";

export function LogoutConfirmDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop acceptance-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="acceptance-confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <LogOut size={36} />
        <h2>Keluar dari aplikasi?</h2>
        <p>Pastikan tidak ada pekerjaan yang belum disimpan sebelum keluar.</p>
        <div><button className="button button--secondary" type="button" onClick={onClose}>Tetap Masuk</button><button className="button button--danger" type="button" onClick={onConfirm}>Ya, Keluar</button></div>
      </section>
    </div>
  );
}
