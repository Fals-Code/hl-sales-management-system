import { Bell, Home, LogOut, Menu, Plus, Settings, Users, WalletCards, X } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { MobileNavButton } from "./components";
import { navigation, type PageKey } from "./data";
import { NotificationCenter } from "./NotificationCenter";
import { useNotifications } from "./notification-store";

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

export function AppSidebar({ activePage, selectedBonNumber, mobileMenuOpen, onChangePage, onCloseMobile }: AppSidebarProps) {
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
    </aside>
    {mobileMenuOpen && <button className="sidebar-backdrop" type="button" onClick={onCloseMobile} aria-label="Tutup menu" />}
  </>;
}

type AppTopbarProps = {
  title: string;
  description: string;
  comfortableMode?: boolean;
  notificationOpen: boolean;
  onOpenMobile: () => void;
  onToggleComfort?: () => void;
  onCreateBon: () => void;
  onToggleNotifications: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
};

export function AppTopbar({ title, description, notificationOpen, onOpenMobile, onCreateBon, onToggleNotifications, onOpenSettings, onLogout }: AppTopbarProps) {
  const { unreadCount } = useNotifications();

  return <header className="topbar topbar--simple">
    <button className="icon-button mobile-menu-button" type="button" onClick={onOpenMobile} aria-label="Buka menu"><Menu size={25} /></button>

    <div className="topbar-title topbar-title--simple">
      <h1>{title}</h1>
      <p className="topbar-context">{description}</p>
    </div>

    <div className="topbar-actions topbar-actions--simple">
      <button className="button button--primary topbar-create-button" type="button" onClick={onCreateBon}><Plus size={20} /><span>Buat Bon</span></button>
      <div className="notification-wrap">
        <button className="icon-button notification-button" type="button" aria-label={`${unreadCount} notifikasi belum dibaca`} aria-expanded={notificationOpen} onClick={onToggleNotifications}><Bell size={22} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>
        <NotificationCenter open={notificationOpen} onClose={onToggleNotifications} />
      </div>

      <div
        className="profile-menu"
        onKeyDown={(event) => {
          if (event.key === "Escape") (event.currentTarget.querySelector(".profile-trigger") as HTMLButtonElement | null)?.blur();
        }}
      >
        <button className="profile-trigger" type="button" aria-haspopup="menu" aria-label="Buka menu profil Admin HL">
          <span className="user-avatar">AD</span>
          <span className="profile-copy"><strong>Admin HL</strong><small>Pengguna utama</small></span>
        </button>
        <div className="profile-dropdown" role="menu" aria-label="Menu profil">
          <div className="profile-dropdown-heading"><span className="user-avatar">AD</span><span><strong>Admin HL</strong><small>Pengguna utama</small></span></div>
          <button type="button" role="menuitem" onClick={onOpenSettings}><Settings size={20} /><span><strong>Pengaturan</strong><small>Tampilan dan preferensi aplikasi</small></span></button>
          <button className="profile-dropdown-danger" type="button" role="menuitem" onClick={onLogout}><LogOut size={20} /><span><strong>Keluar</strong><small>Akhiri sesi aplikasi</small></span></button>
        </div>
      </div>
    </div>
  </header>;
}

export function AppMobileNav({ activePage, selectedBonNumber, mobileMenuOpen, onChangePage, onCreateBon, onOpenMenu }: { activePage: PageKey; selectedBonNumber: string | null; mobileMenuOpen: boolean; onChangePage: (page: PageKey) => void; onCreateBon: () => void; onOpenMenu: () => void }) {
  return <nav className="mobile-bottom-nav" aria-label="Navigasi mobile"><MobileNavButton active={activePage === "dashboard" && !selectedBonNumber} icon={Home} label="Beranda" onClick={() => onChangePage("dashboard")} /><MobileNavButton active={activePage === "customers" && !selectedBonNumber} icon={Users} label="Pelanggan" onClick={() => onChangePage("customers")} /><button className="mobile-create-button" onClick={onCreateBon} aria-label="Buat Bon baru"><Plus size={28} /><span>Buat Bon</span></button><MobileNavButton active={activePage === "receivables" && !selectedBonNumber} icon={WalletCards} label="Piutang" onClick={() => onChangePage("receivables")} /><MobileNavButton active={mobileMenuOpen} icon={Menu} label="Lainnya" onClick={onOpenMenu} /></nav>;
}
