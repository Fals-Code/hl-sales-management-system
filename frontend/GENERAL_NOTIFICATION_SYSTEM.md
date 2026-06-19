# General Notification System

## Tujuan

Satu pusat notifikasi yang dapat dipakai seluruh modul tanpa membuat logika notifikasi terpisah di setiap halaman. Sistem harus membedakan informasi biasa, keberhasilan, peringatan, dan kondisi kritis.

## Struktur notifikasi

```ts
type AppNotification = {
  id: string;
  eventKey: string;
  category: "TRANSACTION" | "RECEIVABLE" | "PAYMENT" | "INVENTORY" | "BONUS" | "SECURITY" | "SYSTEM";
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  targetUrl?: string;
  entityType?: "BON" | "PAYMENT" | "CUSTOMER" | "PRODUCT";
  entityId?: string;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
  expiresAt?: string;
};
```

## Sumber event

- Bon berhasil dibuat, diedit, dilunasi, dibatalkan, atau di-Void.
- Nomor Bon duplikat atau transaksi gagal disimpan.
- Piutang melewati umur yang ditentukan.
- Pembayaran dibatalkan atau memerlukan otorisasi Owner.
- Stok produk rendah atau habis.
- Pelanggan mencapai hak Bonus Bon.
- Transaksi menghasilkan laba negatif.
- Sesi berakhir, API tidak dapat dihubungi, atau sinkronisasi gagal.

## Tampilan

### Notification Center

Panel dari ikon lonceng di topbar dengan:

- jumlah notifikasi belum dibaca;
- filter `Semua`, `Belum dibaca`, dan kategori;
- aksi `Tandai semua dibaca`;
- setiap item dapat membuka halaman atau entitas terkait;
- notifikasi kritis tidak hilang hanya karena panel ditutup.

### Toast

Dipakai untuk hasil aksi langsung:

- `SUCCESS`: data berhasil disimpan;
- `WARNING`: aksi berhasil tetapi memerlukan perhatian;
- `CRITICAL`: kegagalan yang menghentikan proses;
- toast tidak menggantikan error di dalam form.

## Aturan agar tidak berisik

- Deduplikasi berdasarkan `eventKey + entityId`.
- Notifikasi stok rendah diperbarui, bukan dibuat ulang setiap refresh.
- Notifikasi informasi dapat kedaluwarsa otomatis.
- Notifikasi kritis hanya dapat ditutup setelah dibaca atau kondisinya selesai.
- Badge topbar menghitung notifikasi belum dibaca, bukan seluruh riwayat.

## Tahap implementasi

1. **Frontend foundation**: context/store notifikasi, toast, notification center, local persistence.
2. **Backend persistence**: tabel `Notification` dan endpoint list/read/dismiss.
3. **Domain events**: penerbitan event dari Bon, Payment, Inventory, Bonus, dan Auth.
4. **Realtime opsional**: SSE agar notifikasi masuk tanpa reload.
5. **Channel eksternal opsional**: email atau WhatsApp hanya untuk event kritis yang dipilih Owner.

## Prioritas event awal

1. Stok habis atau stok rendah.
2. Piutang jatuh tempo.
3. Pelanggan eligible bonus.
4. Laba negatif menunggu otorisasi.
5. Pembayaran dibatalkan atau Bon di-Void.
6. Koneksi backend dan sesi pengguna bermasalah.

## Keputusan implementasi saat ini

Aplikasi HL adalah aplikasi internal single-user. Untuk menjaga Phase 5 tetap stabil, implementasi awal memakai **frontend foundation dengan local persistence** dan notifikasi kondisi dihitung dari data bootstrap yang authoritative. Pendekatan ini dipilih agar pusat notifikasi langsung berguna tanpa menambah tabel serta coupling transaksi baru menjelang UAT.

Konfigurasi awal:

- umur Piutang: 30 hari;
- stok rendah: 5 unit atau kurang;
- stok habis: 0 unit;
- kondisi bonus memakai saldo bonus hasil backend;
- kondisi laba negatif memakai snapshot transaksi;
- kegagalan jaringan dan sesi diterbitkan dari API client;
- notifikasi kondisi otomatis hilang ketika kondisi sumber selesai;
- status dibaca dan ditutup disimpan pada `localStorage`.

## Status implementasi

### Selesai

- kontrak `AppNotification` terpusat;
- notification store dan toast queue;
- local persistence untuk status read/dismiss;
- deduplikasi `eventKey + entityId`;
- badge jumlah belum dibaca;
- filter Semua, Belum dibaca, dan kategori;
- Tandai semua dibaca;
- navigasi ke Bon, produk, bonus, atau modul terkait;
- proteksi notifikasi kritis agar dibaca sebelum ditutup;
- event stok rendah/habis, Piutang berumur, bonus tersedia, laba negatif, Void, session expired, timeout, dan network error;
- unit test derivasi notifikasi.

### Ditunda ke tahap lanjutan

- tabel `Notification` di backend;
- endpoint list/read/dismiss;
- SSE;
- email atau WhatsApp.

Backend persistence bukan syarat output Phase 5 pada dokumen fase proyek. Fitur tersebut dapat dikerjakan pada Phase 6 atau setelah UAT apabila Owner membutuhkan riwayat notifikasi lintas browser/perangkat.
