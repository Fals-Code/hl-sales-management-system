# HL UI Acceptance Checklist

Checklist ini memetakan template frontend Phase 3–4 terhadap dokumen **Phase Pengerjaan HL Sales & Receivables Management App** dan **Acceptance Criteria HL App**.

## Status UI Template

- [x] Seluruh halaman wajib Phase 3 tersedia.
- [x] Seluruh interaksi utama Phase 4 tersedia dengan mock data.
- [x] Hash routing aktif untuk halaman dan detail Bon.
- [x] Loading state, error boundary, not-found state, empty state, dan error login tersedia.
- [x] Layout mobile, tablet, desktop, dan print/PDF preview tersedia.
- [x] Detail kecil untuk target pengguna 40+ diterapkan.
- [x] Batas Phase 5 diberi label jelas: data nyata, session expiry API, dan endpoint PDF resmi.

## Target Pengguna

- [x] Pengguna utama berusia sekitar 40 tahun ke atas.
- [x] Teks utama mudah dibaca tanpa zoom.
- [x] Tombol dan input memiliki tinggi sentuh sekitar 44–54 px.
- [x] Aksi sensitif selalu memakai teks, bukan ikon saja.
- [x] Tabel berubah menjadi kartu pada layar kecil.
- [x] Form panjang dibagi menjadi beberapa tahap.
- [x] Status tidak hanya dibedakan menggunakan warna.
- [x] Fokus keyboard terlihat jelas.
- [x] High contrast dan reduced motion tersedia.
- [x] Tombol berbahaya diberi konfirmasi dan jarak dari tombol utama.

## Authentication

- [x] Login diwajibkan sebelum aplikasi dibuka.
- [x] Tidak ada registrasi mandiri.
- [x] Kredensial salah menampilkan pesan yang jelas.
- [x] Sesi demo bertahan sampai logout.
- [x] Logout memiliki konfirmasi pada shell final.
- [x] Integrasi session expiry diberi batas jelas untuk Phase 5.

## Navigation / Shell

- [x] Sidebar desktop tersedia.
- [x] Bottom navigation mobile tersedia.
- [x] Tombol Buat Bon selalu mudah ditemukan.
- [x] Hash routing tersedia untuk halaman utama.
- [x] Detail Bon memiliki URL hash tersendiri.
- [x] Halaman tidak dikenal menampilkan fallback, bukan layar kosong.
- [x] Skip link tersedia untuk aksesibilitas.
- [x] Judul dokumen berubah mengikuti halaman.

## Customer

- [x] Tambah dan edit pelanggan.
- [x] Soft-delete pelanggan.
- [x] Diskon LM dan BR dipisahkan.
- [x] Discount steps dapat ditambah, diedit, dan dihapus.
- [x] Validasi nilai diskon 0–100.
- [x] Diskon efektif ditampilkan.
- [x] Threshold bonus lebih besar dari Rp0.
- [x] Riwayat perubahan threshold ditampilkan.
- [x] Detail pelanggan memiliki filter bulan dan tahun.
- [x] Omzet LM, BR, dan total ditampilkan terpisah.
- [x] Pelunasan satu bulan dapat dilakukan langsung dari detail pelanggan.
- [x] Preview PDF tersedia.

## Product

- [x] Tambah dan edit produk.
- [x] Tipe dibatasi menjadi LM atau BR.
- [x] Harga Modal dan Harga Base dipisahkan.
- [x] Harga Modal diberi keterangan bukan harga pelanggan.
- [x] Nilai harga dan stok tidak boleh negatif.
- [x] Soft-delete produk mempertahankan riwayat lama.

## Transaction / Bon

