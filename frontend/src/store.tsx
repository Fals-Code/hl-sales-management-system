import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  acceptanceBons,
  customerProfiles,
  productProfiles,
  type AcceptanceBon,
  type AcceptanceBonLine,
  type CustomerProfile,
  type ProductProfile,
  type ProductType
} from "./acceptance-data";
import { isValidBonNumber, normalizeBonNumber } from "./bon-number";

const STORAGE_KEY = "hl-phase4-store-v3";

export type StoredCustomer = CustomerProfile & { backendId?: string };
export type StoredProduct = ProductProfile & { backendId?: string };
export type StoredBonLine = AcceptanceBonLine & {
  backendProductId?: string;
  snapshotProductName?: string;
  snapshotProductType?: ProductType;
};
export type StoredBon = Omit<AcceptanceBon, "lines"> & {
  backendId?: string;
  deletedAt?: string;
  lines: StoredBonLine[];
};

export class AppStoreError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AppStoreError";
  }
}

type State = {
  customers: StoredCustomer[];
  products: StoredProduct[];
  bons: StoredBon[];
};

type Store = State & {
  saveCustomer: (value: StoredCustomer) => void;
  softDeleteCustomer: (code: string) => void;
  saveProduct: (value: StoredProduct) => void;
  softDeleteProduct: (id: string) => void;
  createBon: (value: StoredBon) => void;
  updateBon: (originalNumber: string, value: StoredBon) => void;
  updateBonStatus: (number: string, status: AcceptanceBon["status"], paymentDate?: string) => void;
  softDeleteBon: (number: string) => void;
  resetStore: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(readState);

  syncLegacyCollections(state);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<Store>(() => ({
    ...state,
    saveCustomer: (next) => setState((current) => ({
      ...current,
      customers: upsert(current.customers, next, (item) => item.code)
    })),
    softDeleteCustomer: (code) => setState((current) => ({
      ...current,
      customers: current.customers.map((item) => item.code === code ? { ...item, active: false } : item)
    })),
    saveProduct: (next) => setState((current) => ({
      ...current,
      products: upsert(current.products, next, (item) => item.id)
    })),
    softDeleteProduct: (id) => setState((current) => ({
      ...current,
      products: current.products.map((item) => item.id === id ? { ...item, active: false } : item)
    })),
    createBon: (next) => setState((current) => {
      const prepared = prepareBon(current, next);
      return { ...current, bons: [prepared, ...current.bons] };
    }),
    updateBon: (originalNumber, next) => setState((current) => {
      const prepared = prepareBon(current, next, originalNumber);
      const existing = current.bons.find((item) => item.number === originalNumber);
      return {
        ...current,
        bons: current.bons.map((item) => item.number === originalNumber
          ? { ...prepared, backendId: prepared.backendId ?? existing?.backendId, deletedAt: existing?.deletedAt }
          : item)
      };
    }),
    updateBonStatus: (number, status, paymentDate) => setState((current) => ({
      ...current,
      bons: current.bons.map((item) => item.number === number
        ? { ...item, status, paymentDate: status === "Lunas" ? paymentDate : status === "Bonus" ? item.paymentDate : undefined }
        : item)
    })),
    softDeleteBon: (number) => setState((current) => ({
      ...current,
      bons: current.bons.map((item) => item.number === number ? { ...item, deletedAt: new Date().toISOString() } : item)
    })),
    resetStore: () => setState(seedState())
  }), [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("AppStoreProvider is required");
  return value;
}

function prepareBon(state: State, input: StoredBon, excludeNumber?: string): StoredBon {
  const number = normalizeBonNumber(input.number);
  if (!isValidBonNumber(number)) throw new AppStoreError("VALIDATION_ERROR", "Format Nomor Bon tidak valid.");
  if (state.bons.some((item) => item.number !== excludeNumber && normalizeBonNumber(item.number) === number)) {
    throw new AppStoreError("DUPLICATE_VALUE", "Nomor Bon sudah digunakan.");
  }
  const customer = state.customers.find((item) => item.code === input.customerCode && item.active);
  if (!customer) throw new AppStoreError("VALIDATION_ERROR", "Pelanggan tidak tersedia.");
  const lines: StoredBonLine[] = input.lines.map((line) => {
    const product = state.products.find((item) => item.id === line.productId && item.active);
    if (!product) throw new AppStoreError("VALIDATION_ERROR", "Produk tidak tersedia.");
    return {
      ...line,
      backendProductId: product.backendId,
      snapshotProductName: product.name,
      snapshotProductType: product.type,
      snapshotCostPrice: product.costPrice,
      snapshotBasePrice: product.basePrice,
      snapshotDiscounts: [...(product.type === "LM" ? customer.discountLm : customer.discountBr)]
    };
  });
  return {
    ...input,
    number,
    description: input.description.trim(),
    shipping: input.isBonus ? 0 : Math.max(0, input.shipping),
    lines
  };
}

function upsert<T>(items: T[], next: T, key: (value: T) => string) {
  return items.some((item) => key(item) === key(next))
    ? items.map((item) => key(item) === key(next) ? next : item)
    : [...items, next];
}

function readState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as State;
    return Array.isArray(parsed.customers) && Array.isArray(parsed.products) && Array.isArray(parsed.bons)
      ? parsed
      : seedState();
  } catch {
    return seedState();
  }
}

function seedState(): State {
  return {
    customers: structuredClone(customerProfiles),
    products: structuredClone(productProfiles),
    bons: structuredClone(acceptanceBons)
  };
}

function syncLegacyCollections(state: State) {
  customerProfiles.splice(0, customerProfiles.length, ...state.customers);
  productProfiles.splice(0, productProfiles.length, ...state.products);
  acceptanceBons.splice(0, acceptanceBons.length, ...state.bons.filter((bon) => !bon.deletedAt));
}
