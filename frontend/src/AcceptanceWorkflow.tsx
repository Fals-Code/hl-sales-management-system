import { AcceptanceBonDetailPageV2 } from "./AcceptanceBonDetailV2";
import { AcceptanceSettlementPageV2 } from "./AcceptanceSettlementV2";

export function AcceptanceBonDetailPage({ bonNumber, onBack }: { bonNumber: string; onBack: () => void; onSettlement?: (bonNumber: string) => void }) {
  return <AcceptanceBonDetailPageV2 bonNumber={bonNumber} onBack={onBack} />;
}

export const AcceptanceSettlementPage = AcceptanceSettlementPageV2;
