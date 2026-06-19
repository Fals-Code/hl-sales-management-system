import { AcceptanceBonDetailPageV2 } from "./AcceptanceBonDetailV2";
import { AcceptanceBonsPage, AcceptanceReceivablesPage } from "./AcceptanceTransactions";
import { DashboardPage } from "./DashboardPage";
import type { PageKey } from "./data";
import { FinalSettingsPage } from "./final-pages";
import { StoreBonus } from "./store-bonus";
import { StoreBonCreatePage } from "./store-bon-create";
import { StoreCustomers } from "./store-customers";
import { StoreProducts } from "./store-products";
import { StoreReports } from "./store-reports";
import { StoreSettlement } from "./store-settlement";

export function AppContent({ activePage, selectedBonNumber, createBonMode, createBonCustomerCode, settlementCustomerCode, onChangePage, onOpenBon, onOpenBonusBon, onViewBon, onOpenSettlement, comfortableMode, setComfortableMode, highContrast, setHighContrast, reducedMotion, setReducedMotion }: { activePage: PageKey; selectedBonNumber: string | null; createBonMode: "normal" | "bonus" | null; createBonCustomerCode: string | null; settlementCustomerCode: string | null; onChangePage: (page: PageKey) => void; onOpenBon: (customerCode?: string) => void; onOpenBonusBon: (customerCode: string) => void; onViewBon: (bonNumber: string) => void; onOpenSettlement: (customerCode?: string) => void; comfortableMode: boolean; setComfortableMode: (value: boolean) => void; highContrast: boolean; setHighContrast: (value: boolean) => void; reducedMotion: boolean; setReducedMotion: (value: boolean) => void }) {
  if (selectedBonNumber) return <AcceptanceBonDetailPageV2 bonNumber={selectedBonNumber} onBack={() => onChangePage("bons")} />;

  return <>
    {activePage === "dashboard" && <DashboardPage onNavigate={onChangePage} onViewBon={onViewBon} onCreateBonusBon={onOpenBonusBon} />}
    {activePage === "customers" && <StoreCustomers onCreateBon={onOpenBon} onSettlement={onOpenSettlement} onViewBon={onViewBon} />}
    {activePage === "products" && <StoreProducts />}
    {activePage === "bons" && <AcceptanceBonsPage onCreateBon={() => onOpenBon()} onViewBon={onViewBon} />}
    {activePage === "create-bon" && <StoreBonCreatePage prefillCustomerCode={createBonCustomerCode} initialMode={createBonMode ?? "normal"} onCancel={() => onChangePage("bons")} onViewBon={onViewBon} />}
    {activePage === "receivables" && <AcceptanceReceivablesPage onSettlement={() => onOpenSettlement()} onViewBon={onViewBon} />}
    {activePage === "settlements" && <StoreSettlement prefillCustomerCode={settlementCustomerCode} onViewBon={onViewBon} />}
    {activePage === "bonus" && <StoreBonus onCreateBonusBon={onOpenBonusBon} />}
    {activePage === "reports" && <StoreReports />}
    {activePage === "settings" && <FinalSettingsPage comfortableMode={comfortableMode} setComfortableMode={setComfortableMode} highContrast={highContrast} setHighContrast={setHighContrast} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} />}
  </>;
}
