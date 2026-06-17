# HL UI Acceptance Checklist

Checklist ini memetakan template frontend Phase 3–4 terhadap dokumen **Phase Pengerjaan HL Sales & Receivables Management App** dan **Acceptance Criteria HL App**.

## Target Pengguna

- Pengguna utama berusia sekitar 40 tahun ke atas.
- Teks utama mudah dibaca tanpa zoom.
- Tombol dan input memiliki tinggi sentuh sekitar 44–54 px.
- Aksi sensitif selalu memakai teks, bukan ikon saja.
- Tabel berubah menjadi kartu pada layar kecil.
- Form panjang dibagi menjadi beberapa tahap.
- Status tidak hanya dibedakan menggunakan warna.

## Authentication

- [x] Login diwajibkan sebelum aplikasi dibuka.
- [x] Tidak ada registrasi mandiri.
- [x] Kredensial salah menampilkan pesan yang jelas.
- [x] Sesi demo bertahan sampai logout.
- [ ] Integrasi session expiry dari API dilakukan pada Phase 5.

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

## Settlement

- [x] Pelunasan satu Bon dengan Tanggal Pelunasan.
- [x] Pelunasan beberapa Bon.
- [x] Pelunasan seluruh Bon satu bulan.
- [x] Total Piutang dan pembayaran diperbarui langsung dalam state mock.
- [x] Pembatalan pembayaran memerlukan PIN Owner dan alasan.
- [ ] Persistensi lintas halaman menunggu integrasi API Phase 5.

## Bonus

- [x] Bonus dihitung dari omzet transaksi Lunas.
- [x] Beberapa bonus dapat dipakai dalam satu Bonus Bon.
- [x] Produk bonus memiliki harga jual Rp0.
- [x] Bonus tidak memengaruhi omzet atau Laba HL.
- [x] Harga Modal bonus ditampilkan sebagai biaya bonus/promosi terpisah.
- [x] Sisa akumulasi bonus ditampilkan.
- [x] Bonus Bon dibedakan dari transaksi normal.

## Reporting

- [x] Filter bulan, tahun, customer, LM, BR, dan keseluruhan.
- [x] Omzet dan laba memakai cash basis.
- [x] Total Piutang dan sudah dibayar.
- [x] Breakdown LM dan BR.
- [x] Biaya bonus/promosi.
- [x] Penanda transaksi laba negatif.
- [x] Pagination desktop dan kontrol sederhana pada mobile.
- [x] Preview PDF dan layout cetak.
- [ ] Download PDF melalui endpoint resmi dilakukan pada Phase 5.

## Device QA

Uji minimal pada:

- 320 × 568 px
- 360 × 640 px
- 390 × 844 px
- 430 × 932 px
- 768 × 1024 px
- 1024 × 768 px
- 1366 × 768 px
- 1920 × 1080 px
- 844 × 390 px landscape
- 932 × 430 px landscape

Periksa juga:

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

Kedua perintah wajib lulus sebelum Phase 3–4 dinyatakan selesai dan integrasi API dimulai.
