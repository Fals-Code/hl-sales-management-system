import { useState } from "react";
import {
  Accessibility,
  Bell,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { AcceptanceBonDialog } from "./AcceptanceBonDialog";
import { AcceptanceBonusPage, AcceptanceReportsPage } from "./AcceptanceBonusReports";
import { AcceptanceCustomersPage } from "./AcceptanceCustomers";
import { AcceptanceProductsPage } from "./AcceptanceProducts";
import {
  AcceptanceBonsPage,
  AcceptanceDashboardPage,
  AcceptanceReceivablesPage
} from "./AcceptanceTransactions";
import {
  AcceptanceBonDetailPage,
  AcceptanceSettlementPage
} from "./AcceptanceWorkflow";
import { MobileNavButton } from "./components";
import { navigation, type PageKey } from "./data";
import { FinalSettingsPage } from "./final-pages";
import { LoginPage } from "./LoginPage";

const pageDescriptions: Record<PageKey, string> = {
  dashboard: "Ringkasan cash basis, Piutang, dan tindakan penting hari ini",
  customers: "Kelola pelanggan, diskon bertingkat, dan threshold bonus",
  products: "Kelola produk LM dan BR beserta Harga Modal dan Harga Base",
  bons: "Lihat seluruh Bon dengan status Piutang, Lunas, Bonus, atau Void",
  receivables: "Pantau jumlah terutang dan lanjutkan ke Pelunasan",
  settlements: "Lunasi satu Bon atau seluruh Bon dalam satu bulan",
  bonus: "Kelola Bonus Bon tanpa menambah omzet atau laba",
  reports: "Baca rekap cash basis dan breakdown LM serta BR",
  settings: "Atur kenyamanan tampilan dan preferensi aplikasi"
};

type BonMode = "normal" | "bonus";

export default function App() {
  const [signedIn, setSignedIn] = useState(() => window.localStorage.getItem("hl-demo-session") === "active");
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bonDialogOpen, setBonDialogOpen] = useState(false);
  const [bonMode, setBonMode] = useState<BonMode>("normal");
  const [bonPrefillCustomerCode, setBonPrefillCustomerCode] = useState<string | null>(null);
  const [comfortableMode, setComfortableMode] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [selectedBonNumber, setSelectedBonNumber] = useState<string | null>(null);
  const [settlementBonNumber, setSettlementBonNumber] = useState<string | null>(null);
  const [settlementCustomerCode, setSettlementCustomerCode] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const pageTitle = selectedBonNumber
    ? "Detail Bon"
    : navigation.find((item) => item.key === activePage)?.label ?? "Pengaturan";
  const pageDescription = selectedBonNumber
    ? selectedBonNumber
    : pageDescriptions[activePage];

  const changePage = (page: PageKey) => {
    setActivePage(page);
    setSelectedBonNumber(null);
    setMobileMenuOpen(false);
    setNotificationOpen(false);
  };

  const openBonDialog = (customerCode?: string, mode: BonMode = "normal") => {
    setBonPrefillCustomerCode(customerCode ?? null);
    setBonMode(mode);
    setBonDialogOpen(true);
  };

  const closeBonDialog = () => {
    setBonDialogOpen(false);
    setBonPrefillCustomerCode(null);
    setBonMode("normal");
  };

  const openBonDetail = (bonNumber: string) => {
    setSelectedBonNumber(bonNumber);
    setMobileMenuOpen(false);
  };

  const openSettlementForBon = (bonNumber: string) => {
    setSettlementBonNumber(bonNumber);
    setSettlementCustomerCode(null);
    setSelectedBonNumber(null);
    setActivePage("settlements");
  };

  const openSettlementForCustomer = (customerCode?: string) => {
    setSettlementCustomerCode(customerCode ?? null);
    setSettlementBonNumber(null);
    setSelectedBonNumber(null);
    setActivePage("settlements");
  };

  const handleLogin = () => {
    window.localStorage.setItem("hl-demo-session", "active");
    setSignedIn(true);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("hl-demo-session");
    setSignedIn(false);
    setSelectedBonNumber(null);
    setActivePage("dashboard");
  };

  if (!signedIn) return <LoginPage onLogin={handleLogin} />;

  const shellClasses = [
    "app-shell",
    comfortableMode ? "app-shell--comfortable" : "",
    highContrast ? "app-shell--high-contrast" : "",
    reducedMotion ? "app-shell--reduced-motion" : ""
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClasses}>
      <a className="skip-link" href="#main-content">Langsung ke isi halaman</a>

      <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`} aria-label="Navigasi utama">
        <div className="brand-block">
          <div className="brand-mark">HL</div>
          <div><strong>HL Sales</strong><span>Manajemen Toko</span></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup menu"><X size={24} /></button>
        </div>

        <div className="sidebar-label">Menu utama</div>
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key && !selectedBonNumber;
            return <button key={item.key} className={`nav-item ${active ? "nav-item--active" : ""}`} onClick={() => changePage(item.key)} aria-current={active ? "page" : undefined}><Icon size={22} /><span>{item.label}</span></button>;
          })}
        </nav>

        <button className={`sidebar-help-card ${comfortableMode ? "sidebar-help-card--active" : ""}`} type="button" onClick={() => setComfortableMode((value) => !value)} aria-pressed={comfortableMode}>
          <Accessibility size={24} />
          <span><strong>{comfortableMode ? "Tampilan nyaman aktif" : "Gunakan tampilan nyaman"}</strong><small>{comfortableMode ? "Teks dan tombol dibuat lebih besar." : "Perbesar teks dan ruang antarelemen."}</small></span>
        </button>

        <div className="sidebar-footer">
          <button className={`nav-item ${activePage === "settings" && !selectedBonNumber ? "nav-item--active" : ""}`} onClick={() => changePage("settings")}><Settings size={22} /><span>Pengaturan</span></button>
          <button className="nav-item nav-item--danger" onClick={handleLogout}><LogOut size={22} /><span>Keluar</span></button>
        </div>
      </aside>

      {mobileMenuOpen && <button className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup menu" />}

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Buka menu"><Menu size={26} /></button>
          <div className="topbar-title"><span className="eyebrow">HL Sales Management</span><h1>{pageTitle}</h1><p className="topbar-context">{pageDescription}</p></div>
          <div className="topbar-actions">
            <button className={`comfort-toggle ${comfortableMode ? "comfort-toggle--active" : ""}`} onClick={() => setComfortableMode((value) => !value)} aria-pressed={comfortableMode}><Accessibility size={21} /><span>{comfortableMode ? "Teks besar" : "Teks normal"}</span></button>
            <button className="button button--primary topbar-create-button" onClick={() => openBonDialog()}><Plus size={20} /><span>Buat Bon</span></button>
            <div className="notification-wrap">
              <button className="icon-button notification-button" aria-label="Notifikasi" aria-expanded={notificationOpen} onClick={() => setNotificationOpen((value) => !value)}><Bell size={23} /><span className="notification-dot" /></button>
              {notificationOpen && <div className="notification-panel"><strong>Perlu perhatian</strong><button type="button" onClick={() => changePage("receivables")}><WalletCards size={20} /><span><strong>2 Bon Piutang</strong><small>Periksa jadwal penagihan.</small></span></button><button type="button" onClick={() => changePage("bonus")}><Plus size={20} /><span><strong>Bonus tersedia</strong><small>Buat Bonus Bon terpisah.</small></span></button></div>}
            </div>
            <div className="user-chip"><div className="user-avatar">AD</div><div><strong>Admin HL</strong><span>Pengguna utama</span></div></div>
          </div>
        </header>

        <main className="page-content" id="main-content" tabIndex={-1}>
          {selectedBonNumber ? (
            <AcceptanceBonDetailPage bonNumber={selectedBonNumber} onBack={() => setSelectedBonNumber(null)} onSettlement={openSettlementForBon} />
          ) : (
            <>
              {activePage === "dashboard" && <AcceptanceDashboardPage onCreateBon={() => openBonDialog()} onNavigate={changePage} onViewBon={openBonDetail} onCreateBonusBon={(customerCode) => openBonDialog(customerCode, "bonus")} />}
              {activePage === "customers" && <AcceptanceCustomersPage onCreateBon={(customerCode) => openBonDialog(customerCode, "normal")} onSettlement={openSettlementForCustomer} onViewBon={openBonDetail} />}
              {activePage === "products" && <AcceptanceProductsPage />}
              {activePage === "bons" && <AcceptanceBonsPage onCreateBon={() => openBonDialog()} onViewBon={openBonDetail} />}
              {activePage === "receivables" && <AcceptanceReceivablesPage onSettlement={() => openSettlementForCustomer()} onViewBon={openBonDetail} />}
              {activePage === "settlements" && <AcceptanceSettlementPage prefillBonNumber={settlementBonNumber} prefillCustomerCode={settlementCustomerCode} onViewBon={openBonDetail} />}
              {activePage === "bonus" && <AcceptanceBonusPage onCreateBonusBon={(customerCode) => openBonDialog(customerCode, "bonus")} />}
              {activePage === "reports" && <AcceptanceReportsPage />}
              {activePage === "settings" && <FinalSettingsPage comfortableMode={comfortableMode} setComfortableMode={setComfortableMode} highContrast={highContrast} setHighContrast={setHighContrast} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} />}
            </>
          )}
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navigasi mobile">
        <MobileNavButton active={activePage === "dashboard" && !selectedBonNumber} icon={Home} label="Beranda" onClick={() => changePage("dashboard")} />
        <MobileNavButton active={activePage === "customers" && !selectedBonNumber} icon={Users} label="Pelanggan" onClick={() => changePage("customers")} />
        <button className="mobile-create-button" onClick={() => openBonDialog()} aria-label="Buat Bon baru"><Plus size={28} /><span>Buat Bon</span></button>
        <MobileNavButton active={activePage === "receivables" && !selectedBonNumber} icon={WalletCards} label="Piutang" onClick={() => changePage("receivables")} />
        <MobileNavButton active={mobileMenuOpen} icon={Menu} label="Lainnya" onClick={() => setMobileMenuOpen(true)} />
      </nav>

      <AcceptanceBonDialog open={bonDialogOpen} onClose={closeBonDialog} prefillCustomerCode={bonPrefillCustomerCode} initialMode={bonMode} />
    </div>
  );
}
