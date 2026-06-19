# Phase 5 — Backend and Frontend Integration

Phase 5 dibangun dari baseline Phase 4 pada branch `phase-4-complete` dan dikerjakan pada branch:

```text
phase-5-api-integration
```

## Status

**SELESAI — 5 dari 5 slice (100%)**

Frontend sekarang menggunakan backend API dan PostgreSQL sebagai sumber data utama ketika `VITE_USE_API=true`. Perubahan tetap tersedia setelah reload browser, sementara localStorage hanya dipertahankan untuk mode demo.

## Slice yang diselesaikan

### Slice 1 — Authentication dan authoritative hydration

- Login, logout, cookie session, protected route, dan penanganan session expired terhubung ke API.
- Hydration awal menggunakan satu endpoint authoritative `GET /api/v1/bootstrap`.
- Bootstrap memuat customer, product, Bon, snapshot transaksi, bonus availability, dan bonus ledger.
- Loading, retry, unauthorized, timeout, server error, dan network error ditangani pada frontend.

### Slice 2 — Customer dan Product Integration

- Customer dapat ditampilkan, ditambah, diedit, dan di-soft-delete melalui API.
- Diskon LM/BR bertingkat dan bonus threshold tersimpan di backend.
- Product dapat ditampilkan, ditambah, diedit, dan di-soft-delete melalui API.
- ID database dipisahkan dari kode tampilan, sementara histori Bon tetap memakai snapshot.

### Slice 3 — Transaction Integration

- Customer dan product aktif diambil dari backend.
- Preview diskon bertingkat, pembulatan Rp100, omzet, laba, ongkir, dan total tagihan konsisten dengan backend.
- Bon normal dan Bonus Bon dapat dibuat melalui API.
- Bon Piutang dapat dilihat, diedit, dan di-soft-delete.
- Duplicate Nomor Bon, produk/customer tidak aktif, Bon Lunas, dan transaksi laba negatif memakai error serta otorisasi backend.
- Setelah setiap write action, frontend melakukan refresh authoritative dari API.

### Slice 4 — Settlement, Bonus, Reporting, dan Error Handling

- Pelunasan satu atau beberapa Bon serta pelunasan bulanan tersimpan di PostgreSQL.
- Pembatalan pembayaran dan Void Bon memakai PIN Owner serta alasan audit.
- Total Piutang, pembayaran, omzet, laba, dan bonus diperbarui setelah settlement/cancellation/Void.
- Bonus availability, Bonus Bon, saldo tersisa, dan ledger bonus ditampilkan dari backend.
- Laporan memakai `paymentDate` untuk omzet/laba/pembayaran dan `bonDate` untuk Piutang.
- Breakdown LM/BR berasal dari scoped lines yang sama.
- Rekap dan PDF diambil langsung dari reporting/PDF API.

### Slice 5 — Integration Hardening dan Validation

- Ditambahkan Playwright E2E dengan PostgreSQL dan API nyata.
- Alur yang diuji: login, create/edit customer, create/edit product, create/edit Bon, reload, settlement, cancellation, settlement ulang, Void, Bonus Bon, soft-delete Bon, laporan, PDF, dan logout/session reset.
- CORS diperbaiki agar seluruh method CRUD (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) dapat digunakan frontend.
- API client tidak lagi mengirim `Content-Type: application/json` pada request tanpa body, sehingga DELETE dan logout tidak gagal pada parser JSON.
- Viewport dan visual regression Phase 4 tetap dijalankan.

## Definition of Done

- [x] Seluruh halaman utama membaca data dari API.
- [x] Seluruh write action utama tersimpan di PostgreSQL.
- [x] Reload browser tidak menghilangkan perubahan.
- [x] localStorage bukan source of truth pada mode API.
- [x] API dan frontend memakai kontrak serta error lifecycle yang konsisten.
- [x] Authentication cookie berfungsi end-to-end.
- [x] Backend dependency audit, typecheck, lint, dan test lulus.
- [x] Frontend dependency audit, typecheck, unit test, dan production build lulus.
- [x] Browser/visual regression lulus.
- [x] Real API Playwright integration test lulus.

Validasi terakhir dijalankan oleh workflow **Phase 5 Integration Validation** pada branch `phase-5-api-integration`.

## Konfigurasi lokal

Frontend:

```env
VITE_USE_API=true
VITE_API_BASE_URL=http://localhost:3000
```

Backend:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hl_app?schema=public
FRONTEND_ORIGIN=http://localhost:5173
SESSION_COOKIE_NAME=hl_session
SESSION_COOKIE_SECURE=false
```

Untuk lingkungan HTTPS, aktifkan secure cookie dan gunakan origin eksplisit.
