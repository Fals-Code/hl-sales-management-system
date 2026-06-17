import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Contrast,
  Download,
  FileText,
  Gift,
  HandCoins,
  Info,
  KeyRound,
  LoaderCircle,
  PackagePlus,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  X,
  ZoomIn
} from "lucide-react";
import { StatusBadge } from "./components";
import { bons, customers, formatCurrency, products } from "./data";

type CustomerDetail = {
  discountLm: number;
  discountBr: number;
  threshold: number;
  turnover: number;
  phone: string;
  address: string;
};

type MasterDialogKind = "customer" | "product";
type MasterDialogMode = "create" | "edit";

type SettingsPageProps = {
  comfortableMode: boolean;
  setComfortableMode: (value: boolean) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
};

const customerDetails: Record<string, CustomerDetail> = {
  "PLG-001": { discountLm: 10, discountBr: 5, threshold: 10000000, turnover: 18650000, phone: "0812-3456-7890", address: "Surabaya" },
  "PLG-002": { discountLm: 8, discountBr: 5, threshold: 12000000, turnover: 14200000, phone: "0813-2222-1100", address: "Sidoarjo" },
  "PLG-003": { discountLm: 7, discountBr: 4, threshold: 10000000, turnover: 7350000, phone: "0821-4433-8877", address: "Gresik" },
  "PLG-004": { discountLm: 12, discountBr: 6, threshold: 15000000, turnover: 24100000, phone: "0812-9900-4411", address: "Mojokerto" }
};

const reportRows = [
  { date: "18 Jun 2026", reference: "BON-20260618-014", customer: "Toko Sinar Abadi", type: "LM", amount: 1250000, profit: 212500, status: "Belum Lunas" as const },
  { date: "18 Jun 2026", reference: "BON-20260618-013", customer: "CV Berkah Jaya", type: "BR", amount: 2860000, profit: 486200, status: "Lunas" as const },
  { date: "17 Jun 2026", reference: "BON-20260617-012", customer: "Toko Maju Lancar", type: "LM", amount: 780000, profit: 132600, status: "Belum Lunas" as const },
  { date: "17 Jun 2026", reference: "BON-20260617-011", customer: "UD Makmur", type: "BR", amount: 4120000, profit: 700400, status: "Lunas" as const }
];

