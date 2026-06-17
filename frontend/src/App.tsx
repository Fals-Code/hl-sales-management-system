import { useMemo, useState } from "react";
import {
  Bell,
  Gift,
  HandCoins,
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

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bonDialogOpen, setBonDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const pageTitle = navigation.find((item) => item.key === activePage)?.label ?? "Pengaturan";
  const filteredBons = useMemo(
    () => bons.filter((bon) => `${bon.number} ${bon.customer}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const changePage = (page: PageKey) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  if (!signedIn) return <LoginPage onLogin={() => setSignedIn(true)} />;

  return (
    <div className="app-shell">
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

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
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

        <div className="sidebar-footer">
          <button className={`nav-item ${activePage === "settings" ? "nav-item--active" : ""}`} onClick={() => changePage("settings")}>
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
          </div>
          <div className="topbar-actions">
            <button className="icon-button notification-button" aria-label="Notifikasi">
              <Bell size={23} />
              <span className="notification-dot" />
            </button>
            <div className="user-chip">
              <div className="user-avatar">AD</div>
              <div>
                <strong>Admin HL</strong>
                <span>Pengguna utama</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          {activePage === "dashboard" && (
            <DashboardPage
              search={search}
              setSearch={setSearch}
              rows={filteredBons}
              onCreateBon={() => setBonDialogOpen(true)}
              onNavigate={changePage}
            />
          )}
          {activePage === "customers" && <CustomersPage />}
          {activePage === "products" && <ProductsPage />}
          {activePage === "bons" && <BonsPage rows={filteredBons} search={search} setSearch={setSearch} onCreate={() => setBonDialogOpen(true)} />}
          {activePage === "receivables" && <ReceivablesPage />}
          {activePage === "settlements" && (
            <PlaceholderPage icon={HandCoins} title="Pelunasan" description="Catat pelunasan satu atau beberapa bon dengan alur yang sederhana dan jelas." action="Catat Pelunasan" />
          )}
          {activePage === "bonus" && (
            <PlaceholderPage icon={Gift} title="Bonus Pelanggan" description="Lihat unit bonus tersedia, riwayat penggunaan, dan biaya promosi." action="Lihat Pelanggan Berbonus" />
          )}
          {activePage === "reports" && <ReportsPage />}
          {activePage === "settings" && (
            <PlaceholderPage icon={Settings} title="Pengaturan" description="Atur preferensi tampilan, keamanan sesi, dan informasi toko." action="Simpan Pengaturan" />
          )}
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navigasi mobile">
        <MobileNavButton active={activePage === "dashboard"} icon={Home} label="Beranda" onClick={() => changePage("dashboard")} />
        <MobileNavButton active={activePage === "customers"} icon={Users} label="Pelanggan" onClick={() => changePage("customers")} />
        <button className="mobile-create-button" onClick={() => setBonDialogOpen(true)} aria-label="Buat bon baru">
          <Plus size={28} />
          <span>Buat Bon</span>
        </button>
        <MobileNavButton active={activePage === "receivables"} icon={WalletCards} label="Piutang" onClick={() => changePage("receivables")} />
        <MobileNavButton active={mobileMenuOpen} icon={Menu} label="Lainnya" onClick={() => setMobileMenuOpen(true)} />
      </nav>

      <BonDialog open={bonDialogOpen} onClose={() => setBonDialogOpen(false)} />
    </div>
  );
}
