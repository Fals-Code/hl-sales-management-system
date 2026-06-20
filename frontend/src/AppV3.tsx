import { useEffect, useState } from "react";
import { AppContent } from "./AppContent";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { AppMobileNav, AppSidebar, AppTopbar } from "./AppNavigation";
import { authApi, SESSION_EXPIRED_EVENT, useApi } from "./api-client";
import { navigation, type PageKey } from "./data";
import { navigateToBon, navigateToPage, readHashRoute, type HashRoute } from "./hash-routing-v2";
import { LoginPage } from "./LoginPage";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import { PageLoadingState, RouteFallbackState } from "./PageStates";
import { StoreBonCreatePage } from "./store-bon-create";

const pageDescriptions: Record<PageKey, string> = {
  dashboard: "Ringkasan cash basis, Piutang, dan tindakan penting hari ini",
  customers: "Kelola pelanggan, diskon bertingkat, dan threshold bonus",
  products: "Kelola produk LM dan BR beserta Harga Modal dan Harga Base",
  bons: "Lihat seluruh Bon dengan status Piutang, Lunas, Bonus, atau Void",
  "create-bon": "Buat transaksi baru melalui dialog yang konsisten dengan form lain",
  receivables: "Pantau jumlah terutang dan lanjutkan ke Pelunasan",
  settlements: "Lunasi satu Bon atau seluruh Bon dalam satu bulan",
  bonus: "Kelola Bonus Bon tanpa menambah omzet atau laba",
  reports: "Baca rekap cash basis dan breakdown LM serta BR",
  settings: "Atur kenyamanan tampilan dan preferensi aplikasi"
};

type BonMode = "normal" | "bonus";
type BonComposer = { customerCode: string | null; mode: BonMode };

const readBooleanSetting = (key: string, fallback: boolean) => {
  const stored = window.localStorage.getItem(key);
  return stored === null ? fallback : stored === "true";
};

