# HL Sales & Receivables Management App

Aplikasi internal single-user untuk mengelola pelanggan, produk, stok, transaksi Bon, Piutang, pelunasan, bonus, notifikasi, laporan cash basis, dan ekspor PDF untuk bisnis HL.

## Status proyek

- Phase 1: Backend domain dan database — selesai
- Phase 2: API — selesai
- Phase 3: UI design — selesai
- Phase 4: Frontend — selesai
- Phase 5: Integrasi backend dan frontend — selesai
- Phase 6: Testing, UAT, dan deployment — branch release tersedia

Branch release aktif:

```text
phase-6-release
```

## Teknologi

### Backend

- Node.js `>=22 <25`
- TypeScript
- Fastify
- PostgreSQL
- Prisma ORM
- Vitest
- PDFKit

### Frontend

- React
- TypeScript
- Vite
- Vitest
- Playwright

## Workflow aplikasi

### 1. Login

Pengguna masuk menggunakan satu akun internal. Seluruh halaman aplikasi dilindungi oleh session login.

### 2. Menyiapkan master data

Sebelum membuat transaksi, pengguna menyiapkan:

1. **Pelanggan**
   - nama pelanggan;
   - diskon LM;
   - diskon BR;
   - batas omzet untuk memperoleh bonus.
2. **Produk**
   - nama produk;
   - tipe LM atau BR;
   - harga modal;
   - harga jual/base;
   - stok produk.

Pelanggan dan produk yang dihapus menggunakan soft-delete sehingga riwayat transaksi tetap tersimpan.

### 3. Membuat Bon

Alur transaksi normal:

```text
Pilih pelanggan
→ masukkan tanggal dan Nomor Bon
→ pilih satu atau beberapa produk
→ sistem menghitung diskon bertingkat
→ sistem membulatkan harga ke Rp100
→ masukkan jumlah dan ongkir
→ periksa omzet, total tagihan, dan laba internal
→ simpan Bon
```

Bon baru secara default berstatus **Piutang**. Nomor Bon wajib unik.

Apabila transaksi menghasilkan laba negatif, sistem meminta PIN Owner dan alasan otorisasi sebelum Bon dapat disimpan.

### 4. Pelunasan

Pelunasan dapat dilakukan melalui:

- satu Bon; atau
- seluruh Bon Piutang milik pelanggan dalam bulan tertentu.

Pengguna wajib memasukkan tanggal pelunasan. Setelah dilunasi:

- status Bon berubah menjadi **Lunas**;
- omzet dan laba diakui secara cash basis;
- saldo Piutang berkurang;
- pembayaran dan akumulasi bonus diperbarui.

Bon Lunas tidak dapat diedit langsung.

### 5. Bonus

Bonus dihitung dari akumulasi omzet transaksi yang sudah Lunas.

```text
Transaksi Lunas
→ omzet masuk akumulasi pelanggan
→ batas bonus tercapai
→ bonus tersedia
→ pengguna membuat Bonus Bon
→ produk bonus diberikan dengan harga jual Rp0
```

Beberapa bonus dapat digunakan dalam satu Bonus Bon. Sisa akumulasi omzet tetap dibawa ke periode berikutnya.

### 6. Pembatalan dan Void

Tindakan sensitif memerlukan PIN Owner dan alasan:

- pembatalan pembayaran;
- Void Bon Lunas;
- otorisasi transaksi laba negatif.

Riwayat pembayaran, pembatalan, dan Void tetap disimpan untuk kebutuhan audit.

### 7. Laporan

Laporan dapat dilihat berdasarkan pelanggan, tipe produk LM/BR, bulan, tahun, dan keseluruhan bisnis.

Prinsip tanggal laporan:

- omzet, laba, dan pembayaran menggunakan **tanggal pelunasan**;
- Piutang menggunakan **tanggal Bon**;
- ongkir masuk total tagihan tetapi tidak menjadi omzet atau laba;
- Bonus Bon tidak menaikkan omzet maupun laba.

Laporan dan daftar transaksi dapat diekspor ke PDF.

## Workflow pengembangan dan release

Gunakan branch `phase-6-release` sebagai sumber release dan deployment.

```bash
git checkout phase-6-release
git pull origin phase-6-release
git checkout -b feat/nama-fitur
```

Setelah perubahan selesai:

```bash
npm run check
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
```

Kemudian commit dan push branch pekerjaan:

```bash
git add .
git commit -m "feat: deskripsi perubahan"
git push -u origin feat/nama-fitur
```

Buat Pull Request menuju `phase-6-release`. Jangan deploy langsung dari branch fitur. Dunia sudah cukup kacau tanpa deployment dari branch eksperimen.

## Kredensial development

Kredensial development dibaca dari file `.env` dan dimasukkan ke database saat menjalankan seeder.

Nilai contoh bawaan dari `.env.example`:

```env
APP_USERNAME="owner"
APP_PASSWORD="change-this-password"
OWNER_PIN="123456"
```

Login development:

| Data | Nilai |
|---|---|
| Username | `owner` |
| Password | `change-this-password` |
| PIN Owner | `123456` |

