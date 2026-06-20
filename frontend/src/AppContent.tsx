import { AcceptanceBonDetailPageV2 } from "./AcceptanceBonDetailV2";
import { AcceptanceBonsPage, AcceptanceReceivablesPage } from "./AcceptanceTransactions";
import { DashboardPage } from "./DashboardPage";
import type { PageKey } from "./data";
import { FinalSettingsPage } from "./final-pages";
import { StoreBonus } from "./store-bonus";
import { StoreCustomers } from "./store-customers-rupiah";
import { StoreProducts } from "./store-products-rupiah";
import { StoreReports } from "./store-reports";
import { StoreSettlement } from "./store-settlement";

type AppContentProps = {
  activePage: PageKey;
  selectedBonNumber: string | null;
  settlementCustomerCode: string | null;
  onChangePage: (page: PageKey) => void;
  onOpenBon: (customerCode?: string) => void;
  onOpenBonusBon: (customerCode: string) => void;
  onViewBon: (bonNumber: string) => void;
  onOpenSettlement: (customerCode?: string) => void;
  comfortableMode: boolean;
  setComfortableMode: (value: boolean) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
};

export function AppContent(props: AppContentProps) {
  if (props.selectedBonNumber) return <AcceptanceBonDetailPageV2 bonNumber={props.selectedBonNumber} onBack={() => props.onChangePage("bons")} />;
  if (props.activePage === "dashboard") return <DashboardPage onNavigate={props.onChangePage} onViewBon={props.onViewBon} onCreateBonusBon={props.onOpenBonusBon} />;
  if (props.activePage === "customers") return <StoreCustomers onCreateBon={props.onOpenBon} onSettlement={props.onOpenSettlement} onViewBon={props.onViewBon} />;
  if (props.activePage === "products") return <StoreProducts />;
  if (props.activePage === "bons") return <AcceptanceBonsPage onCreateBon={() => props.onOpenBon()} onViewBon={props.onViewBon} />;
  if (props.activePage === "receivables") return <AcceptanceReceivablesPage onSettlement={() => props.onOpenSettlement()} onViewBon={props.onViewBon} />;
  if (props.activePage === "settlements") return <StoreSettlement prefillCustomerCode={props.settlementCustomerCode} onViewBon={props.onViewBon} />;
  if (props.activePage === "bonus") return <StoreBonus onCreateBonusBon={props.onOpenBonusBon} />;
  if (props.activePage === "reports") return <StoreReports />;
  return <FinalSettingsPage comfortableMode={props.comfortableMode} setComfortableMode={props.setComfortableMode} highContrast={props.highContrast} setHighContrast={props.setHighContrast} reducedMotion={props.reducedMotion} setReducedMotion={props.setReducedMotion} />;
}
