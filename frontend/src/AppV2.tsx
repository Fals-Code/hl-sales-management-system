import { useEffect, useState } from "react";
import { bonusesAvailable } from "./acceptance-data";
import { AppContent } from "./AppContent";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { AppMobileNav, AppSidebar, AppTopbar } from "./AppNavigation";
import { authApi, SESSION_EXPIRED_EVENT, useApi } from "./api-client";
import { navigation, type PageKey } from "./data";
import { navigateToBon, navigateToPage, readHashRoute, type HashRoute } from "./hash-routing-v2";
import { LoginPage } from "./LoginPage";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import { PageLoadingState, RouteFallbackState } from "./PageStates";
import { StoreBonDialog } from "./store-bon";
import { useAppStore } from "./store";

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

const readBooleanSetting = (key: string, fallback: boolean) => {
  const stored = window.localStorage.getItem(key);
  return stored === null ? fallback : stored === "true";
};

export default function AppV2() {
  const { bons, customers } = useAppStore();
  const initialRoute = readHashRoute();
  const [signedIn, setSignedIn] = useState(() => useApi ? false : window.localStorage.getItem("hl-demo-session") === "active");
  const [authChecking, setAuthChecking] = useState(useApi);
  const [route, setRoute] = useState<HashRoute>(initialRoute);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bonDialogOpen, setBonDialogOpen] = useState(false);
  const [bonMode, setBonMode] = useState<BonMode>("normal");
  const [bonCustomerCode, setBonCustomerCode] = useState<string | null>(null);
  const [settlementCustomerCode, setSettlementCustomerCode] = useState<string | null>(null);
  const [comfortableMode, setComfortableMode] = useState(() => readBooleanSetting("hl-comfortable-mode", true));
  const [highContrast, setHighContrast] = useState(() => readBooleanSetting("hl-high-contrast", false));
  const [reducedMotion, setReducedMotion] = useState(() => readBooleanSetting("hl-reduced-motion", true));
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    if (!useApi) return;
    let active = true;
    void authApi.me()
      .then(() => { if (active) setSignedIn(true); })
      .catch(() => { if (active) setSignedIn(false); })
      .finally(() => { if (active) setAuthChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const expire = () => {
      window.localStorage.removeItem("hl-demo-session");
      setSignedIn(false);
      setBonDialogOpen(false);
      setLogoutOpen(false);
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

  useEffect(() => {
    const title = route.bonNumber ? `Detail ${route.bonNumber}` : navigation.find((item) => item.key === route.page)?.label ?? "HL Sales";
    document.title = `${title} | HL Sales`;
  }, [route]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen || bonDialogOpen || logoutOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen, bonDialogOpen, logoutOpen]);

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

  const receivableCount = bons.filter((bon) => !bon.deletedAt && bon.status === "Piutang" && !bon.isBonus).length;
  const eligibleBonusCount = customers.filter((customer) => bonusesAvailable(customer) > 0).length;
  const pageTitle = route.bonNumber ? "Detail Bon" : navigation.find((item) => item.key === route.page)?.label ?? "Dashboard";
  const pageDescription = route.bonNumber ? route.bonNumber : pageDescriptions[route.page];

  const changePage = (page: PageKey) => {
    setSettlementCustomerCode(null);
    navigateToPage(page);
  };

  const openBon = (customerCode?: string, mode: BonMode = "normal") => {
    setBonCustomerCode(customerCode ?? null);
    setBonMode(mode);
    setBonDialogOpen(true);
  };

  const closeBon = () => {
    setBonDialogOpen(false);
    setBonCustomerCode(null);
    setBonMode("normal");
  };

  const openSettlement = (customerCode?: string) => {
    setSettlementCustomerCode(customerCode ?? null);
    navigateToPage("settlements");
  };

  const login = async (username: string, password: string) => {
    if (useApi) {
      await authApi.login(username, password);
    } else if (username !== "admin" || password !== "password") {
      throw new Error("Nama pengguna atau kata sandi tidak benar.");
    }
    window.localStorage.setItem("hl-demo-session", "active");
    setSignedIn(true);
    navigateToPage("dashboard");
  };

  const logout = async () => {
    if (useApi) {
      try { await authApi.logout(); } catch { /* Local cleanup must still run. */ }
    }
    window.localStorage.removeItem("hl-demo-session");
    setSignedIn(false);
    setLogoutOpen(false);
    navigateToPage("dashboard");
  };

  if (authChecking) return <main className="login-page"><PageLoadingState label="Memeriksa sesi" /></main>;
  if (!signedIn) return <LoginPage onLogin={login} />;

  const shellClass = ["app-shell", comfortableMode && "app-shell--comfortable", highContrast && "app-shell--high-contrast", reducedMotion && "app-shell--reduced-motion"].filter(Boolean).join(" ");

  return (
    <div className={shellClass}>
      <a className="skip-link" href="#main-content">Langsung ke isi halaman</a>
      <AppSidebar activePage={route.page} selectedBonNumber={route.bonNumber} mobileMenuOpen={mobileMenuOpen} comfortableMode={comfortableMode} onChangePage={changePage} onCloseMobile={() => setMobileMenuOpen(false)} onToggleComfort={() => setComfortableMode((value) => !value)} onLogout={() => setLogoutOpen(true)} />
      <div className="main-area">
        <AppTopbar title={pageTitle} description={pageDescription} comfortableMode={comfortableMode} notificationOpen={notificationOpen} notificationCount={receivableCount + eligibleBonusCount} receivableCount={receivableCount} eligibleBonusCount={eligibleBonusCount} onOpenMobile={() => setMobileMenuOpen(true)} onToggleComfort={() => setComfortableMode((value) => !value)} onCreateBon={() => openBon()} onToggleNotifications={() => setNotificationOpen((value) => !value)} onGoReceivables={() => changePage("receivables")} onGoBonus={() => changePage("bonus")} onOpenSettings={() => changePage("settings")} onLogout={() => setLogoutOpen(true)} />
        <main className="page-content" id="main-content" tabIndex={-1} aria-busy={pageLoading}>
          <AppErrorBoundary>{pageLoading ? <PageLoadingState label={`Membuka ${pageTitle}`} /> : route.notFound ? <RouteFallbackState onBack={() => changePage("dashboard")} /> : <AppContent activePage={route.page} selectedBonNumber={route.bonNumber} settlementCustomerCode={settlementCustomerCode} onChangePage={changePage} onOpenBon={(customerCode) => openBon(customerCode)} onOpenBonusBon={(customerCode) => openBon(customerCode, "bonus")} onViewBon={navigateToBon} onOpenSettlement={openSettlement} comfortableMode={comfortableMode} setComfortableMode={setComfortableMode} highContrast={highContrast} setHighContrast={setHighContrast} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} />}</AppErrorBoundary>
        </main>
      </div>
      <AppMobileNav activePage={route.page} selectedBonNumber={route.bonNumber} mobileMenuOpen={mobileMenuOpen} onChangePage={changePage} onCreateBon={() => openBon()} onOpenMenu={() => setMobileMenuOpen(true)} />
      <StoreBonDialog open={bonDialogOpen} onClose={closeBon} prefillCustomerCode={bonCustomerCode} initialMode={bonMode} />
      <LogoutConfirmDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={() => { void logout(); }} />
    </div>
  );
}
