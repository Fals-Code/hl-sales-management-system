import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  Gift,
  HandCoins,
  PackagePlus,
  Plus,
  ReceiptText,
  UserPlus,
  Users,
  WalletCards
} from "lucide-react";
import type { BonRow, PageKey } from "./data";
import { bons, customers, formatCurrency, products, summaryCards } from "./data";
import { AttentionItem, QuickAction, ReportCard, ResponsiveBonList, SearchBox } from "./components";

export function DashboardPage({
  search,
  setSearch,
  rows,
  onCreateBon,
  onNavigate,
  onViewBon
}: {
  search: string;
  setSearch: (value: string) => void;
  rows: BonRow[];
  onCreateBon: () => void;
  onNavigate: (page: PageKey) => void;
  onViewBon: (bonNumber: string) => void;
}) {
  return (
    <>
      <section className="welcome-panel">
        <div>
          <span className="eyebrow">Kamis, 18 Juni 2026</span>
          <h2>Selamat pagi, Admin</h2>
          <p>Berikut ringkasan kondisi toko hari ini.</p>
        </div>
        <button className="button button--primary button--large" onClick={onCreateBon}>
          <Plus size={22} />
          Buat Bon Baru
        </button>
      </section>

      <section className="summary-grid" aria-label="Ringkasan utama">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className={`summary-card summary-card--${card.tone}`} key={card.label}>
              <div className="summary-card-icon"><Icon size={26} /></div>
              <div>
                <span>{card.label}</span>
                <strong>{formatCurrency(card.value)}</strong>
                <small>{card.helper}</small>
              </div>
              <ChevronRight size={22} className="summary-card-arrow" />
            </article>
          );
        })}
      </section>

      <section className="quick-actions" aria-labelledby="quick-actions-title">
        <div className="section-heading">
          <span className="eyebrow">Akses cepat</span>
          <h2 id="quick-actions-title">Apa yang ingin dilakukan?</h2>
        </div>
        <div className="quick-action-grid">
          <QuickAction icon={ReceiptText} label="Buat Bon Baru" helper="Catat transaksi penjualan" onClick={onCreateBon} />
          <QuickAction icon={HandCoins} label="Catat Pelunasan" helper="Lunasi satu atau beberapa bon" onClick={() => onNavigate("settlements")} />
          <QuickAction icon={UserPlus} label="Tambah Pelanggan" helper="Daftarkan pelanggan baru" onClick={() => onNavigate("customers")} />
          <QuickAction icon={PackagePlus} label="Tambah Produk" helper="Masukkan produk LM atau BR" onClick={() => onNavigate("products")} />
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="section-heading section-heading--row">
            <div>
              <span className="eyebrow">Transaksi terakhir</span>
              <h2>Bon Terbaru</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("bons")}>Lihat Semua <ChevronRight size={18} /></button>
          </div>
          <SearchBox value={search} onChange={setSearch} placeholder="Cari nomor bon atau pelanggan" />
          <ResponsiveBonList rows={rows.slice(0, 4)} onViewDetail={onViewBon} />
        </section>

        <aside className="panel attention-panel">
          <div className="section-heading">
            <span className="eyebrow">Perlu perhatian</span>
            <h2>Tindakan Hari Ini</h2>
          </div>
          <AttentionItem icon={WalletCards} title="5 bon lebih dari 30 hari" text="Total piutang Rp4.850.000" tone="warning" onClick={() => onNavigate("receivables")} />
          <AttentionItem icon={Gift} title="3 pelanggan punya bonus" text="Bonus siap digunakan" tone="success" onClick={() => onNavigate("bonus")} />
          <AttentionItem icon={AlertTriangle} title="1 transaksi laba negatif" text="Sudah disetujui Owner" tone="danger" onClick={() => onNavigate("reports")} />
        </aside>
      </div>
    </>
  );
}