export function FinalCustomersPage({
  onCreateBon,
  onSettlement,
  onViewBon
}: {
  onCreateBon: () => void;
  onSettlement: () => void;
  onViewBon: (bonNumber: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCustomerCode, setSelectedCustomerCode] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: MasterDialogMode; code?: string } | null>(null);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => `${customer.name} ${customer.code}`.toLowerCase().includes(query));
  }, [search]);

  const selectedCustomer = customers.find((customer) => customer.code === selectedCustomerCode) ?? null;

  if (selectedCustomer) {
    return (
      <CustomerDetailPage
        customer={selectedCustomer}
        onBack={() => setSelectedCustomerCode(null)}
        onEdit={() => setDialog({ mode: "edit", code: selectedCustomer.code })}
        onCreateBon={onCreateBon}
        onSettlement={onSettlement}
        onViewBon={onViewBon}
      />
    );
  }

  return (
    <section className="final-page" aria-labelledby="customers-title">
      <FinalPageHeader
        eyebrow="Data master"
        title="Pelanggan"
        description="Cari pelanggan, lihat piutang, dan buka detail tanpa menu yang berlapis-lapis."
        icon={<Users size={30} />}
        action={
          <button className="button button--primary" type="button" onClick={() => setDialog({ mode: "create" })}>
            <UserPlus size={20} />
            Tambah Pelanggan
          </button>
        }
      />

      <section className="final-card final-toolbar">
        <label className="search-box final-search-box">
          <Search size={21} aria-hidden="true" />
          <span className="sr-only">Cari pelanggan</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau kode pelanggan" />
        </label>
        <span className="result-count">{filteredCustomers.length} pelanggan ditemukan</span>
      </section>

      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Users size={34} />}
          title="Pelanggan tidak ditemukan"
          description="Periksa kembali kata pencarian atau tambahkan pelanggan baru."
          actionLabel="Tambah Pelanggan"
          onAction={() => setDialog({ mode: "create" })}
        />
      ) : (
        <div className="final-customer-grid">
          {filteredCustomers.map((customer) => {
            const detail = customerDetails[customer.code];
            return (
              <button className="final-customer-card" type="button" key={customer.code} onClick={() => setSelectedCustomerCode(customer.code)}>
                <span className="customer-avatar">{customer.name.slice(0, 2).toUpperCase()}</span>
                <span className="final-customer-card-copy">
                  <span className="eyebrow">{customer.code}</span>
                  <strong>{customer.name}</strong>
                  <small>{detail.address} · {detail.phone}</small>
                  <span className="final-customer-card-metrics">
                    <span>Piutang <strong>{formatCurrency(customer.receivable)}</strong></span>
                    <span>Bonus <strong>{customer.bonus} unit</strong></span>
                  </span>
                </span>
                <ChevronRight size={22} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      <MasterDataDialog kind="customer" mode={dialog?.mode ?? "create"} open={dialog !== null} onClose={() => setDialog(null)} />
    </section>
  );
}

function CustomerDetailPage({
  customer,
  onBack,
  onEdit,
  onCreateBon,
  onSettlement,
  onViewBon
}: {
  customer: (typeof customers)[number];
  onBack: () => void;
  onEdit: () => void;
  onCreateBon: () => void;
  onSettlement: () => void;
  onViewBon: (bonNumber: string) => void;
}) {
  const detail = customerDetails[customer.code];
  const customerBons = bons.filter((bon) => bon.customer === customer.name);
  const progress = Math.min(100, Math.round((detail.turnover / detail.threshold) * 100));

  return (
    <section className="final-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={20} />
        Kembali ke daftar pelanggan
      </button>

      <div className="customer-detail-hero">
        <div className="customer-detail-identity">
          <span className="customer-avatar customer-avatar--large">{customer.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <span className="eyebrow">{customer.code}</span>
            <h2>{customer.name}</h2>
            <p>{detail.address} · {detail.phone}</p>
          </div>
        </div>
        <div className="customer-detail-actions">
          <button className="button button--secondary" type="button" onClick={onEdit}><Pencil size={19} />Edit</button>
          <button className="button button--secondary" type="button" onClick={onSettlement}><HandCoins size={19} />Pelunasan</button>
          <button className="button button--primary" type="button" onClick={onCreateBon}><Plus size={19} />Buat Bon</button>
        </div>
      </div>

      <div className="customer-stat-grid">
        <StatCard label="Total Piutang" value={formatCurrency(customer.receivable)} helper={`${customerBons.filter((bon) => bon.status === "Belum Lunas").length} Bon belum lunas`} icon={<WalletCards size={24} />} tone="blue" />
        <StatCard label="Bonus Tersedia" value={`${customer.bonus} unit`} helper="Dapat digunakan saat membuat Bon" icon={<Gift size={24} />} tone="green" />
        <StatCard label="Diskon LM" value={`${detail.discountLm}%`} helper={`Diskon BR ${detail.discountBr}%`} icon={<BadgePercent size={24} />} tone="violet" />
        <StatCard label="Omzet Berjalan" value={formatCurrency(detail.turnover)} helper={`Threshold ${formatCurrency(detail.threshold)}`} icon={<BarChart3 size={24} />} tone="orange" />
      </div>

      <div className="customer-detail-layout">
        <section className="final-card">
          <div className="final-section-heading">
            <div><span className="eyebrow">Riwayat transaksi</span><h3>Bon Pelanggan</h3></div>
            <ReceiptText size={24} />
          </div>
          {customerBons.length === 0 ? (
            <EmptyState icon={<ReceiptText size={30} />} title="Belum ada Bon" description="Transaksi pelanggan akan muncul di sini." />
          ) : (
            <div className="customer-bon-list">
              {customerBons.map((bon) => (
                <button className="customer-bon-row" type="button" key={bon.number} onClick={() => onViewBon(bon.number)}>
                  <span><strong>{bon.number}</strong><small>{bon.date}</small></span>
                  <strong>{formatCurrency(bon.amount)}</strong>
                  <StatusBadge status={bon.status} />
                  <ChevronRight size={20} />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="final-card bonus-progress-card">
          <div className="final-section-heading">
            <div><span className="eyebrow">Perolehan bonus</span><h3>Progress Bonus</h3></div>
            <Gift size={24} />
          </div>
          <div className="progress-value"><strong>{progress}%</strong><span>menuju threshold berikutnya</span></div>
          <div className="progress-track" aria-label={`Progress bonus ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
          <dl className="progress-details">
            <div><dt>Omzet tercatat</dt><dd>{formatCurrency(detail.turnover)}</dd></div>
            <div><dt>Threshold aktif</dt><dd>{formatCurrency(detail.threshold)}</dd></div>
            <div><dt>Sisa kebutuhan</dt><dd>{formatCurrency(Math.max(0, detail.threshold - detail.turnover))}</dd></div>
          </dl>
          <div className="info-note"><Info size={20} /><span>Bonus dihitung dari transaksi berstatus Lunas.</span></div>
        </aside>
      </div>
    </section>
  );
}

export function FinalProductsPage() {
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ mode: MasterDialogMode; productName?: string } | null>(null);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => `${product.name} ${product.type}`.toLowerCase().includes(query));
  }, [search]);

  return (
    <section className="final-page" aria-labelledby="products-title">
      <FinalPageHeader
        eyebrow="Data master"
        title="Produk"
        description="Harga, stok, dan jenis produk ditampilkan dengan jelas agar mudah diperiksa."
        icon={<ShoppingBag size={30} />}
        action={<button className="button button--primary" type="button" onClick={() => setDialog({ mode: "create" })}><PackagePlus size={20} />Tambah Produk</button>}
      />

      <section className="final-card final-toolbar">
        <label className="search-box final-search-box">
          <Search size={21} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau jenis produk" />
        </label>
        <span className="result-count">{filteredProducts.length} produk ditemukan</span>
      </section>

      {filteredProducts.length === 0 ? (
        <EmptyState icon={<ShoppingBag size={34} />} title="Produk tidak ditemukan" description="Periksa pencarian atau tambahkan produk baru." actionLabel="Tambah Produk" onAction={() => setDialog({ mode: "create" })} />
      ) : (
        <div className="final-product-list">
          {filteredProducts.map((product) => (
            <article className="final-product-card" key={product.name}>
              <div className="product-icon"><ShoppingBag size={24} /></div>
              <div className="final-product-copy">
                <div><h3>{product.name}</h3><span className={`status-badge status-badge--${product.type.toLowerCase()}`}>{product.type}</span></div>
                <div className="final-product-metrics">
                  <span>Harga jual <strong>{formatCurrency(product.price)}</strong></span>
                  <span>Estimasi modal <strong>{formatCurrency(Math.round(product.price * 0.82 / 100) * 100)}</strong></span>
                  <span>Stok <strong>{product.stock}</strong></span>
                </div>
              </div>
              <button className="button button--secondary button--compact" type="button" onClick={() => setDialog({ mode: "edit", productName: product.name })}><Pencil size={18} />Edit</button>
            </article>
          ))}
        </div>
      )}

      <MasterDataDialog kind="product" mode={dialog?.mode ?? "create"} open={dialog !== null} onClose={() => setDialog(null)} />
    </section>
  );
}

export function FinalBonusPage() {
  const [selectedCode, setSelectedCode] = useState(customers[0].code);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const selectedCustomer = customers.find((customer) => customer.code === selectedCode) ?? customers[0];
  const detail = customerDetails[selectedCustomer.code];
  const progress = Math.min(100, Math.round((detail.turnover / detail.threshold) * 100));

  return (
    <section className="final-page">
      <FinalPageHeader
        eyebrow="Program pelanggan"
        title="Bonus Pelanggan"
        description="Bonus dipisahkan dari omzet dan laba agar pencatatan tetap mudah dipahami."
        icon={<Gift size={30} />}
        action={<button className="button button--secondary" type="button" onClick={() => setThresholdDialogOpen(true)}><SlidersHorizontal size={20} />Ubah Threshold</button>}
      />

      <div className="bonus-rule-banner">
        <Info size={24} />
        <div><strong>Aturan bonus</strong><span>Bonus tidak menambah omzet, piutang, atau laba. Biaya barang bonus dicatat sebagai biaya promosi.</span></div>
      </div>

      <div className="bonus-summary-grid">
        <StatCard label="Pelanggan Berbonus" value="3 pelanggan" helper="Memiliki minimal 1 unit" icon={<Users size={24} />} tone="blue" />
        <StatCard label="Bonus Tersedia" value="6 unit" helper="Siap digunakan" icon={<Gift size={24} />} tone="green" />
        <StatCard label="Biaya Promosi" value={formatCurrency(1640000)} helper="Bulan Juni 2026" icon={<CircleDollarSign size={24} />} tone="orange" />
      </div>

      <div className="bonus-layout">
        <section className="final-card">
          <div className="final-section-heading"><div><span className="eyebrow">Daftar pelanggan</span><h3>Bonus Tersedia</h3></div><Gift size={24} /></div>
          <div className="bonus-customer-list">
            {customers.map((customer) => (
              <button className={`bonus-customer-row ${selectedCode === customer.code ? "bonus-customer-row--active" : ""}`} type="button" key={customer.code} onClick={() => setSelectedCode(customer.code)}>
                <span className="customer-avatar">{customer.name.slice(0, 2).toUpperCase()}</span>
                <span><strong>{customer.name}</strong><small>{customer.code}</small></span>
                <strong>{customer.bonus} unit</strong>
                <ChevronRight size={20} />
              </button>
            ))}
          </div>
        </section>

        <aside className="final-card bonus-detail-card">
          <span className="eyebrow">Pelanggan dipilih</span>
          <h3>{selectedCustomer.name}</h3>
          <div className="bonus-unit-display"><Gift size={28} /><div><strong>{selectedCustomer.bonus} unit</strong><span>bonus tersedia</span></div></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="bonus-progress-copy"><span>{formatCurrency(detail.turnover)}</span><span>Threshold {formatCurrency(detail.threshold)}</span></div>
          <button className="button button--primary button--full" type="button" disabled={selectedCustomer.bonus === 0}><Gift size={20} />Gunakan Saat Buat Bon</button>
        </aside>
      </div>

      <section className="final-card">
        <div className="final-section-heading"><div><span className="eyebrow">Jejak pencatatan</span><h3>Riwayat Bonus</h3></div><FileText size={24} /></div>
        <div className="bonus-history-list">
          <HistoryRow date="18 Jun 2026" title="Bonus digunakan" detail="1 unit · Gelang Retail A" amount="-1 unit" tone="danger" />
          <HistoryRow date="15 Jun 2026" title="Bonus diperoleh" detail="Threshold omzet tercapai" amount="+1 unit" tone="success" />
          <HistoryRow date="02 Jun 2026" title="Bonus diperoleh" detail="Threshold omzet tercapai" amount="+1 unit" tone="success" />
        </div>
      </section>

      <ThresholdDialog open={thresholdDialogOpen} onClose={() => setThresholdDialogOpen(false)} />
    </section>
  );
}

export function FinalReportsPage() {
  const [month, setMonth] = useState("6");
  const [year, setYear] = useState("2026");
  const [customer, setCustomer] = useState("all");
  const [productType, setProductType] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const filteredRows = useMemo(() => reportRows.filter((row) =>
    (customer === "all" || row.customer === customer) &&
    (productType === "all" || row.type === productType) &&
    (status === "all" || row.status === status)
  ), [customer, productType, status]);

  const totalRevenue = filteredRows.filter((row) => row.status === "Lunas").reduce((sum, row) => sum + row.amount, 0);
  const totalProfit = filteredRows.filter((row) => row.status === "Lunas").reduce((sum, row) => sum + row.profit, 0);
  const totalReceivable = filteredRows.filter((row) => row.status === "Belum Lunas").reduce((sum, row) => sum + row.amount, 0);

  const refresh = () => {
    setLoading(true);
    setShowError(false);
    window.setTimeout(() => setLoading(false), 650);
  };

  return (
    <section className="final-page">
      <FinalPageHeader
        eyebrow="Analisis usaha"
        title="Laporan"
        description="Pilih periode dan filter, lalu baca ringkasan sebelum mengunduh PDF."
        icon={<BarChart3 size={30} />}
        action={<button className="button button--primary" type="button"><Download size={20} />Unduh PDF</button>}
      />

      <section className="final-card report-filter-card">
        <div className="final-section-heading"><div><span className="eyebrow">Filter laporan</span><h3>Pilih Data</h3></div><SlidersHorizontal size={24} /></div>
        <div className="report-filter-grid">
          <label className="field"><span>Bulan</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="6">Juni</option><option value="5">Mei</option><option value="4">April</option></select></label>
          <label className="field"><span>Tahun</span><select value={year} onChange={(event) => setYear(event.target.value)}><option>2026</option><option>2025</option></select></label>
          <label className="field"><span>Pelanggan</span><select value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="all">Semua pelanggan</option>{customers.map((entry) => <option value={entry.name} key={entry.code}>{entry.name}</option>)}</select></label>
          <label className="field"><span>Jenis produk</span><select value={productType} onChange={(event) => setProductType(event.target.value)}><option value="all">LM dan BR</option><option value="LM">LM</option><option value="BR">BR</option></select></label>
          <label className="field"><span>Status Bon</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Semua status</option><option value="Lunas">Lunas</option><option value="Belum Lunas">Belum Lunas</option></select></label>
          <button className="button button--secondary report-refresh-button" type="button" onClick={refresh}><RefreshCw size={20} />Terapkan Filter</button>
        </div>
      </section>

      {showError ? (
        <ErrorState title="Laporan gagal dimuat" description="Periksa koneksi server lalu coba kembali." onRetry={() => setShowError(false)} />
      ) : loading ? (
        <LoadingState label="Memuat laporan..." />
      ) : (
        <>
          <div className="report-stat-grid">
            <StatCard label="Omzet Lunas" value={formatCurrency(totalRevenue)} helper="Basis kas" icon={<CircleDollarSign size={24} />} tone="green" />
            <StatCard label="Laba Lunas" value={formatCurrency(totalProfit)} helper="Tidak termasuk bonus" icon={<BarChart3 size={24} />} tone="blue" />
            <StatCard label="Piutang Aktif" value={formatCurrency(totalReceivable)} helper="Belum masuk omzet kas" icon={<WalletCards size={24} />} tone="orange" />
          </div>

          <section className="final-card">
            <div className="final-section-heading"><div><span className="eyebrow">Hasil filter</span><h3>Transaksi Juni {year}</h3></div><button className="text-button" type="button" onClick={() => setShowError(true)}>Simulasi Error</button></div>
            {filteredRows.length === 0 ? (
              <EmptyState icon={<FileText size={34} />} title="Tidak ada data" description="Tidak ada transaksi yang sesuai dengan filter pilihan." />
            ) : (
              <div className="final-report-table-wrap">
                <table className="final-report-table">
                  <thead><tr><th>Tanggal</th><th>Referensi</th><th>Pelanggan</th><th>Jenis</th><th>Total</th><th>Laba</th><th>Status</th></tr></thead>
                  <tbody>{filteredRows.map((row) => <tr key={row.reference}><td>{row.date}</td><td><strong>{row.reference}</strong></td><td>{row.customer}</td><td>{row.type}</td><td>{formatCurrency(row.amount)}</td><td>{formatCurrency(row.profit)}</td><td><StatusBadge status={row.status} /></td></tr>)}</tbody>
                </table>
                <div className="final-report-mobile-list">{filteredRows.map((row) => <article className="report-mobile-card" key={row.reference}><div><span className="eyebrow">{row.reference}</span><h4>{row.customer}</h4></div><StatusBadge status={row.status} /><dl><div><dt>Tanggal</dt><dd>{row.date}</dd></div><div><dt>Jenis</dt><dd>{row.type}</dd></div><div><dt>Total</dt><dd>{formatCurrency(row.amount)}</dd></div><div><dt>Laba</dt><dd>{formatCurrency(row.profit)}</dd></div></dl></article>)}</div>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export function FinalSettingsPage({ comfortableMode, setComfortableMode, highContrast, setHighContrast, reducedMotion, setReducedMotion }: SettingsPageProps) {
  const [saved, setSaved] = useState(false);
  const [storeName, setStoreName] = useState("HL Sales");

  const saveSettings = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <section className="final-page">
      <FinalPageHeader eyebrow="Preferensi aplikasi" title="Pengaturan" description="Atur tampilan dan informasi toko dengan pilihan yang sederhana." icon={<Settings size={30} />} />

      {saved && <div className="success-banner" role="status"><CheckCircle2 size={23} /><div><strong>Pengaturan disimpan</strong><span>Preferensi tampilan akan digunakan selama sesi ini.</span></div></div>}

      <div className="settings-layout">
        <div className="settings-main-column">
          <section className="final-card">
            <div className="final-section-heading"><div><span className="eyebrow">Kenyamanan membaca</span><h3>Tampilan</h3></div><ZoomIn size={24} /></div>
            <div className="setting-option-list">
              <SettingToggle icon={<ZoomIn size={22} />} title="Teks dan tombol lebih besar" description="Direkomendasikan untuk penggunaan sehari-hari." checked={comfortableMode} onChange={setComfortableMode} />
              <SettingToggle icon={<Contrast size={22} />} title="Kontras tinggi" description="Mempertegas teks, garis, dan tombol penting." checked={highContrast} onChange={setHighContrast} />
              <SettingToggle icon={<RefreshCw size={22} />} title="Kurangi animasi" description="Mengurangi perpindahan dan efek gerak antarelemen." checked={reducedMotion} onChange={setReducedMotion} />
            </div>
          </section>

          <section className="final-card">
            <div className="final-section-heading"><div><span className="eyebrow">Identitas usaha</span><h3>Informasi Toko</h3></div><ShoppingBag size={24} /></div>
            <div className="settings-form-grid">
              <label className="field"><span>Nama toko</span><input value={storeName} onChange={(event) => setStoreName(event.target.value)} /></label>
              <label className="field"><span>Format tanggal</span><select defaultValue="id"><option value="id">18 Juni 2026</option><option value="short">18/06/2026</option></select></label>
              <label className="field field--wide"><span>Alamat toko</span><textarea defaultValue="Surabaya, Jawa Timur" rows={3} /></label>
            </div>
          </section>

          <section className="final-card">
            <div className="final-section-heading"><div><span className="eyebrow">Keamanan akun</span><h3>Akun dan Sesi</h3></div><ShieldCheck size={24} /></div>
            <button className="settings-action-row" type="button"><span className="settings-action-icon"><KeyRound size={22} /></span><span><strong>Ubah kata sandi</strong><small>Gunakan kata sandi yang mudah diingat tetapi tidak mudah ditebak.</small></span><ChevronRight size={21} /></button>
          </section>
        </div>

        <aside className="final-card settings-summary-card">
          <ShieldCheck size={34} />
          <h3>HL Sales Management</h3>
          <p>Template UI Phase 3</p>
          <dl><div><dt>Versi</dt><dd>0.1.0</dd></div><div><dt>Mode</dt><dd>Data contoh</dd></div><div><dt>API</dt><dd>Belum terhubung</dd></div></dl>
          <button className="button button--primary button--full" type="button" onClick={saveSettings}><Save size={20} />Simpan Pengaturan</button>
        </aside>
      </div>
    </section>
  );
}

function MasterDataDialog({ kind, mode, open, onClose }: { kind: MasterDialogKind; mode: MasterDialogMode; open: boolean; onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  if (!open) return null;
  const customer = kind === "customer";
  const title = `${mode === "create" ? "Tambah" : "Edit"} ${customer ? "Pelanggan" : "Produk"}`;

  return (
    <div className="dialog-backdrop final-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="final-form-dialog" role="dialog" aria-modal="true" aria-labelledby="master-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="final-form-dialog-header"><div><span className="eyebrow">Data master</span><h2 id="master-dialog-title">{title}</h2><p>Isi data penting saja. Field wajib diberi tanda jelas.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header>
        {saved ? (
          <div className="dialog-success-state"><CheckCircle2 size={46} /><h3>Data berhasil disimpan</h3><p>Perubahan akan muncul pada daftar setelah integrasi API.</p><button className="button button--primary" type="button" onClick={onClose}>Selesai</button></div>
        ) : (
          <>
            <div className="final-form-dialog-body">
              {customer ? (
                <div className="master-form-grid">
                  <label className="field field--wide"><span>Nama pelanggan *</span><input defaultValue={mode === "edit" ? "Toko Sinar Abadi" : ""} placeholder="Contoh: Toko Sinar Abadi" /></label>
                  <label className="field"><span>Kode pelanggan *</span><input defaultValue={mode === "edit" ? "PLG-001" : ""} placeholder="PLG-005" /></label>
                  <label className="field"><span>Nomor telepon</span><input inputMode="tel" placeholder="08xx-xxxx-xxxx" /></label>
                  <label className="field"><span>Diskon LM (%)</span><input type="number" defaultValue={10} min={0} max={100} /></label>
                  <label className="field"><span>Diskon BR (%)</span><input type="number" defaultValue={5} min={0} max={100} /></label>
                  <label className="field field--wide"><span>Threshold bonus</span><input inputMode="numeric" defaultValue={10000000} /><small>{formatCurrency(10000000)}</small></label>
                  <label className="field field--wide"><span>Alamat</span><textarea rows={3} placeholder="Alamat singkat pelanggan" /></label>
                </div>
              ) : (
                <div className="master-form-grid">
                  <label className="field field--wide"><span>Nama produk *</span><input defaultValue={mode === "edit" ? "Logam Mulia 1 Gram" : ""} placeholder="Nama produk" /></label>
                  <label className="field"><span>Jenis produk *</span><select><option>LM</option><option>BR</option></select></label>
                  <label className="field"><span>Stok awal</span><input type="number" defaultValue={0} min={0} /></label>
                  <label className="field"><span>Harga modal *</span><input inputMode="numeric" defaultValue={1295600} /><small>{formatCurrency(1295600)}</small></label>
                  <label className="field"><span>Harga jual *</span><input inputMode="numeric" defaultValue={1580000} /><small>{formatCurrency(1580000)}</small></label>
                  <label className="setting-toggle-card field--wide"><input type="checkbox" defaultChecked /><span className="toggle-switch"><span /></span><span><strong>Produk aktif</strong><small>Dapat dipilih pada Bon baru.</small></span></label>
                </div>
              )}
            </div>
            <footer className="final-form-dialog-footer"><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--primary" type="button" onClick={() => setSaved(true)}><Save size={20} />Simpan Data</button></footer>
          </>
        )}
      </section>
    </div>
  );
}

function ThresholdDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop final-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="final-form-dialog final-form-dialog--small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="final-form-dialog-header"><div><span className="eyebrow">Aturan bonus</span><h2>Ubah Threshold</h2><p>Perubahan hanya berlaku untuk perolehan bonus berikutnya.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={22} /></button></header>
        <div className="final-form-dialog-body"><label className="field"><span>Threshold omzet</span><input defaultValue={10000000} inputMode="numeric" /><small>{formatCurrency(10000000)}</small></label><div className="info-note"><Info size={20} /><span>Riwayat bonus lama tidak akan berubah.</span></div></div>
        <footer className="final-form-dialog-footer"><button className="button button--secondary" type="button" onClick={onClose}>Batal</button><button className="button button--primary" type="button" onClick={onClose}>Simpan Threshold</button></footer>
      </section>
    </div>
  );
}

function FinalPageHeader({ eyebrow, title, description, icon, action }: { eyebrow: string; title: string; description: string; icon: ReactNode; action?: ReactNode }) {
  return <header className="final-page-header"><div className="final-page-heading-icon">{icon}</div><div className="final-page-heading-copy"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action && <div className="final-page-header-action">{action}</div>}</header>;
}

function StatCard({ label, value, helper, icon, tone }: { label: string; value: string; helper: string; icon: ReactNode; tone: "blue" | "green" | "violet" | "orange" }) {
  return <article className={`final-stat-card final-stat-card--${tone}`}><span className="final-stat-icon">{icon}</span><span><small>{label}</small><strong>{value}</strong><span>{helper}</span></span></article>;
}

function HistoryRow({ date, title, detail, amount, tone }: { date: string; title: string; detail: string; amount: string; tone: "success" | "danger" }) {
  return <article className="history-row"><span className={`history-dot history-dot--${tone}`} /><span><strong>{title}</strong><small>{date} · {detail}</small></span><strong className={`history-amount history-amount--${tone}`}>{amount}</strong></article>;
}

function SettingToggle({ icon, title, description, checked, onChange }: { icon: ReactNode; title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="setting-toggle-card"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="settings-action-icon">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><span className="toggle-switch"><span /></span></label>;
}

function EmptyState({ icon, title, description, actionLabel, onAction }: { icon: ReactNode; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <section className="final-state-card"><span className="final-state-icon">{icon}</span><h3>{title}</h3><p>{description}</p>{actionLabel && onAction && <button className="button button--primary" type="button" onClick={onAction}>{actionLabel}</button>}</section>;
}

function LoadingState({ label }: { label: string }) {
  return <section className="final-state-card" role="status"><span className="final-state-icon final-state-icon--loading"><LoaderCircle size={34} /></span><h3>{label}</h3><p>Mohon tunggu sebentar.</p></section>;
}

function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return <section className="final-state-card final-state-card--error"><span className="final-state-icon"><AlertCircle size={34} /></span><h3>{title}</h3><p>{description}</p><button className="button button--primary" type="button" onClick={onRetry}>Coba Lagi</button></section>;
}
