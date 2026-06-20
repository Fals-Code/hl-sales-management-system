# Deploy ke Render

Aplikasi dijalankan sebagai satu Render Web Service. Frontend React dibangun ke `frontend/dist` dan disajikan oleh Fastify. Database menggunakan PostgreSQL eksternal.

## Langkah

1. Gabungkan branch deployment ke `phase-6-release`.
2. Di Render, pilih **New > Blueprint**.
3. Hubungkan repository ini dan gunakan `render.yaml`.
4. Isi environment rahasia yang diminta pada dashboard Render.
5. Tunggu build, migration, dan startup selesai.
6. Buka `/health` dan pastikan status API berhasil.
7. Buka root URL lalu lakukan login dan smoke test transaksi.

## Perintah yang dijalankan Render

Build:

```bash
npm ci && npm run db:generate && npm --prefix frontend ci && npm --prefix frontend run build
```

Start:

```bash
npm run db:migrate:deploy && npm run db:seed:production && npm start
```

## Smoke test

- login;
- tambah pelanggan dan produk uji;
- buat serta lunasi Bon;
- buka PDF dan laporan;
- refresh halaman;
- pastikan data tetap tersimpan;
- logout.

Render Free Web Service cocok untuk demo, UAT, dan penggunaan ringan. Service dapat membutuhkan waktu untuk aktif kembali setelah idle.