export function CustomersPage() {
  return (
    <section className="panel page-panel">
      <div className="section-heading section-heading--row">
        <div>
          <span className="eyebrow">Data master</span>
          <h2>Daftar Pelanggan</h2>
          <p>Informasi diskon, piutang, dan bonus pelanggan dalam satu tempat.</p>
        </div>
        <button className="button button--primary"><UserPlus size={20} />Tambah Pelanggan</button>
      </div>
      <SearchBox value="" onChange={() => undefined} placeholder="Cari nama atau kode pelanggan" />
      <div className="data-grid">
        {customers.map((customer) => (
          <article className="customer-card" key={customer.code}>
            <div className="customer-avatar">{customer.name.slice(0, 2).toUpperCase()}</div>
            <div className="customer-card-main">
              <span className="eyebrow">{customer.code}</span>
              <h3>{customer.name}</h3>
              <div className="customer-metrics">
                <span>Piutang <strong>{formatCurrency(customer.receivable)}</strong></span>
                <span>Bonus <strong>{customer.bonus} unit</strong></span>
              </div>
            </div>
            <button className="icon-button" aria-label={`Lihat ${customer.name}`}><ChevronRight size={22} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProductsPage() {
  return (
    <section className="panel page-panel">
      <div className="section-heading section-heading--row">
        <div>
          <span className="eyebrow">Data master</span>
          <h2>Daftar Produk</h2>
          <p>Kelola harga modal, harga jual, dan tipe produk secara jelas.</p>
        </div>
        <button className="button button--primary"><PackagePlus size={20} />Tambah Produk</button>
      </div>
      <div className="product-list">
        {products.map((product) => (
          <article className="product-row" key={product.name}>
            <div className="product-icon"><Boxes size={24} /></div>
            <div className="product-copy">
              <h3>{product.name}</h3>
              <span className={`status-badge status-badge--${product.type.toLowerCase()}`}>{product.type}</span>
            </div>
            <div className="product-meta"><span>Stok</span><strong>{product.stock}</strong></div>
            <div className="product-meta"><span>Harga jual</span><strong>{formatCurrency(product.price)}</strong></div>
            <button className="button button--secondary button--compact">Edit</button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BonsPage({
  rows,
  search,
  setSearch,
  onCreate,
  onViewBon
}: {
  rows: BonRow[];
  search: string;
  setSearch: (value: string) => void;
  onCreate: () => void;
  onViewBon: (bonNumber: string) => void;
}) {
  return (
    <section className="panel page-panel">
      <div className="section-heading section-heading--row">
        <div>
          <span className="eyebrow">Transaksi</span>
          <h2>Daftar Bon</h2>
          <p>Pantau status piutang, pelunasan, dan pembatalan transaksi.</p>
        </div>
        <button className="button button--primary" onClick={onCreate}><Plus size={20} />Buat Bon</button>
      </div>
      <SearchBox value={search} onChange={setSearch} placeholder="Cari nomor bon atau pelanggan" />
      <ResponsiveBonList rows={rows} onViewDetail={onViewBon} />
    </section>
  );
}

export function ReceivablesPage({ onViewBon }: { onViewBon: (bonNumber: string) => void }) {
  const receivables = bons.filter((bon) => bon.status === "Belum Lunas");
  return (
    <section className="panel page-panel">
      <div className="section-heading section-heading--row">
        <div>
          <span className="eyebrow">Prioritas penagihan</span>
          <h2>Piutang Aktif</h2>
          <p>Daftar transaksi yang belum dilunasi oleh pelanggan.</p>
        </div>
        <button className="button button--primary"><HandCoins size={20} />Catat Pelunasan</button>
      </div>
      <div className="receivable-highlight">
        <WalletCards size={30} />
        <div><span>Total Piutang Aktif</span><strong>{formatCurrency(12500000)}</strong></div>
        <small>15 bon dari 8 pelanggan</small>
      </div>
      <ResponsiveBonList rows={receivables} onViewDetail={onViewBon} />
    </section>
  );
}

export function ReportsPage() {
  return (
    <section className="panel page-panel">
      <div className="section-heading">
        <span className="eyebrow">Analisis usaha</span>
        <h2>Laporan</h2>
        <p>Pilih laporan dengan nama yang jelas, lalu unduh dalam format PDF.</p>
      </div>
      <div className="report-grid">
        <ReportCard icon={CircleDollarSign} title="Rekap Keseluruhan" text="Omzet, laba, ongkir, piutang, dan transaksi rugi." />
        <ReportCard icon={Users} title="Rekap per Pelanggan" text="Riwayat transaksi dan posisi piutang setiap pelanggan." />
        <ReportCard icon={ReceiptText} title="Daftar Transaksi" text="Semua bon berdasarkan periode dan status." />
        <ReportCard icon={WalletCards} title="Daftar Piutang" text="Bon aktif yang belum dilunasi pelanggan." />
        <ReportCard icon={Gift} title="Log Bonus" text="Unit bonus masuk, digunakan, dan dibalik." />
        <ReportCard icon={AlertTriangle} title="Transaksi Laba Negatif" text="Daftar transaksi yang membutuhkan otorisasi Owner." />
      </div>
    </section>
  );
}

export function PlaceholderPage({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action: string }) {
  return (
    <section className="panel empty-page">
      <div className="empty-icon"><Icon size={38} /></div>
      <span className="eyebrow">Template halaman</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="button button--primary">{action}</button>
    </section>
  );
}
