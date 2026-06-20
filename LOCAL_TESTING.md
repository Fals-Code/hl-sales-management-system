# Local Testing — HL Sales Management

Panduan ini menggunakan Windows PowerShell dan Docker Desktop.

## 1. Ambil branch Phase 5

```powershell
git fetch origin
git checkout phase-5-api-integration
git pull origin phase-5-api-integration
```

## 2. Setup otomatis

Dari root repository:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-local.ps1 -StartApps
```

Script akan:

- membuat `.env` dan `frontend/.env` bila belum ada;
- menjalankan PostgreSQL 16 di port 5432;
- memasang dependency backend dan frontend;
- menjalankan Prisma generate, migration, dan seed;
- menjalankan backend lint/typecheck/test;
- menjalankan frontend typecheck/test/build;
- menampilkan ringkasan isi database;
- membuka backend dan frontend di dua terminal baru.

URL lokal:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/health`
- API docs: `http://localhost:3000/docs`

Kredensial default dari `.env.example`:

```text
Username: owner
Password: change-this-password
Owner PIN: 123456
```

Ganti nilai tersebut di `.env` sebelum dipakai untuk data nyata.

## 3. Skenario pengujian manual

Urutan minimum untuk memastikan data benar-benar persisten:

1. Login.
2. Tambah satu pelanggan, misalnya `Toko Uji Lokal`.
3. Tambah satu produk LM dan satu produk BR.
4. Buat Bon Piutang dengan produk tersebut.
5. Reload browser dan pastikan Bon masih ada.
6. Edit deskripsi Bon lalu reload lagi.
7. Tandai Bon Lunas.
8. Buka laporan dan pastikan omzet/laba muncul berdasarkan tanggal pembayaran.
9. Batalkan pembayaran menggunakan PIN Owner, lalu pastikan status kembali Piutang.
10. Lunasi kembali lalu lakukan Void pada satu Bon uji.
11. Buat Bonus Bon bila saldo bonus sudah tersedia.
12. Unduh PDF laporan.

## 4. Verifikasi isi PostgreSQL

Dari root repository:

```powershell
Get-Content scripts/verify-db.sql | docker compose exec -T postgres psql -U postgres -d hl_dev
```

Output akan menampilkan:

- jumlah row setiap tabel utama;
- customer dan product terbaru;
- Bon terbaru beserta status dan nilai;
- payment terbaru dan status cancellation;
- bonus ledger terbaru;
- Void record terbaru.

Masuk ke shell PostgreSQL secara interaktif:

```powershell
docker compose exec postgres psql -U postgres -d hl_dev
```

Contoh query cepat:

```sql
SELECT "bonNumber", "status", "totalAmount", "createdAt"
FROM "Bon"
ORDER BY "createdAt" DESC;

SELECT "paymentNumber", "paidAt", "activePaymentAmount", "canceledAt"
FROM "Payment"
ORDER BY "createdAt" DESC;

SELECT "mutationType", "amount", "balanceAfter", "reason"
FROM "BonusLedger"
ORDER BY "createdAt" DESC;
```

Keluar dari psql:

```text
\q
```

## 5. Menghentikan layanan

```powershell
docker compose stop
```

Menghapus container tanpa menghapus data:

```powershell
docker compose down
```

Menghapus container sekaligus seluruh data database lokal:

```powershell
docker compose down -v
```

Perintah terakhir bersifat destruktif. Semua data `hl_dev` lokal akan hilang.
