---
title: HL Sales Management
emoji: 📊
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# HL Sales & Receivables Management App

Aplikasi internal single-user untuk mengelola pelanggan, produk, transaksi Bon, Piutang, pelunasan, bonus, stok, notifikasi, laporan cash basis, dan PDF.

## Status

- Phase 1: Backend domain and database — complete
- Phase 2: API — complete
- Phase 3: UI design — complete
- Phase 4: Frontend — complete
- Phase 5: Backend/frontend integration — complete
- Phase 6: Testing, acceptance, and deployment — ready to start after the release gate is green

Detail entry gate dan deployment tersedia di [`PHASE6_KICKOFF.md`](./PHASE6_KICKOFF.md).

## Stack

### Backend

- Node.js dan TypeScript
- Fastify
- PostgreSQL
- Prisma
- Vitest
- PDFKit

### Frontend

- React
- TypeScript
- Vite
- Vitest
- Playwright

## Business rules utama

- mata uang hanya IDR dan tanpa PPN;
- diskon LM dan BR terpisah per pelanggan;
- diskon diterapkan secara cascading, bukan dijumlahkan;
- hasil diskon mengikuti aturan pembulatan Rp100;
- Bon baru berstatus Piutang;
- omzet, laba, pembayaran, dan bonus diakui ketika Lunas;
- laporan cash basis memakai tanggal pelunasan;
- Piutang memakai tanggal Bon;
- ongkir masuk tagihan tetapi tidak menjadi omzet atau laba;
- harga, modal, diskon, dan tipe produk disimpan sebagai snapshot transaksi;
- Nomor Bon wajib unik;
- Bon Lunas tidak dapat diedit langsung;
- transaksi rugi, pembatalan pembayaran, dan Void memakai otorisasi Owner;
- Bonus Bon bernilai jual Rp0 dan tidak menaikkan omzet.

## Menjalankan backend

```bash
npm ci
cp .env.example .env
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Backend berjalan pada `http://localhost:3000` secara default.

- Health: `GET /health`
- OpenAPI UI: `/docs`
- OpenAPI JSON: `/docs/json`

## Menjalankan frontend

```bash
cd frontend
npm install --no-audit --no-fund
```

Buat `frontend/.env.local`:

```env
VITE_USE_API=true
VITE_API_BASE_URL=http://localhost:3000
```

Kemudian:

```bash
npm run dev
```

## Quality checks

### Backend

```bash
npm run typecheck
npm run lint
npm test
```

Atau seluruh gate backend:

```bash
npm run check
```

### Frontend

```bash
cd frontend
npm run typecheck
npm test
npm run build
```

### E2E

```bash
cd frontend
npm run test:e2e:api
```

Pengujian integrasi memerlukan PostgreSQL melalui `TEST_DATABASE_URL`.

## Environment

Gunakan `.env.example` untuk development dan `.env.production.example` untuk daftar variabel production. Frontend production menggunakan `frontend/.env.production.example` sebagai referensi.

Jangan commit `.env`, password, PIN Owner, URL database production, atau credential deployment. Menaruh rahasia di repository adalah cara yang sangat efisien untuk mengubah tugas aplikasi menjadi tugas insiden keamanan.

## Dokumentasi

- [`BACKEND.md`](./BACKEND.md)
- [`API.md`](./API.md)
- [`PHASE5_CODE_AUDIT.md`](./PHASE5_CODE_AUDIT.md)
- [`PHASE6_KICKOFF.md`](./PHASE6_KICKOFF.md)
- [`frontend/GENERAL_NOTIFICATION_SYSTEM.md`](./frontend/GENERAL_NOTIFICATION_SYSTEM.md)

## Branch release

Phase 6 harus dimulai dari branch release yang dibuat setelah seluruh CI pada hasil integrasi Phase 5 lulus. Jangan deploy branch fitur langsung.