> Kredensial tersebut hanya untuk development lokal. Ganti password dan PIN sebelum menjalankan `npm run db:seed`, terutama untuk UAT atau production.

Apabila nilai kredensial di `.env` diubah setelah akun dibuat, jalankan kembali:

```bash
npm run db:seed
```

Seeder akan memperbarui hash password dan PIN akun yang sama.

## Instalasi lokal

### Prasyarat

Pastikan perangkat memiliki:

- Git;
- Node.js versi 22, 23, atau 24;
- npm;
- PostgreSQL yang sedang berjalan.

### 1. Clone repository

```bash
git clone https://github.com/Fals-Code/hl-sales-management-system.git
cd hl-sales-management-system
git checkout phase-6-release
```

### 2. Install dependency

Backend:

```bash
npm ci
```

Frontend:

```bash
npm --prefix frontend ci
```

### 3. Buat database PostgreSQL

Buat dua database:

```text
hl_dev
hl_test
```

Contoh menggunakan `psql`:

```bash
psql -U postgres -c "CREATE DATABASE hl_dev;"
psql -U postgres -c "CREATE DATABASE hl_test;"
```

Database `hl_test` digunakan oleh integration test. Jika hanya ingin menjalankan aplikasi, database utama yang wajib tersedia adalah `hl_dev`.

### 4. Buat environment backend

#### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

#### macOS/Linux

```bash
cp .env.example .env
```

Isi `.env` sesuai konfigurasi PostgreSQL lokal:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hl_dev?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hl_test?schema=public"
APP_USERNAME="owner"
APP_PASSWORD="change-this-password"
OWNER_PIN="123456"
API_PORT=3000
FRONTEND_ORIGIN="http://localhost:5173"
SESSION_COOKIE_NAME="hl_session"
SESSION_COOKIE_SECURE=false
SESSION_MAX_AGE=43200
```

Sesuaikan username, password, host, port, dan nama database PostgreSQL apabila konfigurasi lokal berbeda.

### 5. Buat environment frontend

Buat file `frontend/.env.local`:

```env
VITE_USE_API=true
VITE_API_BASE_URL=http://localhost:3000
```

### 6. Generate Prisma, migration, dan seed

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

Untuk membuat migration baru saat development:

```bash
npm run db:migrate:dev
```

### 7. Jalankan aplikasi

Buka dua terminal.

Terminal backend:

```bash
npm run dev
```

Terminal frontend:

```bash
npm --prefix frontend run dev
```

Akses:

| Layanan | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:3000` |
| Health check | `http://localhost:3000/health` |
| OpenAPI UI | `http://localhost:3000/docs` |
| OpenAPI JSON | `http://localhost:3000/docs/json` |

### 8. Menjalankan mode production secara lokal

Build frontend:

```bash
npm --prefix frontend run build
```

Jalankan migration, seed production, lalu server:

```bash
npm run db:migrate:deploy
npm run db:seed:production
npm start
```

Pada mode ini, Fastify menyajikan hasil build frontend dari `frontend/dist`.

## Quality checks

Backend:

```bash
npm run typecheck
npm run lint
npm test
```

Seluruh gate backend:

```bash
npm run check
```

Frontend:

```bash
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
```

End-to-end test dengan API:

```bash
npm --prefix frontend run test:e2e:api
```

Integration test membutuhkan PostgreSQL melalui `TEST_DATABASE_URL`.

## Deployment Render

Aplikasi production dijalankan sebagai satu Render Web Service. Frontend React dibangun ke `frontend/dist`, lalu disajikan oleh Fastify. Database menggunakan PostgreSQL eksternal.

Langkah deployment:

1. Pastikan perubahan sudah masuk ke `phase-6-release`.
2. Di Render, pilih **New > Blueprint**.
3. Hubungkan repository ini.
4. Pilih branch `phase-6-release`.
5. Gunakan konfigurasi `render.yaml`.
6. Isi secret environment berikut:
   - `DATABASE_URL`;
   - `APP_USERNAME`;
   - `APP_PASSWORD`;
   - `OWNER_PIN`.
7. Tunggu proses build, migration, seed, dan startup selesai.
8. Periksa endpoint `/health`.
9. Lakukan smoke test login, transaksi, pelunasan, laporan, PDF, refresh, dan logout.

Jangan menyimpan password, PIN Owner, URL database production, atau credential deployment di repository.

Dokumentasi deployment lebih lengkap tersedia di [`DEPLOY_RENDER.md`](./DEPLOY_RENDER.md).

## Dokumentasi proyek

- [`BACKEND.md`](./BACKEND.md)
- [`API.md`](./API.md)
- [`PHASE5_CODE_AUDIT.md`](./PHASE5_CODE_AUDIT.md)
- [`PHASE6_KICKOFF.md`](./PHASE6_KICKOFF.md)
- [`DEPLOY_RENDER.md`](./DEPLOY_RENDER.md)
- [`frontend/GENERAL_NOTIFICATION_SYSTEM.md`](./frontend/GENERAL_NOTIFICATION_SYSTEM.md)
