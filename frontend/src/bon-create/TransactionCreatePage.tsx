import { useEffect, useMemo, useRef, useState } from "react";
import type { AcceptanceBonLine } from "../acceptance-data";
import { currentIsoDate } from "../acceptance-data";
import { ApiClientError, bonApi, bonusBonApi, downloadApiFile, useApi } from "../api-client";
import { isValidBonNumber, normalizeBonNumber } from "../bon-number";
import { AppStoreError, useAppStore, type StoredBon } from "../store";
import { TransactionForm } from "./TransactionForm";
import { TransactionCreateResult } from "./TransactionCreateResult";
import { clearDraft, nextBonNumber, normalizeFieldErrors, readDraft, roundHundred, writeDraft } from "./draft";
import type { ApiBon, LineCalculation, Mode, SavedBonSnapshot } from "./types";

export function TransactionCreatePage({ prefillCustomerCode, initialMode = "normal", onCancel, onViewBon, onDirtyChange }: {
  prefillCustomerCode?: string | null;
  initialMode?: Mode;
  onCancel: () => void;
  onViewBon: (bonNumber: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { customers, products, bons, createBon, refreshFromApi } = useAppStore();
  const activeCustomers = useMemo(() => customers.filter((item) => item.active), [customers]);
  const activeProducts = useMemo(() => products.filter((item) => item.active), [products]);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [date, setDate] = useState(currentIsoDate());
  const [number, setNumber] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [description, setDescription] = useState("");
  const [shipping, setShipping] = useState(0);
  const [lines, setLines] = useState<AcceptanceBonLine[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [negativeProfitReason, setNegativeProfitReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [saved, setSaved] = useState<ApiBon | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedBonSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const initializedRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const routeKey = `${initialMode}:${prefillCustomerCode ?? ""}`;
    if (initializedRouteRef.current === routeKey) return;
    initializedRouteRef.current = routeKey;
    const today = currentIsoDate();
    const restored = readDraft();
    const canRestore = restored && restored.mode === initialMode && (!prefillCustomerCode || restored.customerCode === prefillCustomerCode);
    if (canRestore && restored) {
      setMode(restored.mode);
      setDate(restored.date);
      setNumber(restored.number);
      setCustomerCode(restored.customerCode);
      setDescription(restored.description);
      setShipping(restored.shipping);
      setLines(restored.lines);
      setTouched(true);
      setDraftRestored(true);
    } else {
      resetFields(initialMode, today, prefillCustomerCode ?? activeCustomers[0]?.code ?? "");
    }
    setSaved(null);
    setSavedSnapshot(null);
    setError(null);
    setServerFieldErrors({});
  }, [initialMode, prefillCustomerCode]);

  useEffect(() => {
    if (!customerCode && activeCustomers.length > 0) setCustomerCode(prefillCustomerCode ?? activeCustomers[0].code);
  }, [activeCustomers, customerCode, prefillCustomerCode]);

  const dirty = touched && !saved;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const timeout = window.setTimeout(() => writeDraft({ version: 1, savedAt: Date.now(), mode, date, number, customerCode, description, shipping, lines }), 180);
    return () => window.clearTimeout(timeout);
  }, [dirty, mode, date, number, customerCode, description, shipping, lines]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const customer = customers.find((item) => item.code === customerCode);
  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return query ? activeProducts.filter((product) => `${product.name} ${product.id} ${product.type}`.toLowerCase().includes(query)) : activeProducts;
  }, [activeProducts, productSearch]);

  const lineCalculations = useMemo<LineCalculation[]>(() => lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product || !customer) return { line, productName: "Produk tidak ditemukan", productCode: line.productId, productType: "-", discounts: [], stock: 0, unitPrice: 0, subtotal: 0, profit: 0, invalidStock: true };
    const discounts = product.type === "LM" ? customer.discountLm : customer.discountBr;
    const unitPrice = mode === "bonus" ? 0 : roundHundred(discounts.reduce((value, discount) => Math.floor(value * (100 - discount) / 100), product.basePrice));
    return {
      line,
      productName: product.name,
      productCode: product.id,
      productType: product.type,
      discounts,
      stock: product.stock,
      unitPrice,
      subtotal: unitPrice * line.quantity,
      profit: mode === "bonus" ? 0 : (unitPrice - product.costPrice) * line.quantity,
      invalidStock: line.quantity > product.stock || product.stock <= 0
    };
  }), [lines, products, customer, mode]);

  const calculation = useMemo(() => {
    const omzet = lineCalculations.reduce((sum, item) => sum + item.subtotal, 0);
    const profit = lineCalculations.reduce((sum, item) => sum + item.profit, 0);
    const shippingAmount = mode === "bonus" ? 0 : roundHundred(shipping);
    return { omzet, profit, shipping: shippingAmount, total: mode === "bonus" ? 0 : omzet + shippingAmount, quantity: lines.reduce((sum, item) => sum + item.quantity, 0) };
  }, [lineCalculations, mode, shipping, lines]);

  const normalizedNumber = normalizeBonNumber(number);
  const duplicate = bons.some((item) => normalizeBonNumber(item.number) === normalizedNumber);
  const needsApproval = calculation.profit < 0;
  const approvalValid = !needsApproval || (ownerPin.length >= 4 && negativeProfitReason.trim().length >= 8);
  const stockValid = lineCalculations.every((item) => !item.invalidStock);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());
  const valid = validDate && isValidBonNumber(number) && !duplicate && Boolean(customer) && lines.length > 0 && lines.every((line) => Number.isSafeInteger(line.quantity) && line.quantity >= 1) && stockValid && approvalValid;

  const numberError = serverFieldErrors.bonNumber || (duplicate ? "Nomor Bon sudah digunakan." : undefined) || (number && !isValidBonNumber(number) ? "Format Nomor Bon tidak valid." : undefined);
  const customerError = serverFieldErrors.customerId || (!customerCode ? "Pelanggan wajib dipilih." : undefined);
  const itemsError = serverFieldErrors.items || (touched && lines.length === 0 ? "Tambahkan minimal satu produk." : undefined);
  const ownerPinError = serverFieldErrors.ownerPin || (needsApproval && ownerPin.length > 0 && ownerPin.length < 4 ? "PIN Owner minimal 4 digit." : undefined);
  const reasonError = serverFieldErrors.negativeProfitReason || (needsApproval && negativeProfitReason.length > 0 && negativeProfitReason.trim().length < 8 ? "Alasan minimal 8 karakter." : undefined);

  function resetFields(nextMode: Mode, nextDate: string, nextCustomer: string) {
    setMode(nextMode);
    setDate(nextDate);
    setNumber(nextBonNumber(nextMode, nextDate, bons));
    setCustomerCode(nextCustomer);
    setDescription("");
    setShipping(0);
    setLines([]);
    setProductSearch("");
    setOwnerPin("");
    setNegativeProfitReason("");
    setTouched(false);
    setDraftRestored(false);
  }

  const markTouched = () => { setTouched(true); setDraftRestored(false); setError(null); };
  const clearFieldError = (key: string) => setServerFieldErrors((current) => ({ ...current, [key]: "" }));

  const addProduct = (productId: string) => {
    const product = activeProducts.find((item) => item.id === productId);
    if (!product || product.stock <= 0) return;
    markTouched();
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (!existing) return [...current, { productId, quantity: 1 }];
      if (existing.quantity >= product.stock) return current;
      return current.map((line) => line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line);
    });
  };

  const cancel = () => {
    if (dirty && !window.confirm("Batalkan pembuatan Bon dan hapus draft sementara?")) return;
    clearDraft();
    setTouched(false);
    onDirtyChange?.(false);
    onCancel();
  };

  const discardDraft = () => {
    clearDraft();
    resetFields(initialMode, currentIsoDate(), prefillCustomerCode ?? activeCustomers[0]?.code ?? "");
    setError(null);
    setServerFieldErrors({});
    onDirtyChange?.(false);
  };

  const resetForNextBon = () => {
    clearDraft();
    resetFields(mode, currentIsoDate(), customerCode || activeCustomers[0]?.code || "");
    setSaved(null);
    setSavedSnapshot(null);
    setError(null);
    setServerFieldErrors({});
    onDirtyChange?.(false);
  };

  const save = async () => {
    if (!valid || !customer) return;
    setSaving(true);
    setError(null);
    setServerFieldErrors({});
    const draft: StoredBon = { number: normalizedNumber, date, customerCode, description: description.trim(), status: mode === "bonus" ? "Bonus" : "Piutang", shipping: mode === "bonus" ? 0 : roundHundred(shipping), isBonus: mode === "bonus", lines };
    try {
      let created: ApiBon;
      if (useApi) {
        if (!customer.backendId) throw new AppStoreError("MISSING_API_ID", "Data pelanggan belum disinkronkan dengan API.");
        const items = draft.lines.map((line) => {
          const product = products.find((item) => item.id === line.productId);
          if (!product?.backendId) throw new AppStoreError("MISSING_API_ID", "Satu atau lebih produk belum disinkronkan dengan API.");
          return { productId: product.backendId, quantity: line.quantity, kind: mode === "bonus" ? "BONUS" : "REGULER" };
        });
        const common = { bonNumber: draft.number, bonDate: `${draft.date}T00:00:00.000Z`, customerId: customer.backendId, description: draft.description, items };
        created = mode === "bonus" ? await bonusBonApi.create<ApiBon>(common) : await bonApi.create<ApiBon>({ ...common, shippingCost: draft.shipping, ownerPin: needsApproval ? ownerPin : undefined, negativeProfitReason: needsApproval ? negativeProfitReason.trim() : undefined });
        await refreshFromApi();
      } else {
        createBon(draft);
        created = { id: draft.number, bonNumber: draft.number };
      }
      clearDraft();
      setSavedSnapshot({ bon: draft, customerName: customer.name, lines: lineCalculations, total: calculation.total });
      setSaved(created);
      setTouched(false);
      setDraftRestored(false);
      onDirtyChange?.(false);
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        const fieldErrors = normalizeFieldErrors(caught.fields);
        if (/nomor bon/i.test(caught.message) && !fieldErrors.bonNumber) fieldErrors.bonNumber = caught.message;
        setServerFieldErrors(fieldErrors);
        setError(caught.message);
      } else setError(caught instanceof Error ? caught.message : "Bon gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const printSavedBon = async () => {
    if (!saved) return;
    setPrinting(true);
    setError(null);
    try {
      if (useApi) await downloadApiFile(`/api/v1/pdf/bons/${encodeURIComponent(saved.id)}`, `${saved.bonNumber}.pdf`);
      else {
        document.body.classList.add("printing-bon");
        const cleanup = () => document.body.classList.remove("printing-bon");
        window.addEventListener("afterprint", cleanup, { once: true });
        window.print();
        window.setTimeout(cleanup, 1_000);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "PDF Bon gagal dibuat.");
    } finally {
      setPrinting(false);
    }
  };

  if (saved) return <TransactionCreateResult saved={saved} snapshot={savedSnapshot} error={error} printing={printing} onPrint={() => { void printSavedBon(); }} onReset={resetForNextBon} onViewBon={onViewBon} onBack={onCancel} />;

  return <TransactionForm
    mode={mode} date={date} number={number} customerCode={customerCode} description={description} shipping={shipping}
    lines={lines} productSearch={productSearch} ownerPin={ownerPin} negativeProfitReason={negativeProfitReason}
    activeCustomers={activeCustomers} visibleProducts={visibleProducts} customer={customer} lineCalculations={lineCalculations}
    calculation={calculation} validDate={validDate} valid={valid} stockValid={stockValid} needsApproval={needsApproval}
    saving={saving} draftRestored={draftRestored} error={error} numberError={numberError} customerError={customerError}
    itemsError={itemsError} ownerPinError={ownerPinError} reasonError={reasonError} hasProducts={activeProducts.length > 0}
    onCancel={cancel} onDiscardDraft={discardDraft}
    onModeChange={(next) => { if (mode === next) return; markTouched(); setMode(next); setNumber(nextBonNumber(next, date, bons)); if (next === "bonus") setShipping(0); setServerFieldErrors({}); }}
    onDateChange={(value) => { markTouched(); setDate(value); setNumber(nextBonNumber(mode, value, bons)); }}
    onNumberChange={(value) => { markTouched(); setNumber(value); clearFieldError("bonNumber"); }}
    onCustomerChange={(value) => { markTouched(); setCustomerCode(value); clearFieldError("customerId"); }}
    onDescriptionChange={(value) => { markTouched(); setDescription(value); }} onSearchChange={setProductSearch} onAddProduct={addProduct}
    onQuantityChange={(productId, value) => { markTouched(); setLines((current) => current.map((line) => line.productId === productId ? { ...line, quantity: Math.max(1, Math.floor(value || 1)) } : line)); }}
    onRemoveProduct={(productId) => { markTouched(); setLines((current) => current.filter((line) => line.productId !== productId)); }}
    onShippingChange={(value) => { markTouched(); setShipping(Math.max(0, Math.floor(value || 0))); }}
    onOwnerPinChange={(value) => { markTouched(); setOwnerPin(value.replace(/\D/g, "").slice(0, 6)); clearFieldError("ownerPin"); }}
    onReasonChange={(value) => { markTouched(); setNegativeProfitReason(value); clearFieldError("negativeProfitReason"); }}
    onSave={() => { void save(); }}
  />;
}
