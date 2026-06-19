import type {
  ApiBonDto,
  ApiBonItemDto,
  ApiBonusLedgerDto,
  ApiCustomerDto,
  ApiProductDto,
  HydrationPayload
} from "./hydration-api";
import type { StoredBon, StoredBonLine, StoredCustomer, StoredProduct } from "./store";

export type StoredBonusLedger = {
  id: string;
  mutationType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  thresholdSnapshot?: number;
  revenueSnapshot?: number;
  reversalOfId?: string;
  bonId?: string;
  paymentId?: string;
  reason?: string;
  createdAt: string;
};

export type StoredCustomerWithHistory = StoredCustomer & { bonusHistory: StoredBonusLedger[] };

export type HydratedState = {
  customers: StoredCustomer[];
  products: StoredProduct[];
  bons: StoredBon[];
};

export function mapHydrationPayload(payload: HydrationPayload): HydratedState {
  const customers = payload.customers.map(mapCustomer);
  const products = payload.products.map(mapProduct);
  const customerCodes = new Map(customers.map((customer) => [customer.backendId, customer.code] as const));
  const productIds = new Map(products.map((product) => [product.backendId, product.id] as const));

  for (const bon of payload.bons) {
    if (!customerCodes.has(bon.customerId)) {
      const historicalCustomer = mapHistoricalCustomer(bon);
      customers.push(historicalCustomer);
      customerCodes.set(bon.customerId, historicalCustomer.code);
    }

    for (const item of bon.items) {
      const backendProductId = item.productId ?? `snapshot:${item.id}`;
      if (productIds.has(backendProductId)) continue;
      const historicalProduct = mapHistoricalProduct(item, backendProductId);
      products.push(historicalProduct);
      productIds.set(backendProductId, historicalProduct.id);
    }
  }

  return {
    customers,
    products,
    bons: payload.bons.map((bon) => mapBon(bon, customerCodes, productIds))
  };
}

export function mapCustomer(customer: ApiCustomerDto): StoredCustomerWithHistory {
  const threshold = customer.bonusThreshold ?? 0;
  const totalSettledRevenue = customer.bonusAvailability?.totalSettledRevenue ?? 0;
  const availableUnits = customer.bonusAvailability?.availableUnits ?? 0;
  const earnedUnits = threshold > 0 ? Math.floor(totalSettledRevenue / threshold) : 0;

  return {
    backendId: customer.id,
    code: customer.code?.trim() || displayId("CUS", customer.id),
    name: customer.name,
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    discountLm: mapDiscounts(customer, "LM"),
    discountBr: mapDiscounts(customer, "BR"),
    bonusThreshold: threshold,
    accumulatedPaidOmzet: totalSettledRevenue,
    bonusesGranted: Math.max(0, earnedUnits - availableUnits),
    thresholdHistory: (customer.thresholdHistories ?? []).map((history) => ({
      date: toDateOnly(history.effectiveFrom),
      previousAmount: history.oldValue,
      newAmount: history.newValue,
      note: history.reason ?? "Perubahan threshold bonus"
    })),
    bonusHistory: (customer.bonusHistory ?? []).map(mapBonusLedger),
    active: !customer.deletedAt
  };
}

export function mapProduct(product: ApiProductDto): StoredProduct {
  return {
    backendId: product.id,
    id: product.sku?.trim() || displayId("PRD", product.id),
    name: product.name,
    type: product.type,
    stock: (product as ApiProductDto & { stock?: number }).stock ?? 0,
    costPrice: product.costPrice,
    basePrice: product.basePrice,
    active: !product.deletedAt
  };
}

