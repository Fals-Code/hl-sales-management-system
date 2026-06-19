import { AcceptanceBonDetailPageV2 } from "./AcceptanceBonDetailV2";
import { AcceptanceBonusPage } from "./AcceptanceBonusReports";
import { AcceptanceCustomersPage } from "./AcceptanceCustomers";
import { AcceptanceSettlementPageV2 } from "./AcceptanceSettlementV2";
import { AcceptanceBonsPage, AcceptanceReceivablesPage } from "./AcceptanceTransactions";
import { DashboardPage } from "./DashboardPage";
import type { PageKey } from "./data";
import { FinalSettingsPage } from "./final-pages";
import { StoreProducts } from "./store-products";
import { StoreReports } from "./store-reports";

export function AppContent({ activePage, selectedBonNumber, settlementCustomerCode, onChangePage, onOpenBon, onOpenBonusBon, onViewBon, onOpenSettlement, comfortableMode, setComfortableMode, highContrast, setHighContrast, reducedMotion, setReducedMotion }: { activePage: PageKey; selectedBonNumber: string | null; settlementCustomerCode: string | null; onChangePage: (page: PageKey) => void; onOpenBon: (customerCode?: string) => void; onOpenBonusBon: (customerCode: string) => void; onViewBon: (bonNumber: string) => void; onOpenSettlement: (customerCode?: string) => void; comfortableMode: boolean; setComfortableMode: (value: boolean) => void; highContrast: boolean; setHighContrast: (value: boolean) => void; reducedMotion: boolean; setReducedMotion: (value: boolean) => void }) {
  if (selectedBonNumber) return <AcceptanceBonDetailPageV2 bonNumber={selectedBonNumber} onBack={() => onChangePage("bons")} />;

  return <>
    {activePage === "dashboard" && <DashboardPage onNavigate={onChangePage} onViewBon={onViewBon} onCreateBonusBon={onOpenBonusBon} />}
    {activePage === "customers" && <AcceptanceCustomersPage onCreateBon={onOpenBon} onSettlement={onOpenSettlement} onViewBon={onViewBon} />}
    {activePage === "products" && <StoreProducts />}
    {activePage === "bons" && <AcceptanceBonsPage onCreateBon={() => onOpenBon()} onViewBon={onViewBon} />}
    {activePage === "receivables" && <AcceptanceReceivablesPage onSettlement={() => onOpenSettlement()} onViewBon={onViewBon} />}
    {activePage === "settlements" && <AcceptanceSettlementPageV2 prefillCustomerCode={settlementCustomerCode} onViewBon={onViewBon} />}
    {activePage === "bonus" && <AcceptanceBonusPage onCreateBonusBon={onOpenBonusBon} />}
    {activePage === "reports" && <StoreReports />}
    {activePage === "settings" && <FinalSettingsPage comfortableMode={comfortableMode} setComfortableMode={setComfortableMode} highContrast={highContrast} setHighContrast={setHighContrast} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} />}
  </>;
}
