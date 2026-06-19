# Phase 5 Readiness Handoff

Dokumen ini menjadi gate akhir sebelum integrasi penuh frontend dan API pada Phase 5.

## Status saat ini

**Code-level readiness: LULUS.**

Branch kesiapan:

```text
phase-4-readiness-fix
```

Pull request:

```text
#2 fix(phase4): readiness remediation before Phase 5
```

## Perbaikan yang telah ditutup

### Backend dan API

- Kontrak Nomor Bon frontend/backend memakai format yang sama.
- Nomor Bon dapat diberikan client atau dibuat server secara aman.
- Prefix `BON` dan `BONUS` mengikuti jenis transaksi.
- Tanggal Bon menerima format tanggal atau ISO datetime yang valid.
- Deskripsi Bon tidak terhapus saat PATCH tidak mengirim field tersebut.
- Snapshot harga modal, harga base, tipe produk, dan diskon dipertahankan.
- Piutang scope LM/BR dihitung dari baris produk terkait, bukan seluruh Bon campuran.
- Omzet, laba, dan pembayaran memakai tanggal pelunasan.
- Carryover omzet tetap dipakai setelah perubahan threshold bonus.
- Otorisasi transaksi rugi, Void, dan pembatalan pembayaran tetap membutuhkan PIN Owner serta alasan.

### Frontend

- `AppStore` menjadi sumber data bersama untuk customer, product, Bon, settlement, edit, delete, dan laporan.
- Pelunasan, pembatalan, Void, dan soft-delete bertahan lintas halaman.
- Laporan Lunas memakai `paymentDate`; Piutang memakai `bonDate`.
- Perhitungan scope LM/BR memakai snapshot baris yang sama.
- API client mengirim cookie dengan `credentials: include`.
- Login, logout, pemeriksaan sesi, timeout, network error, dan session expiry memiliki lifecycle yang jelas.
- ID database dipisahkan dari kode tampilan customer/product.
- Form transaksi rugi menyediakan PIN Owner dan alasan.
- Editor produk tidak lagi memakai `window.prompt`.
- Test frontend untuk cash basis dan scope snapshot tersedia.

## Gate otomatis

Workflow `Phase 4 Readiness Validation` wajib lulus seluruh langkah berikut:

### Backend

```text
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run typecheck
npm run lint
npm test
```

### Frontend

```text
npm install --no-audit --no-fund
npm run typecheck
npm test
npm run build
```

Artifact log backend dan frontend diunggah pada setiap run agar kegagalan dapat diaudit.

## Gate manual yang masih wajib

Sebelum PR dinyatakan siap merge, lakukan regression test browser pada ukuran berikut:

- 320 × 568
- 390 × 844
- 430 × 932
- 768 × 1024
- 1024 × 768
- 1366 × 768
- 1920 × 1080

Periksa juga:

- zoom browser 125% dan 150%;
- navigasi keyboard tanpa mouse;
- dialog saat keyboard mobile terbuka;
- high contrast dan reduced motion;
- nominal Rupiah tidak terpotong;
- tabel berubah menjadi kartu pada layar kecil;
- dialog tidak tertutup bottom navigation;
- tombol sensitif memiliki jarak aman dari tombol utama;
- alur create, edit, settle, cancel payment, Void, bonus, dan report konsisten setelah berpindah halaman.

## Urutan merge

1. Pastikan CI PR #2 hijau.
2. Selesaikan manual browser/device regression.
3. Ubah PR #2 dari draft menjadi ready dan merge ke `phase-4-audit-fix`.
4. Jalankan ulang CI PR Phase 4 utama.
5. Merge Phase 4 ke branch target proyek.
6. Buat tag atau release marker `phase-4-complete`.
7. Mulai Phase 5 dari commit hasil merge tersebut.

## Batas pekerjaan Phase 5

Phase 5 dimulai dengan mengganti data seed/localStorage menggunakan hydration API nyata. Adapter frontend sudah menyediakan pemisahan `backendId` dan kode tampilan, tetapi proses list/create/update/delete seluruh resource melalui API tetap merupakan pekerjaan integrasi Phase 5.

Konfigurasi frontend untuk integrasi lokal:

```env
VITE_USE_API=true
VITE_API_BASE_URL=http://localhost:3000
```

Konfigurasi backend minimum:

```env
DATABASE_URL=postgresql://...
FRONTEND_ORIGIN=http://localhost:5173
SESSION_COOKIE_NAME=hl_session
SESSION_COOKIE_SECURE=false
```

Untuk deployment HTTPS, aktifkan cookie secure dan sesuaikan origin secara eksplisit.