function mapBon(
  bon: ApiBonDto,
  customerCodes: Map<string | undefined, string>,
  productIds: Map<string | undefined, string>
): StoredBon {
  const isBonus = bon.items.length > 0 && bon.items.every((item) => item.isBonus || item.kind === "BONUS");
  return {
    backendId: bon.id,
    number: bon.bonNumber,
    date: toDateOnly(bon.bonDate),
    paymentDate: bon.settledAt ? toDateOnly(bon.settledAt) : undefined,
    customerCode: customerCodes.get(bon.customerId) ?? displayId("CUS", bon.customerId),
    description: bon.description ?? "",
    status: isBonus ? "Bonus" : mapStatus(bon.status),
    shipping: isBonus ? 0 : bon.shippingCost,
    isBonus,
    deletedAt: bon.deletedAt ?? undefined,
    lines: bon.items.map((item) => mapBonLine(item, productIds))
  };
}

function mapBonLine(item: ApiBonItemDto, productIds: Map<string | undefined, string>): StoredBonLine {
  const backendProductId = item.productId ?? `snapshot:${item.id}`;
  return {
    productId: productIds.get(backendProductId) ?? displayId("SNAP", backendProductId),
    backendProductId: item.productId ?? undefined,
    quantity: item.quantity,
    snapshotProductName: item.productNameSnapshot,
    snapshotProductType: item.productTypeSnapshot,
    snapshotCostPrice: item.costPriceSnapshot,
    snapshotBasePrice: item.basePriceSnapshot,
    snapshotDiscounts: parseDiscountSnapshot(item.discountSnapshotJson)
  };
}

function mapHistoricalCustomer(bon: ApiBonDto): StoredCustomerWithHistory {
  return {
    backendId: bon.customerId,
    code: bon.customer.code?.trim() || displayId("CUS", bon.customerId),
    name: bon.customer.name,
    phone: "",
    address: "",
    discountLm: [],
    discountBr: [],
    bonusThreshold: 0,
    accumulatedPaidOmzet: 0,
    bonusesGranted: 0,
    thresholdHistory: [],
    bonusHistory: [],
    active: false
  };
}

function mapHistoricalProduct(item: ApiBonItemDto, backendProductId: string): StoredProduct {
  return {
    backendId: item.productId ?? undefined,
    id: displayId("SNAP", backendProductId),
    name: item.productNameSnapshot,
    type: item.productTypeSnapshot,
    stock: 0,
    costPrice: item.costPriceSnapshot,
    basePrice: item.basePriceSnapshot,
    active: false
  };
}

function mapBonusLedger(entry: ApiBonusLedgerDto): StoredBonusLedger {
  return {
    id: entry.id,
    mutationType: entry.mutationType,
    amount: entry.amount,
    balanceBefore: entry.balanceBefore,
    balanceAfter: entry.balanceAfter,
    thresholdSnapshot: entry.thresholdSnapshot ?? undefined,
    revenueSnapshot: entry.revenueSnapshot ?? undefined,
    reversalOfId: entry.reversalOfId ?? undefined,
    bonId: entry.bonId ?? undefined,
    paymentId: entry.paymentId ?? undefined,
    reason: entry.reason ?? undefined,
    createdAt: entry.createdAt
  };
}

function mapDiscounts(customer: ApiCustomerDto, productType: "LM" | "BR") {
  return customer.discountTiers
    .filter((tier) => tier.productType === productType)
    .sort((left, right) => left.sequence - right.sequence)
    .map((tier) => tier.percentBps / 100);
}

function parseDiscountSnapshot(value: string): number[] {
  try {
    const parsed = JSON.parse(value) as Array<number | { sequence?: number; percentBps?: number }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry, index) => typeof entry === "number"
        ? { sequence: index + 1, percent: entry }
        : { sequence: entry.sequence ?? index + 1, percent: (entry.percentBps ?? 0) / 100 })
      .sort((left, right) => left.sequence - right.sequence)
      .map((entry) => entry.percent);
  } catch {
    return [];
  }
}

function mapStatus(status: string): StoredBon["status"] {
  if (status === "LUNAS") return "Lunas";
  if (status === "VOID") return "Void";
  return "Piutang";
}

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function displayId(prefix: string, value: string) {
  const suffix = value.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase() || "HISTORIS";
  return `${prefix}-${suffix}`;
}
