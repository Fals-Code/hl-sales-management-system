import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { acceptanceBons, customerProfiles, productProfiles, type AcceptanceBon, type AcceptanceBonLine, type CustomerProfile, type ProductProfile, type ProductType } from "./acceptance-data";
import { authApi, SESSION_EXPIRED_EVENT, useApi } from "./api-client";
import { isValidBonNumber, normalizeBonNumber } from "./bon-number";
import { hydrationApi, hydrationErrorMessage } from "./hydration-api";
import { PageLoadingState } from "./PageStates";
import { mapHydrationPayload } from "./resource-mappers";

const STORAGE_KEY = "hl-phase4-store-v3";
const SESSION_KEY = "hl-demo-session";

export type StoredCustomer = CustomerProfile & { backendId?: string };
export type StoredProduct = ProductProfile & { backendId?: string };
export type StoredBonLine = AcceptanceBonLine & { backendProductId?: string; snapshotProductName?: string; snapshotProductType?: ProductType };
export type StoredBon = Omit<AcceptanceBon, "lines"> & { backendId?: string; deletedAt?: string; lines: StoredBonLine[] };

export class AppStoreError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "AppStoreError"; }
}

type State = { customers: StoredCustomer[]; products: StoredProduct[]; bons: StoredBon[] };
type HydrationStatus = "idle" | "loading" | "ready" | "error";
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
  const [state, setState] = useState<State>(() => useApi ? emptyState() : readState());
  const [apiSessionActive, setApiSessionActive] = useState(() => useApi && window.localStorage.getItem(SESSION_KEY) === "active");
  const [hydrationStatus, setHydrationStatusState] = useState<HydrationStatus>(() => useApi ? "idle" : "ready");
  const [hydrationError, setHydrationError] = useState("");
  const hydrationStatusRef = useRef<HydrationStatus>(useApi ? "idle" : "ready");
  const hydrationGenerationRef = useRef(0);
  const lastDemoSessionRef = useRef(window.localStorage.getItem(SESSION_KEY) === "active");

  const setHydrationStatus = useCallback((status: HydrationStatus) => {
    hydrationStatusRef.current = status;
    setHydrationStatusState(status);
  }, []);

  const resetApiState = useCallback(() => {
    hydrationGenerationRef.current += 1;
    setState(emptyState());
    setHydrationError("");
    setHydrationStatus("idle");
    setApiSessionActive(false);
  }, [setHydrationStatus]);

  const hydrateFromApi = useCallback(async () => {
    if (!useApi || hydrationStatusRef.current === "loading") return;
    const generation = hydrationGenerationRef.current;
    setHydrationError("");
    setHydrationStatus("loading");
    try {
      const payload = await hydrationApi.load();
      if (generation !== hydrationGenerationRef.current) return;
      setState(mapHydrationPayload(payload));
      setHydrationStatus("ready");
    } catch (error) {
      if (generation !== hydrationGenerationRef.current) return;
      setHydrationError(hydrationErrorMessage(error));
      setHydrationStatus("error");
    }
  }, [setHydrationStatus]);

  useEffect(() => {
    syncLegacyCollections(state);
    if (!useApi) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!useApi) return;
    let disposed = false;

    const activate = () => {
      if (disposed) return;
      setApiSessionActive(true);
      void hydrateFromApi();
    };
    const deactivate = () => {
      window.localStorage.removeItem(SESSION_KEY);
      lastDemoSessionRef.current = false;
      resetApiState();
    };
    const expire = () => deactivate();

    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    void authApi.me().then(activate).catch(deactivate);

    const timer = window.setInterval(() => {
      const current = window.localStorage.getItem(SESSION_KEY) === "active";
      if (current === lastDemoSessionRef.current) return;
      lastDemoSessionRef.current = current;
      if (current) activate();
      else deactivate();
    }, 50);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
    };
  }, [hydrateFromApi, resetApiState]);

  const value = useMemo<Store>(() => ({
    ...state,
    saveCustomer: (next) => setState((current) => ({ ...current, customers: upsert(current.customers, next, (item) => item.code) })),
    softDeleteCustomer: (code) => setState((current) => ({ ...current, customers: current.customers.map((item) => item.code === code ? { ...item, active: false } : item) })),
    saveProduct: (next) => setState((current) => ({ ...current, products: upsert(current.products, next, (item) => item.id) })),
    softDeleteProduct: (id) => setState((current) => ({ ...current, products: current.products.map((item) => item.id === id ? { ...item, active: false } : item) })),
    createBon: (next) => setState((current) => {
      const prepared = prepareBon(current, next);
      const units = prepared.isBonus ? bonUnits(prepared) : 0;
      return { ...current, bons: [prepared, ...current.bons], customers: units ? current.customers.map((customer) => customer.code === prepared.customerCode ? { ...customer, bonusesGranted: customer.bonusesGranted + units } : customer) : current.customers };
    }),
    updateBon: (originalNumber, next) => setState((current) => {
      const existing = current.bons.find((item) => item.number === originalNumber);
      if (!existing || existing.deletedAt) throw new AppStoreError("NOT_FOUND", "Bon tidak ditemukan.");
      if (existing.status !== "Piutang" && existing.status !== "Bonus") throw new AppStoreError("CONFLICT", "Bon ini tidak dapat diedit.");
      const prepared = prepareBon(current, next, originalNumber);
      const bonusDelta = (prepared.isBonus ? bonUnits(prepared) : 0) - (existing.isBonus ? bonUnits(existing) : 0);
      return { ...current, bons: current.bons.map((item) => item.number === originalNumber ? { ...prepared, backendId: prepared.backendId ?? existing.backendId, deletedAt: existing.deletedAt } : item), customers: bonusDelta ? current.customers.map((customer) => customer.code === prepared.customerCode ? { ...customer, bonusesGranted: Math.max(0, customer.bonusesGranted + bonusDelta) } : customer) : current.customers };
    }),
    updateBonStatus: (number, status, paymentDate) => setState((current) => {
      const existing = current.bons.find((item) => item.number === number && !item.deletedAt);
      if (!existing) throw new AppStoreError("NOT_FOUND", "Bon tidak ditemukan.");
      const revenueDelta = (!existing.isBonus && status === "Lunas" ? bonOmzet(current, existing) : 0) - (!existing.isBonus && existing.status === "Lunas" ? bonOmzet(current, existing) : 0);
      const bonusDelta = (existing.isBonus && status !== "Void" ? bonUnits(existing) : 0) - (existing.isBonus && existing.status !== "Void" ? bonUnits(existing) : 0);
      return { ...current, bons: current.bons.map((item) => item.number === number ? { ...item, status, paymentDate: status === "Lunas" ? paymentDate : status === "Bonus" ? item.paymentDate : undefined } : item), customers: current.customers.map((customer) => customer.code === existing.customerCode ? { ...customer, accumulatedPaidOmzet: Math.max(0, customer.accumulatedPaidOmzet + revenueDelta), bonusesGranted: Math.max(0, customer.bonusesGranted + bonusDelta) } : customer) };
    }),
    softDeleteBon: (number) => setState((current) => {
      const existing = current.bons.find((item) => item.number === number && !item.deletedAt);
      if (!existing) throw new AppStoreError("NOT_FOUND", "Bon tidak ditemukan.");
      const revenueDelta = !existing.isBonus && existing.status === "Lunas" ? -bonOmzet(current, existing) : 0;
      const bonusDelta = existing.isBonus && existing.status !== "Void" ? -bonUnits(existing) : 0;
      return { ...current, bons: current.bons.map((item) => item.number === number ? { ...item, deletedAt: new Date().toISOString() } : item), customers: current.customers.map((customer) => customer.code === existing.customerCode ? { ...customer, accumulatedPaidOmzet: Math.max(0, customer.accumulatedPaidOmzet + revenueDelta), bonusesGranted: Math.max(0, customer.bonusesGranted + bonusDelta) } : customer) };
    }),
    resetStore: () => {
      if (useApi) resetApiState();
      else setState(seedState());
    }
  }), [resetApiState, state]);

  if (useApi && apiSessionActive && hydrationStatus !== "ready") {
    return (
      <StoreContext.Provider value={value}>
        <main className="login-page">
          {hydrationStatus === "error" ? (
            <section className="app-state-card" role="alert">
              <h2>Data belum berhasil dimuat</h2>
              <p>{hydrationError}</p>
              <button className="button button--primary" type="button" onClick={() => { void hydrateFromApi(); }}>Coba lagi</button>
            </section>
          ) : <PageLoadingState label="Mengambil data aplikasi" />}
        </main>
      </StoreContext.Provider>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() { const value = useContext(StoreContext); if (!value) throw new Error("AppStoreProvider is required"); return value; }

function prepareBon(state: State, input: StoredBon, excludeNumber?: string): StoredBon {
  const number = normalizeBonNumber(input.number);
  if (!isValidBonNumber(number)) throw new AppStoreError("VALIDATION_ERROR", "Format Nomor Bon tidak valid.");
  if (state.bons.some((item) => item.number !== excludeNumber && normalizeBonNumber(item.number) === number)) throw new AppStoreError("DUPLICATE_VALUE", "Nomor Bon sudah digunakan.");
  const customer = state.customers.find((item) => item.code === input.customerCode && item.active);
  if (!customer) throw new AppStoreError("VALIDATION_ERROR", "Pelanggan tidak tersedia.");
  const lines: StoredBonLine[] = input.lines.map((line) => {
    const product = state.products.find((item) => item.id === line.productId && item.active);
    if (!product) throw new AppStoreError("VALIDATION_ERROR", "Produk tidak tersedia.");
    return { ...line, backendProductId: product.backendId, snapshotProductName: product.name, snapshotProductType: product.type, snapshotCostPrice: product.costPrice, snapshotBasePrice: product.basePrice, snapshotDiscounts: [...(product.type === "LM" ? customer.discountLm : customer.discountBr)] };
  });
  const prepared: StoredBon = { ...input, number, description: input.description.trim(), shipping: input.isBonus ? 0 : Math.max(0, input.shipping), lines };
  if (prepared.isBonus) {
    const available = customer.bonusThreshold > 0 ? Math.max(0, Math.floor(customer.accumulatedPaidOmzet / customer.bonusThreshold) - customer.bonusesGranted) : 0;
    const existing = excludeNumber ? state.bons.find((item) => item.number === excludeNumber) : undefined;
    const restored = existing?.isBonus ? bonUnits(existing) : 0;
    if (bonUnits(prepared) > available + restored) throw new AppStoreError("BONUS_EXCEEDED", "Jumlah bonus melebihi unit yang tersedia.");
  }
  return prepared;
}

function bonUnits(bon: StoredBon) { return bon.lines.reduce((sum, line) => sum + line.quantity, 0); }
function bonOmzet(state: State, bon: StoredBon) {
  const customer = state.customers.find((item) => item.code === bon.customerCode);
  if (!customer || bon.isBonus) return 0;
  return bon.lines.reduce((sum, line) => {
    const product = state.products.find((item) => item.id === line.productId);
    if (!product) return sum;
    const type = line.snapshotProductType ?? product.type;
    const base = line.snapshotBasePrice ?? product.basePrice;
    const discounts = line.snapshotDiscounts ?? (type === "LM" ? customer.discountLm : customer.discountBr);
    const discounted = discounts.reduce((price, discount) => Math.floor(price * (100 - discount) / 100), base);
    const unit = Math.floor((discounted + 50) / 100) * 100;
    return sum + unit * line.quantity;
  }, 0);
}
function upsert<T>(items: T[], next: T, key: (value: T) => string) { return items.some((item) => key(item) === key(next)) ? items.map((item) => key(item) === key(next) ? next : item) : [...items, next]; }
function readState(): State { try { const raw = window.localStorage.getItem(STORAGE_KEY); if (!raw) return seedState(); const parsed = JSON.parse(raw) as State; return Array.isArray(parsed.customers) && Array.isArray(parsed.products) && Array.isArray(parsed.bons) ? parsed : seedState(); } catch { return seedState(); } }
function seedState(): State { return { customers: structuredClone(customerProfiles), products: structuredClone(productProfiles), bons: structuredClone(acceptanceBons) }; }
function emptyState(): State { return { customers: [], products: [], bons: [] }; }
function syncLegacyCollections(state: State) { customerProfiles.splice(0, customerProfiles.length, ...state.customers); productProfiles.splice(0, productProfiles.length, ...state.products); acceptanceBons.splice(0, acceptanceBons.length, ...state.bons.filter((bon) => !bon.deletedAt)); }
