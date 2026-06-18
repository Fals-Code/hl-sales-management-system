import { AlertCircle, LoaderCircle } from "lucide-react";

export function PageLoadingState({ label = "Menyiapkan halaman" }: { label?: string }) {
  return (
    <section className="app-state-card app-state-card--loading" role="status" aria-live="polite">
      <span className="app-state-icon"><LoaderCircle size={38} /></span>
      <h2>{label}</h2>
      <p>Mohon tunggu sebentar. Tampilan sedang disiapkan.</p>
      <div className="app-state-skeleton" aria-hidden="true"><span /><span /><span /></div>
    </section>
  );
}

export function RouteFallbackState({ onBack }: { onBack: () => void }) {
  return (
    <section className="app-state-card" role="status">
      <span className="app-state-icon"><AlertCircle size={38} /></span>
      <h2>Halaman tidak ditemukan</h2>
      <p>Alamat halaman tidak dikenali. Kembali ke Dashboard untuk melanjutkan.</p>
      <button className="button button--primary" type="button" onClick={onBack}>Kembali ke Dashboard</button>
    </section>
  );
}
