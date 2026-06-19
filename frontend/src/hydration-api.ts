import {
  apiRequest,
  type ApiClientError
} from "./api-client";

export type ApiProductType = "LM" | "BR";
export type ApiDiscountTierDto = { productType: ApiProductType; sequence: number; percentBps: number };
export type ApiThresholdHistoryDto = { oldValue: number; newValue: number; effectiveFrom: string; reason: string | null };
export type ApiBonusAvailabilityDto = {
  threshold: number;
  totalSettledRevenue: number;
  entitledUnits: number;
  usedUnits: number;
  adjustmentUnits: number;
  ledgerBalance: number;
  availableUnits: number;
};
export type ApiBonusLedgerDto = {
  id: string;
  customerId: string;
  mutationType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  thresholdSnapshot: number | null;
  revenueSnapshot: number | null;
  reversalOfId: string | null;
  bonId: string | null;
  paymentId: string | null;
  reason: string | null;
  createdAt: string;
};
export type ApiCustomerDto = {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  bonusThreshold: number;
  deletedAt: string | null;
  discountTiers: ApiDiscountTierDto[];
  thresholdHistories?: ApiThresholdHistoryDto[];
  bonusAvailability?: ApiBonusAvailabilityDto;
  bonusHistory?: ApiBonusLedgerDto[];
};
export type ApiProductDto = {
  id: string;
  sku: string | null;
  name: string;
  type: ApiProductType;
  stock: number;
  costPrice: number;
  basePrice: number;
  deletedAt: string | null;
};
export type ApiBonItemDto = {
  id: string;
  productId: string | null;
  kind: string;
  productNameSnapshot: string;
  productTypeSnapshot: ApiProductType;
  costPriceSnapshot: number;
  basePriceSnapshot: number;
  discountSnapshotJson: string;
  quantity: number;
  isBonus: boolean;
};
export type ApiBonDto = {
  id: string;
  bonNumber: string;
  customerId: string;
  status: string;
  bonDate: string;
  settledAt: string | null;
  deletedAt: string | null;
  shippingCost: number;
  description: string | null;
  items: ApiBonItemDto[];
  customer: { id: string; code: string | null; name: string };
};
export type HydrationPayload = {
  generatedAt: string;
  customers: ApiCustomerDto[];
  products: ApiProductDto[];
  bons: ApiBonDto[];
};

export const hydrationApi = {
  load: () => apiRequest<HydrationPayload>("/api/v1/bootstrap")
};

export function hydrationErrorMessage(error: unknown) {
  const apiError = error as ApiClientError | undefined;
  return apiError?.message || "Data aplikasi tidak dapat dimuat.";
}
