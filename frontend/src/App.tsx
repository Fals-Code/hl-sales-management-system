import { useMemo, useState } from "react";
import {
  Accessibility,
  Bell,
  Gift,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { BonDialog } from "./BonDialog";
import { MobileNavButton } from "./components";
import { bons, navigation, type PageKey } from "./data";
import { LoginPage } from "./LoginPage";
import {
  BonsPage,
  CustomersPage,
  DashboardPage,
  PlaceholderPage,
  ProductsPage,
  ReceivablesPage,
  ReportsPage
} from "./pages";
import { BonDetailPage, SettlementPage } from "./workflow-pages";

const pageDescriptions: Record<PageKey, string> = {
  dashboard: "Ringkasan kondisi toko dan tindakan penting hari ini",
  customers: "Kelola identitas, diskon, piutang, dan bonus pelanggan",
  products: "Kelola produk LM dan BR beserta harga dan stok",
  bons: "Lihat seluruh transaksi penjualan dan status pembayarannya",
  receivables: "Pantau bon yang belum lunas dan prioritas penagihan",
  settlements: "Catat pembayaran pelanggan secara aman dan jelas",
  bonus: "Pantau bonus pelanggan tanpa menambah omzet atau laba",
  reports: "Baca ringkasan usaha dan unduh laporan yang dibutuhkan",
  settings: "Atur kenyamanan tampilan dan preferensi aplikasi"
};

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bonDialogOpen, setBonDialogOpen] = useState(false);
  const [comfortableMode, setComfortableMode] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBonNumber, setSelectedBonNumber] = useState<string | null>(null);
  const [settlementPrefill, setSettlementPrefill] = useState<string | null>(null);

  const selectedBon = bons.find((bon) => bon.number === selectedBonNumber) ?? null;
  const pageTitle = selectedBon
    ? "Detail Bon"
    : navigation.find((item) => item.key === activePage)?.label ?? "Pengaturan";
  const pageDescription = selectedBon
    ? `${selectedBon.number} · ${selectedBon.customer}`
    : pageDescriptions[activePage];

  const filteredBons = useMemo(
    () => bons.filter((bon) => `${bon.number} ${bon.customer}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const changePage = (page: PageKey) => {
    setActivePage(page);
    setSelectedBonNumber(null);
    setMobileMenuOpen(false);
  };

  const openBonDetail = (bonNumber: string) => {
    setSelectedBonNumber(bonNumber);
    setMobileMenuOpen(false);
  };

  const openSettlementForBon = (bonNumber: string) => {
    setSettlementPrefill(bonNumber);
    setSelectedBonNumber(null);
    setActivePage("settlements");
  };

  if (!signedIn) return <LoginPage onLogin={() => setSignedIn(true)} />;

  return (
    <div className={`app-shell ${comfortableMode ? "app-shell--comfortable" : ""}`}>
      <a className="skip-link" href="#main-content">Langsung ke isi halaman</a>

      <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`} aria-label="Navigasi utama">
        <div className="brand-block">
          <div className="brand-mark">HL</div>
          <div>
            <strong>HL Sales</strong>
            <span>Manajemen Toko</span>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup menu">
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-label">Menu utama</div>
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key && !selectedBon;
            return (
              <button
                key={item.key}
                className={`nav-item ${active ? "nav-item--active" : ""}`}
                onClick={() => changePage(item.key)}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          className={`sidebar-help-card ${comfortableMode ? "sidebar-help-card--active" : ""}`}
          type="button"
          onClick={() => setComfortableMode((value) => !value)}
          aria-pressed={comfortableMode}
        >
          <Accessibility size={24} />
          <span>
            <strong>{comfortableMode ? "Tampilan nyaman aktif" : "Gunakan tampilan nyaman"}</strong>
            <small>{comfortableMode ? "Teks dan tombol dibuat lebih besar." : "Perbesar teks dan ruang antarelemen."}</small>
          </span>
        </button>

        <div className="sidebar-footer">
          <button className={`nav-item ${activePage === "settings" && !selectedBon ? "nav-item--active" : ""}`} onClick={() => changePage("settings")}>
            <Settings size={22} />
            <span>Pengaturan</span>
          </button>
          <button className="nav-item nav-item--danger" onClick={() => setSignedIn(false)}>
            <LogOut size={22} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <button className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup menu" />}

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Buka menu">
            <Menu size={26} />
          </button>
          <div className="topbar-title">
            <span className="eyebrow">HL Sales Management</span>
            <h1>{pageTitle}</h1>
            <p className="topbar-context">{pageDescription}</p>
          </div>
          <div className="topbar-actions">
            <button
              className={`comfort-toggle ${comfortableMode ? "comfort-toggle--active" : ""}`}
              onClick={() => setComfortableMode((value) => !value)}
              aria-pressed={comfortableMode}
              title="Ubah ukuran teks dan ruang antarelemen"
            >
              <Accessibility size={21} />
              <span>{comfortableMode ? "Teks besar" : "Teks normal"}</span>
            </button>
            <button className="button button--primary topbar-create-button" onClick={() => setBonDialogOpen(true)}>
              <Plus size={20} />
              <span>Buat Bon</span>
            </button>
            <button className="icon-button notification-button" aria-label="Notifikasi">
              <Bell size={23} />
              <span className="notification-dot" />
            </button>
            <div className="user-chip" aria-label="Pengguna aktif Admin HL">
              <div className="user-avatar">AD</div>
              <div>
                <strong>Admin HL</strong>
                <span>Pengguna utama</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content" id="main-content" tabIndex={-1}>
          {selectedBon ? (
            <BonDetailPage
              bon={selectedBon}
              onBack={() => setSelectedBonNumber(null)}
              onRecordSettlement={openSettlementForBon}
            />
          ) : (
            <>
              {activePage === "dashboard" && (
                <DashboardPage
                  search={search}
                  setSearch={setSearch}
                  rows={filteredBons}
                  onCreateBon={() => setBonDialogOpen(true)}
                  onNavigate={changePage}
                  onViewBon={openBonDetail}
                />
              )}
              {activePage === "customers" && <CustomersPage />}
              {activePage === "products" && <ProductsPage />}
              {activePage === "bons" && (
                <BonsPage
                  rows={filteredBons}
                  search={search}
                  setSearch={setSearch}
                  onCreate={() => setBonDialogOpen(true)}
                  onViewBon={openBonDetail}
                />
              )}
              {activePage === "receivables" && <ReceivablesPage onViewBon={openBonDetail} />}
              {activePage === "settlements" && (
                <SettlementPage
                  initialBonNumber={settlementPrefill}
                  onClearInitialBon={() => setSettlementPrefill(null)}
                  onViewBon={openBonDetail}
                />
              )}
              {activePage === "bonus" && (
                <PlaceholderPage icon={Gift} title="Bonus Pelanggan" description="Lihat unit bonus tersedia, riwayat penggunaan, dan biaya promosi." action="Lihat Pelanggan Berbonus" />
              )}
              {activePage === "reports" && <ReportsPage />}
              {activePage === "settings" && (
                <PlaceholderPage icon={Settings} title="Pengaturan" description="Atur preferensi tampilan, keamanan sesi, dan informasi toko." action="Simpan Pengaturan" />
              )}
            </>
          )}
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navigasi mobile">
        <MobileNavButton active={activePage === "dashboard" && !selectedBon} icon={Home} label="Beranda" onClick={() => changePage("dashboard")} />
        <MobileNavButton active={activePage === "customers" && !selectedBon} icon={Users} label="Pelanggan" onClick={() => changePage("customers")} />
        <button className="mobile-create-button" onClick={() => setBonDialogOpen(true)} aria-label="Buat bon baru">
          <Plus size={28} />
          <span>Buat Bon</span>
        </button>
        <MobileNavButton active={activePage === "receivables" && !selectedBon} icon={WalletCards} label="Piutang" onClick={() => changePage("receivables")} />
        <MobileNavButton active={mobileMenuOpen} icon={Menu} label="Lainnya" onClick={() => setMobileMenuOpen(true)} />
      </nav>

      <BonDialog open={bonDialogOpen} onClose={() => setBonDialogOpen(false)} />
    </div>
  );
}
