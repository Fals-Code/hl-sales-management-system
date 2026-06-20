# General Notification System

## Tujuan

Satu pusat notifikasi untuk seluruh modul tanpa menggandakan logika di setiap halaman. Sistem membedakan informasi biasa, keberhasilan, peringatan, dan kondisi kritis.

## Kontrak

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

- Bon dibuat, diedit, dilunasi, dibatalkan, dihapus, atau di-Void.
- Nomor Bon duplikat atau transaksi gagal disimpan.
- Piutang melewati umur yang ditentukan.
- Pembayaran dibatalkan atau memerlukan otorisasi Owner.
- Stok produk rendah atau habis.
- Pelanggan mencapai hak Bonus Bon.
- Transaksi menghasilkan laba negatif.
- Sesi berakhir, API tidak dapat dihubungi, atau sinkronisasi gagal.

## Arsitektur final Phase 5

### Backend persistence

Riwayat notifikasi disimpan pada tabel `Notification`. Backend menyediakan:

- `GET /api/v1/notifications` untuk list, filter mode, kategori, limit, dan cursor;
- `POST /api/v1/notifications/:id/read`;
- `POST /api/v1/notifications/read-all`;
- `DELETE /api/v1/notifications/:id` untuk dismiss;
- `GET /api/v1/notifications/stream` untuk Server-Sent Events.

Akses dibatasi oleh session pengguna. SSE memakai heartbeat dan unsubscribe saat koneksi ditutup.

### Frontend

Frontend menyediakan:

- notification center dari ikon lonceng;
- badge jumlah belum dibaca;
- filter Semua, Belum dibaca, dan kategori;
- aksi Tandai semua dibaca;
- dismiss;
- navigasi ke Bon, produk, bonus, pembayaran, atau modul terkait;
- toast untuk feedback aksi langsung;
- sinkronisasi event baru melalui SSE;
- fallback event transport untuk session expired, timeout, dan network error.

Local state dipakai untuk pengalaman UI dan optimistic feedback, sedangkan riwayat authoritative berasal dari backend.

## Aturan agar tidak berisik

- Deduplikasi memakai `eventKey + entityId` atau kunci domain yang setara.
- Notifikasi kondisi diperbarui, bukan dibuat tanpa batas pada setiap refresh.
- Notifikasi informasi dapat kedaluwarsa.
- Notifikasi kritis tetap terlihat sampai dibaca atau kondisinya selesai.
- Badge menghitung notifikasi belum dibaca, bukan seluruh riwayat.
- Kondisi yang sudah selesai tidak boleh terus menghasilkan event baru.

## Konfigurasi awal

- Piutang berumur: 30 hari;
- stok rendah: 5 unit atau kurang;
- stok habis: 0 unit;
- eligibility bonus: saldo authoritative backend;
- laba negatif: transaction snapshot;
- kegagalan jaringan dan sesi: API client;
- realtime: SSE endpoint backend.

## Status implementasi

### Selesai

- kontrak notifikasi terpusat;
- tabel dan migration `Notification`;
- notification service dan domain service;
- endpoint list/read/read-all/dismiss;
- SSE stream dan heartbeat;
- persistence lintas refresh;
- category, severity, target entity, read state, dan dismiss state;
- notification center dan toast queue;
- badge, filter, dan Tandai semua dibaca;
- event transaksi, pembayaran, inventory, bonus, security, dan system;
- unit serta integration test persistence dan subscriber.

### Opsional setelah Phase 6

- email;
- WhatsApp;
- push notification perangkat;
- configurable threshold per user;
- retention policy dan archival notifikasi jangka panjang.

Channel eksternal tidak menjadi syarat acceptance criteria aplikasi internal single-user. Fitur itu hanya boleh ditambahkan apabila kebutuhan operasionalnya jelas, bukan karena seseorang melihat diagram arsitektur lalu merasa semua kotak harus diisi.