export default function AppV3() {
  const [signedIn, setSignedIn] = useState(() => useApi ? false : window.localStorage.getItem("hl-demo-session") === "active");
  const [authChecking, setAuthChecking] = useState(useApi);
  const [route, setRoute] = useState<HashRoute>(() => readHashRoute());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settlementCustomerCode, setSettlementCustomerCode] = useState<string | null>(null);
  const [bonComposer, setBonComposer] = useState<BonComposer | null>(null);
  const [comfortableMode, setComfortableMode] = useState(() => readBooleanSetting("hl-comfortable-mode", true));
  const [highContrast, setHighContrast] = useState(() => readBooleanSetting("hl-high-contrast", false));
  const [reducedMotion, setReducedMotion] = useState(() => readBooleanSetting("hl-reduced-motion", true));
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    if (!useApi) return;
    let active = true;
    void authApi.me().then(() => { if (active) setSignedIn(true); }).catch(() => { if (active) setSignedIn(false); }).finally(() => { if (active) setAuthChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const expire = () => {
      window.localStorage.removeItem("hl-demo-session");
      setSignedIn(false);
      setLogoutOpen(false);
      setBonComposer(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      setPageLoading(true);
      setRoute(readHashRoute());
      setMobileMenuOpen(false);
      setNotificationOpen(false);
      setBonComposer(null);
      window.setTimeout(() => {
        setPageLoading(false);
        document.getElementById("main-content")?.focus();
      }, 180);
    };
    window.addEventListener("hashchange", syncRoute);
    if (!window.location.hash) window.history.replaceState(null, "", "#/dashboard");
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("hl-comfortable-mode", String(comfortableMode));
    window.localStorage.setItem("hl-high-contrast", String(highContrast));
    window.localStorage.setItem("hl-reduced-motion", String(reducedMotion));
  }, [comfortableMode, highContrast, reducedMotion]);

  const backgroundPage: PageKey = route.page === "create-bon" ? "bons" : route.page;
  const directComposer: BonComposer | null = route.page === "create-bon"
    ? { customerCode: route.createBonCustomerCode, mode: route.createBonMode ?? "normal" }
    : null;
  const activeComposer = bonComposer ?? directComposer;

  useEffect(() => {
    const title = route.bonNumber
      ? `Detail ${route.bonNumber}`
      : activeComposer
        ? `Buat ${activeComposer.mode === "bonus" ? "Bonus Bon" : "Bon"}`
        : navigation.find((item) => item.key === backgroundPage)?.label ?? "HL Sales";
    document.title = `${title} | HL Sales`;
  }, [route.bonNumber, activeComposer, backgroundPage]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen || logoutOpen || Boolean(activeComposer) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen, logoutOpen, activeComposer]);

  useEffect(() => {
    const closeTransientUi = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileMenuOpen(false);
      setNotificationOpen(false);
      setLogoutOpen(false);
    };
    window.addEventListener("keydown", closeTransientUi);
    return () => window.removeEventListener("keydown", closeTransientUi);
  }, []);

  const pageTitle = route.bonNumber ? "Detail Bon" : navigation.find((item) => item.key === backgroundPage)?.label ?? "Dashboard";
  const pageDescription = route.bonNumber ? route.bonNumber : pageDescriptions[backgroundPage];

  const changePage = (page: PageKey) => {
    setSettlementCustomerCode(null);
    setBonComposer(null);
    navigateToPage(page);
  };

  const openBon = (customerCode?: string, mode: BonMode = "normal") => {
    setNotificationOpen(false);
    setBonComposer({ customerCode: customerCode ?? null, mode });
  };

  const closeBon = () => {
    setBonComposer(null);
    if (route.page === "create-bon") navigateToPage("bons");
  };

  const viewBon = (bonNumber: string) => {
    setBonComposer(null);
    navigateToBon(bonNumber);
  };

  const openSettlement = (customerCode?: string) => {
    setSettlementCustomerCode(customerCode ?? null);
    setBonComposer(null);
    navigateToPage("settlements");
  };

  const login = async (username: string, password: string) => {
    if (useApi) await authApi.login(username, password);
    else if (username !== "admin" || password !== "password") throw new Error("Nama pengguna atau kata sandi tidak benar.");
    window.localStorage.setItem("hl-demo-session", "active");
    setSignedIn(true);
    navigateToPage("dashboard");
  };

  const logout = async () => {
    if (useApi) {
      try { await authApi.logout(); } catch { /* local cleanup still runs */ }
    }
    window.localStorage.removeItem("hl-demo-session");
    setSignedIn(false);
    setLogoutOpen(false);
    setBonComposer(null);
    navigateToPage("dashboard");
  };

  if (authChecking) return <main className="login-page"><PageLoadingState label="Memeriksa sesi" /></main>;
  if (!signedIn) return <LoginPage onLogin={login} />;

  const shellClass = ["app-shell", comfortableMode && "app-shell--comfortable", highContrast && "app-shell--high-contrast", reducedMotion && "app-shell--reduced-motion"].filter(Boolean).join(" ");

  return <div className={shellClass}>
    <a className="skip-link" href="#main-content">Langsung ke isi halaman</a>
    <AppSidebar activePage={backgroundPage} selectedBonNumber={route.bonNumber} mobileMenuOpen={mobileMenuOpen} comfortableMode={comfortableMode} onChangePage={changePage} onCloseMobile={() => setMobileMenuOpen(false)} onToggleComfort={() => setComfortableMode((value) => !value)} onLogout={() => setLogoutOpen(true)} />
    <div className="main-area">
      <AppTopbar title={pageTitle} description={pageDescription} comfortableMode={comfortableMode} notificationOpen={notificationOpen} onOpenMobile={() => setMobileMenuOpen(true)} onToggleComfort={() => setComfortableMode((value) => !value)} onCreateBon={() => openBon()} onToggleNotifications={() => setNotificationOpen((value) => !value)} onOpenSettings={() => changePage("settings")} onLogout={() => setLogoutOpen(true)} />
      <main className="page-content" id="main-content" tabIndex={-1} aria-busy={pageLoading}>
        <AppErrorBoundary>{pageLoading ? <PageLoadingState label={`Membuka ${pageTitle}`} /> : route.notFound ? <RouteFallbackState onBack={() => changePage("dashboard")} /> : <AppContent activePage={backgroundPage} selectedBonNumber={route.bonNumber} settlementCustomerCode={settlementCustomerCode} onChangePage={changePage} onOpenBon={(customerCode) => openBon(customerCode)} onOpenBonusBon={(customerCode) => openBon(customerCode, "bonus")} onViewBon={viewBon} onOpenSettlement={openSettlement} comfortableMode={comfortableMode} setComfortableMode={setComfortableMode} highContrast={highContrast} setHighContrast={setHighContrast} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} />}</AppErrorBoundary>
      </main>
    </div>
    <AppMobileNav activePage={backgroundPage} selectedBonNumber={route.bonNumber} mobileMenuOpen={mobileMenuOpen} onChangePage={changePage} onCreateBon={() => openBon()} onOpenMenu={() => setMobileMenuOpen(true)} />
    {activeComposer && <StoreBonCreatePage presentation="dialog" prefillCustomerCode={activeComposer.customerCode} initialMode={activeComposer.mode} onCancel={closeBon} onViewBon={viewBon} />}
    <LogoutConfirmDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={() => { void logout(); }} />
  </div>;
}
