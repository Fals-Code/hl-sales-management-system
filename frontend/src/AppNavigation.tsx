import { Accessibility, Bell, Home, LogOut, Menu, Plus, Settings, Users, WalletCards, X } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { MobileNavButton } from "./components";
import { navigation, type PageKey } from "./data";

type AppSidebarProps = {
  activePage: PageKey;
  selectedBonNumber: string | null;
  mobileMenuOpen: boolean;
  comfortableMode?: boolean;
  onChangePage: (page: PageKey) => void;
  onCloseMobile: () => void;
  onToggleComfort?: () => void;
  onLogout: () => void;
};

export function AppSidebar({ activePage, selectedBonNumber, mobileMenuOpen, onChangePage, onCloseMobile, onLogout }: AppSidebarProps) {
  return <>
    <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`} aria-label="Navigasi utama">
      <div className="brand-block">
        <BrandLogo size={45} />
        <div><strong>HL Sales</strong><span>Manajemen Toko</span></div>
        <button className="icon-button sidebar-close" type="button" onClick={onCloseMobile} aria-label="Tutup menu"><X size={24} /></button>
      </div>

      <div className="sidebar-label">Menu utama</div>
      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.key && !selectedBonNumber;
          return <button key={item.key} className={`nav-item ${active ? "nav-item--active" : ""}`} type="button" onClick={() => onChangePage(item.key)} aria-current={active ? "page" : undefined}><Icon size={22} /><span>{item.label}</span></button>;
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-label">Akun & aplikasi</span>
        <button className={`nav-item ${activePage === "settings" && !selectedBonNumber ? "nav-item--active" : ""}`} type="button" onClick={() => onChangePage("settings")}><Settings size={22} /><span>Pengaturan</span></button>
        <button className="nav-item nav-item--danger" type="button" onClick={onLogout}><LogOut size={22} /><span>Keluar</span></button>
      </div>
    </aside>
    {mobileMenuOpen && <button className="sidebar-backdrop" type="button" onClick={onCloseMobile} aria-label="Tutup menu" />}
  </>;
}

export function AppTopbar({ title, description, comfortableMode, notificationOpen, notificationCount, receivableCount, eligibleBonusCount, onOpenMobile, onToggleComfort, onCreateBon, onToggleNotifications, onGoReceivables, onGoBonus }: { title: string; description: string; comfortableMode: boolean; notificationOpen: boolean; notificationCount: number; receivableCount: number; eligibleBonusCount: number; onOpenMobile: () => void; onToggleComfort: () => void; onCreateBon: () => void; onToggleNotifications: () => void; onGoReceivables: () => void; onGoBonus: () => void }) {
  return <header className="topbar">
    <button className="icon-button mobile-menu-button" onClick={onOpenMobile} aria-label="Buka menu"><Menu size={26} /></button>
    <div className="topbar-title"><span className="eyebrow">HL Sales Management</span><h1>{title}</h1><p className="topbar-context">{description}</p></div>
    <div className="topbar-actions">
      <button className={`comfort-toggle ${comfortableMode ? "comfort-toggle--active" : ""}`} onClick={onToggleComfort} aria-pressed={comfortableMode}><Accessibility size={21} /><span>{comfortableMode ? "Teks besar" : "Teks normal"}</span></button>
      <button className="button button--primary topbar-create-button" onClick={onCreateBon}><Plus size={20} /><span>Buat Bon</span></button>
      <div className="notification-wrap"><button className="icon-button notification-button" aria-label={`${notificationCount} notifikasi`} aria-expanded={notificationOpen} onClick={onToggleNotifications}><Bell size={23} />{notificationCount > 0 && <span className="notification-count">{notificationCount}</span>}</button>{notificationOpen && <div className="notification-panel"><strong>Perlu perhatian</strong><button type="button" onClick={onGoReceivables}><WalletCards size={20} /><span><strong>{receivableCount} Bon Piutang</strong><small>Periksa jadwal penagihan.</small></span></button><button type="button" onClick={onGoBonus}><Plus size={20} /><span><strong>{eligibleBonusCount} pelanggan eligible bonus</strong><small>Buat Bonus Bon terpisah.</small></span></button></div>}</div>
      <div className="user-chip"><div className="user-avatar">AD</div><div><strong>Admin HL</strong><span>Pengguna utama</span></div></div>
    </div>
  </header>;
}

export function AppMobileNav({ activePage, selectedBonNumber, mobileMenuOpen, onChangePage, onCreateBon, onOpenMenu }: { activePage: PageKey; selectedBonNumber: string | null; mobileMenuOpen: boolean; onChangePage: (page: PageKey) => void; onCreateBon: () => void; onOpenMenu: () => void }) {
  return <nav className="mobile-bottom-nav" aria-label="Navigasi mobile"><MobileNavButton active={activePage === "dashboard" && !selectedBonNumber} icon={Home} label="Beranda" onClick={() => onChangePage("dashboard")} /><MobileNavButton active={activePage === "customers" && !selectedBonNumber} icon={Users} label="Pelanggan" onClick={() => onChangePage("customers")} /><button className="mobile-create-button" onClick={onCreateBon} aria-label="Buat Bon baru"><Plus size={28} /><span>Buat Bon</span></button><MobileNavButton active={activePage === "receivables" && !selectedBonNumber} icon={WalletCards} label="Piutang" onClick={() => onChangePage("receivables")} /><MobileNavButton active={mobileMenuOpen} icon={Menu} label="Lainnya" onClick={onOpenMenu} /></nav>;
}