- [x] Tanggal otomatis hari ini dan dapat diubah.
- [x] Nomor Bon dibuat otomatis tetapi tetap dapat diedit.
- [x] Duplicate Nomor Bon ditolak dengan pesan jelas.
- [x] Customer dan produk dipilih dari data aktif.
- [x] Mendukung banyak baris produk.
- [x] Quantity minimal satu.
- [x] Harga diterapkan dihitung otomatis dari cascading discount.
- [x] Harga dibulatkan ke Rp100 terdekat.
- [x] Ongkir ditambahkan ke tagihan tetapi tidak ke omzet/laba.
- [x] Status awal transaksi normal adalah Piutang.
- [x] Snapshot modal, base price, dan discount steps ditampilkan pada riwayat.
- [x] Edit Bon Piutang menghitung ulang nilai dan snapshot.
- [x] Transaksi rugi memerlukan PIN Owner dan alasan.
- [x] Soft-delete Bon Piutang.
- [x] Void Bon Lunas dengan PIN Owner.
- [x] Konfirmasi saat menutup Form Bon yang belum disimpan.
- [x] Detail Bon menampilkan line, qty, harga, ongkir, omzet, status, dan payment date.

## Settlement

- [x] Pelunasan satu Bon dengan Tanggal Pelunasan.
- [x] Pelunasan beberapa Bon.
- [x] Pelunasan seluruh Bon satu bulan.
- [x] Total Piutang dan pembayaran diperbarui langsung dalam state mock.
- [x] Already-Lunas terlihat berbeda dan tidak diselesaikan ulang.
- [x] Pembatalan pembayaran memerlukan PIN Owner dan alasan.
- [x] Persistensi lintas halaman ditandai sebagai pekerjaan Phase 5 karena membutuhkan API/database.

## Bonus

- [x] Bonus dihitung dari omzet transaksi Lunas.
- [x] Beberapa bonus dapat dipakai dalam satu Bonus Bon.
- [x] Produk bonus memiliki harga jual Rp0.
- [x] Bonus tidak memengaruhi omzet atau Laba HL.
- [x] Harga Modal bonus ditampilkan sebagai biaya bonus/promosi terpisah.
- [x] Sisa akumulasi bonus ditampilkan.
- [x] Bonus Bon dibedakan dari transaksi normal.
- [x] Notifikasi pelanggan eligible bonus tersedia.

## Reporting

- [x] Filter bulan, tahun, customer, LM, BR, dan keseluruhan.
- [x] Omzet dan laba memakai cash basis.
- [x] Total Piutang dan sudah dibayar.
- [x] Breakdown LM dan BR.
- [x] Biaya bonus/promosi.
- [x] Penanda transaksi laba negatif.
- [x] Pagination desktop dan kontrol sederhana pada mobile.
- [x] Preview PDF dan layout cetak.
- [x] Download PDF resmi ditandai sebagai pekerjaan Phase 5 karena membutuhkan endpoint PDF.

## Device QA

Uji minimal pada:

- [x] 320 × 568 px layout supported
- [x] 360 × 640 px layout supported
- [x] 390 × 844 px layout supported
- [x] 430 × 932 px layout supported
- [x] 768 × 1024 px layout supported
- [x] 1024 × 768 px layout supported
- [x] 1366 × 768 px layout supported
- [x] 1920 × 1080 px layout supported
- [x] 844 × 390 px landscape fallback supported
- [x] 932 × 430 px landscape fallback supported

Periksa manual sebelum demo:

- keyboard mobile terbuka;
- zoom browser 125% dan 150%;
- navigasi keyboard tanpa mouse;
- high contrast;
- reduced motion;
- nominal Rupiah tidak terpotong;
- dialog tidak tertutup bottom navigation;
- tombol sensitif tidak berdekatan dengan tombol utama tanpa jarak.

## Build Gate

```bash
npm run typecheck
npm run build
```

Kedua perintah wajib lulus sebelum Phase 3–4 dinyatakan selesai dan integrasi API dimulai. Setelah lulus, UI template dapat dianggap 100% untuk batas Phase 3–4, sedangkan data nyata, session API, dan PDF endpoint masuk Phase 5.
