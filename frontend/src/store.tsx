import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  acceptanceBons,
  customerProfiles,
  productProfiles,
  type AcceptanceBon,
  type CustomerProfile,
  type ProductProfile
} from "./acceptance-data";
import { isValidBonNumber, normalizeBonNumber } from "./bon-number";

const STORAGE_KEY = "hl-phase4-store-v2";

export class AppStoreError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AppStoreError";
  }
}

type State = {
  customers: CustomerProfile[];
  products: ProductProfile[];
  bons: AcceptanceBon[];
};

type Store = State & {
  saveCustomer: (value: CustomerProfile) => void;
  softDeleteCustomer: (code: string) => void;
  saveProduct: (value: ProductProfile) => void;
  softDeleteProduct: (id: string) => void;
  createBon: (value: AcceptanceBon) => void;
  updateBonStatus: (number: string, status: AcceptanceBon["status"], paymentDate?: string) => void;
  resetStore: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(readState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    customerProfiles.splice(0, customerProfiles.length, ...state.customers);
    productProfiles.splice(0, productProfiles.length, ...state.products);
    acceptanceBons.splice(0, acceptanceBons.length, ...state.bons);
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
    createBon: (next) => setState((current) => ({
      ...current,
      bons: [prepareBon(current, next), ...current.bons]
    })),
    updateBonStatus: (number, status, paymentDate) => setState((current) => ({
      ...current,
      bons: current.bons.map((item) => item.number === number
        ? { ...item, status, paymentDate: status === "Lunas" ? paymentDate : undefined }
        : item)
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

function prepareBon(state: State, input: AcceptanceBon): AcceptanceBon {
  const number = normalizeBonNumber(input.number);
  if (!isValidBonNumber(number)) throw new AppStoreError("VALIDATION_ERROR", "Format Nomor Bon tidak valid.");
  if (state.bons.some((item) => normalizeBonNumber(item.number) === number)) {
    throw new AppStoreError("DUPLICATE_VALUE", "Nomor Bon sudah digunakan.");
  }
  const customer = state.customers.find((item) => item.code === input.customerCode && item.active);
  if (!customer) throw new AppStoreError("VALIDATION_ERROR", "Pelanggan tidak tersedia.");
  const lines = input.lines.map((line) => {
    const product = state.products.find((item) => item.id === line.productId && item.active);
    if (!product) throw new AppStoreError("VALIDATION_ERROR", "Produk tidak tersedia.");
    return {
      ...line,
      snapshotCostPrice: product.costPrice,
      snapshotBasePrice: product.basePrice,
      snapshotDiscounts: [...(product.type === "LM" ? customer.discountLm : customer.discountBr)]
    };
  });
  return { ...input, number, lines };
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
