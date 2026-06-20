# Phase 6 — Testing, Acceptance, and Deployment

## Tujuan

Phase 6 mengubah hasil integrasi Phase 5 menjadi release candidate yang dapat diuji, di-deploy, dan dinilai tanpa bergantung pada penjelasan lisan pengembang. Dokumen requirement dan acceptance criteria menjadi kontrak pengujian utama.

## Status masuk

Status saat dokumen ini dibuat: **READY CANDIDATE**.

Phase 6 hanya boleh dimulai dari commit yang memenuhi seluruh gate berikut:

- backend build dan typecheck lulus;
- backend lint lulus tanpa pengecualian baru;
- backend test suite lulus dengan PostgreSQL;
- migration dapat dijalankan pada database bersih;
- frontend typecheck, unit test, dan production build lulus;
- browser regression dan API-connected E2E lulus;
- tidak ada pull request fitur Phase 5 yang masih tertinggal;
- konfigurasi rahasia tidak tersimpan di repository.

## Sumber kebenaran

Urutan acuan ketika terdapat perbedaan:

1. `acceptance-criteria-HL-app.pdf`;
2. keputusan bisnis client yang sudah dikonfirmasi;
3. aturan domain dan snapshot transaksi di backend;
4. kontrak OpenAPI pada `/docs` dan `/docs/json`;
5. perilaku frontend.

Frontend tidak boleh menjadi sumber hitung keuangan yang berbeda dari backend.

## Perintah verifikasi lokal

### Backend

```bash
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run typecheck
npm run lint
npm test
```

### Frontend

```bash
cd frontend
npm install --no-audit --no-fund
npm run typecheck
npm test
npm run build
```

### E2E terhubung API

```bash
cd frontend
npm run test:e2e:api
```

E2E memerlukan PostgreSQL, backend, frontend, serta environment pengujian yang sesuai dengan workflow repository.

## Acceptance matrix wajib

| Area | Skenario minimum | Bukti |
|---|---|---|
| Authentication | login valid, login salah, protected route, logout, session expired | screenshot/log E2E |
| Customer | create, edit, diskon LM/BR, threshold, soft-delete, histori tetap ada | E2E/API |
| Product | create, edit, stok, tipe LM/BR, soft-delete | E2E/API |
| Bon | create, multi-item, snapshot, Nomor Bon duplikat, edit Piutang, soft-delete Piutang | E2E/API |
| Perhitungan | cascading discount, floor tiap tahap, pembulatan Rp100, ongkir, omzet, laba | unit test |
| Otorisasi | laba negatif, PIN salah, PIN benar, alasan wajib | unit/integration test |
| Settlement | satu Bon, bulanan, tanggal pelunasan, settle ulang ditolak | E2E/API |
| Cancellation/Void | pembatalan pembayaran, Void Bon Lunas, reversal total dan bonus | E2E/API |
| Bonus | eligibility, beberapa bonus, carryover, Bonus Bon Rp0 | E2E/API |
| Reporting | cash basis memakai payment date, Piutang memakai bon date, LM/BR scoped | unit/E2E |
| PDF | Bon normal, Bonus Bon, laporan kosong, multi-halaman, tanpa data internal pelanggan | regression artifact |
| Notification | persistence, read, read-all, dismiss, SSE, event domain | integration test |
| Responsive | target desktop dan mobile, dialog, sticky action, touch target | visual review |

## Environment production

Backend menggunakan variabel berikut:

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
APP_USERNAME=owner
APP_PASSWORD=replace-with-strong-password
OWNER_PIN=replace-with-strong-pin
API_PORT=3000
FRONTEND_ORIGIN=https://app.example.com
SESSION_COOKIE_NAME=hl_session
SESSION_COOKIE_SECURE=true
SESSION_MAX_AGE=43200
```

Frontend menggunakan:

```env
VITE_USE_API=true
VITE_API_BASE_URL=https://api.example.com
```

Nilai production wajib disimpan pada secret manager platform deployment. File `.env` production tidak boleh di-commit.

## Urutan deployment

1. Provision PostgreSQL production.
2. Buat backup awal atau snapshot kosong.
3. Isi secret backend dan frontend.
4. Jalankan `npm ci` dan `npm run db:generate`.
5. Jalankan `npm run db:migrate:deploy` satu kali sebelum trafik dibuka.
6. Jalankan seed hanya untuk pembuatan akun awal dan jangan mengulangnya tanpa pemeriksaan.
7. Deploy backend dan pastikan `/health` mengembalikan status berhasil.
8. Deploy frontend dengan `VITE_USE_API=true`.
9. Verifikasi CORS, cookie secure, login, dan persistence setelah refresh.
10. Jalankan production smoke test.

## Production smoke test

Urutan minimum:

```text
Login
→ tambah customer
→ tambah produk
→ buat Bon
→ buka detail dan PDF
→ lunasi Bon
→ cek laporan
→ refresh dan login ulang
→ pastikan data tetap ada
```

Kemudian uji Nomor Bon duplikat, PIN salah, transaksi rugi, pembatalan pembayaran, Void, Bonus Bon, report PDF, logout, dan session expired.

## Backup dan rollback

Sebelum pengumpulan final:

- backup database berhasil dibuat;
- restore diuji pada database terpisah;
- migration bersifat forward-only dan tercatat;
- commit deployment dicatat;
- rollback aplikasi dapat mengarah ke release sebelumnya;
- rollback database tidak dilakukan dengan menghapus migration yang sudah pernah dijalankan.

## Release blockers

Deployment final tidak boleh diteruskan apabila salah satu kondisi berikut terjadi:

- CI merah atau test dilewati tanpa alasan terdokumentasi;
- migration gagal pada database bersih;
- angka frontend berbeda dari response backend;
- data hilang setelah refresh atau login ulang;
- Bon Lunas masih dapat diedit langsung;
- cash-basis report memakai tanggal Bon untuk omzet/laba;
- PDF menampilkan harga modal, laba internal, atau halaman kosong tambahan;
- production memakai password/PIN contoh;
- HTTPS atau secure cookie belum aktif;
- backup dan restore belum pernah diuji.

## Output Phase 6

- URL aplikasi production;
- URL API health dan dokumentasi API;
- akun demo/penilai yang aman;
- hasil acceptance matrix;
- bukti CI dan E2E;
- dokumentasi deployment dan rollback;
- user guide singkat;
- release notes dan known limitations;
- backup awal production.
