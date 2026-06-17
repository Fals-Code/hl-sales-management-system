# HL Sales UI

Template frontend responsif untuk HL Sales Management System.

## Fokus Desain

- pengguna utama usia 40 tahun ke atas;
- tipografi besar dan kontras tinggi;
- tombol minimum sekitar 44–48 px;
- navigasi desktop memakai sidebar;
- navigasi mobile memakai bottom navigation;
- tabel berubah menjadi kartu di layar kecil;
- alur pembuatan Bon dibuat ringkas dan bertahap;
- mendukung reduced motion dan keyboard focus.

## Menjalankan di Lokal

```bash
cd frontend
npm install
npm run dev
```

Buka:

```text
http://localhost:5173
```

## Validasi

```bash
npm run typecheck
npm run build
```

## Uji Responsif

Gunakan DevTools browser dan cek minimal:

- 320 × 568 px;
- 390 × 844 px;
- 768 × 1024 px;
- 1024 × 768 px;
- 1366 × 768 px;
- 1920 × 1080 px.

## Status Integrasi

UI ini masih memakai data mock untuk validasi visual dan alur interaksi. Integrasi API dilakukan pada fase frontend/integration berikutnya melalui endpoint Phase 2.
