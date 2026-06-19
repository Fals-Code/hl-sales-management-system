# Phase 5 Kickoff — API Integration

Phase 5 dimulai dari commit penyelesaian Phase 4 yang ditandai oleh branch `phase-4-complete`.

Branch kerja:

```text
phase-5-api-integration
```

## Tujuan

Mengganti data seed dan localStorage sebagai sumber data utama dengan backend API nyata tanpa mengubah desain visual yang telah lulus acceptance dan visual regression.

## Status implementasi

### Slice 1 — authoritative read dan master write

Status: **LULUS CI**

Selesai:

- hydration customer, product, dan Bon dari seluruh halaman API;
- session-aware loading, retry, stale-session reset, dan network failure state;
- mapper DTO ke model UI, termasuk snapshot produk/pelanggan historis;
- pemisahan ID database dari kode tampilan;
- create, edit, dan soft-delete customer melalui API;
- create, edit, dan soft-delete product melalui API;
- settlement multi-Bon dan cancellation pembayaran melalui API;
- localStorage hanya digunakan pada mode demo, bukan sebagai source of truth saat `VITE_USE_API=true`;
- unit test mapper frontend dan integration test payload backend;
- dependency audit, typecheck, lint, backend tests, frontend tests, production build, dan browser regression lulus pada workflow run 94.

Masih dikerjakan sebelum PR keluar dari draft:

- refresh authoritative setelah create Bon;
- edit dan soft-delete Bon melalui API pada seluruh jalur UI;
- Void Bon melalui API dengan otorisasi Owner;
- hydration riwayat settlement dan bonus yang lebih lengkap;
- report/export yang langsung menggunakan respons backend;
- Playwright E2E dengan PostgreSQL dan API nyata.

## Urutan pengerjaan

### 1. Backend readiness

- Pastikan seluruh endpoint customer, product, Bon, settlement, bonus, Void, report, dan authentication memiliki kontrak final.
- Tambahkan endpoint yang masih diperlukan untuk hydration awal aplikasi.
- Pastikan pagination, filter, sorting, error envelope, dan transaksi database konsisten.
- Pertahankan snapshot transaksi, cash basis, threshold carryover, serta audit authorization.

### 2. API contract dan adapter

- Definisikan tipe DTO request/response frontend.
- Pisahkan ID database dari kode tampilan.
- Buat mapper API ke model UI dan sebaliknya.
- Tangani validation, duplicate value, conflict, unauthorized, timeout, dan network failure secara terpusat.

### 3. UI state integration

- Hydrate customer, product, Bon, settlement, bonus, dan report dari API.
- Tambahkan loading, empty, retry, stale-session, dan failure state tanpa merusak layout.
- Pertahankan snapshot tampilan untuk transaksi historis.
- Hapus mutasi langsung terhadap seed array setelah resource terkait terintegrasi.

### 4. Frontend write integration

- Create, edit, dan soft-delete customer.
- Create, edit, dan soft-delete product.
- Preview, create, edit, dan soft-delete Bon Piutang.
- Settlement, cancellation, dan Void dengan otorisasi Owner.
- Bonus Bon dan riwayat bonus.
- Report dan export berdasarkan data backend.

### 5. Integration validation

- Jalankan backend dan frontend dengan PostgreSQL test database.
- Tambahkan Playwright E2E menggunakan API nyata, bukan localStorage seed.
- Uji login, expiry session, create/edit Bon, settlement, cancellation, Void, Bonus Bon, report, dan reload halaman.
- Pastikan state tetap konsisten setelah refresh dan perpindahan halaman.
- Jalankan kembali viewport regression 320 × 568 sampai 1920 × 1080 serta zoom 125% dan 150%.

## Definition of Done

Phase 5 selesai ketika:

- seluruh halaman utama membaca data dari API;
- seluruh write action utama tersimpan di PostgreSQL;
- reload browser tidak menghilangkan perubahan;
- localStorage tidak lagi menjadi source of truth transaksi;
- API dan frontend memakai kontrak serta error code yang sama;
- authentication cookie berfungsi end-to-end;
- backend tests, frontend unit tests, production build, dependency audit, dan Playwright integration tests lulus;
- visual acceptance Phase 4 tetap terjaga.

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
