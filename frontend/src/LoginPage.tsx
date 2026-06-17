import { AlertCircle, Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "./BrandLogo";

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Nama pengguna dan kata sandi wajib diisi.");
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      if (username === "admin" && password === "password") {
        onLogin();
      } else {
        setError("Nama pengguna atau kata sandi tidak benar.");
      }
    }, 450);
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-lockup">
          <BrandLogo size={82} />
          <div><strong>HL Sales</strong><span>Management System</span></div>
        </div>
        <span className="eyebrow">HL Sales Management</span>
        <h1>Kelola transaksi toko dengan lebih sederhana.</h1>
        <p>Bon, piutang, pelunasan, bonus, dan laporan tersusun dalam satu sistem yang mudah dibaca.</p>
        <div className="login-trust-list">
          <span><ShieldCheck size={21} />Data transaksi tersimpan aman</span>
          <span><LockKeyhole size={21} />Tindakan sensitif memakai PIN Owner</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-mobile-lockup">
            <BrandLogo size={64} />
            <div><strong>HL Sales</strong><span>Manajemen Toko</span></div>
          </div>
          <span className="eyebrow">Selamat datang</span>
          <h2>Masuk ke aplikasi</h2>
          <p>Gunakan akun utama. Tidak tersedia pendaftaran akun baru.</p>

          {error && <div className="login-error" role="alert"><AlertCircle size={21} /><span>{error}</span></div>}

          <form onSubmit={submit}>
            <label className="field">
              <span>Nama pengguna</span>
              <div className="input-with-icon">
                <UserRound size={21} />
                <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" aria-invalid={Boolean(error)} />
              </div>
            </label>

            <label className="field">
              <span>Kata sandi</span>
              <div className="input-with-icon">
                <LockKeyhole size={21} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" aria-invalid={Boolean(error)} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showPassword ? <EyeOff size={21} /> : <Eye size={21} />}</button>
              </div>
            </label>

            <button className="button button--primary button--large button--full" type="submit" disabled={submitting}>
              <LogIn size={21} />
              {submitting ? "Memeriksa akun..." : "Masuk"}
            </button>
          </form>

          <small className="login-help">Akun demo: admin / password. Integrasi session dilakukan pada fase berikutnya.</small>
        </div>
      </section>
    </main>
  );
}
