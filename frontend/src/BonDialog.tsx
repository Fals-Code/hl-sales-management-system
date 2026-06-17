import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Gift,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { customers, formatCurrency, products } from "./data";

type BonDialogProps = {
  open: boolean;
  onClose: () => void;
};

type BonStep = 1 | 2 | 3;

type BonItemDraft = {
  id: string;
  productName: string;
  quantity: number;
};

const roundToHundred = (value: number) => Math.round(value / 100) * 100;

const createItem = (sequence: number): BonItemDraft => ({
  id: `item-${sequence}`,
  productName: products[0].name,
  quantity: 1
});

export function BonDialog({ open, onClose }: BonDialogProps) {
  const [step, setStep] = useState<BonStep>(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerCode, setSelectedCustomerCode] = useState(customers[0].code);
  const [items, setItems] = useState<BonItemDraft[]>([createItem(1)]);
  const [itemSequence, setItemSequence] = useState(2);
  const [shipping, setShipping] = useState(25000);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [useBonus, setUseBonus] = useState(false);
  const [bonusProductName, setBonusProductName] = useState(products[2].name);
  const [bonusQuantity, setBonusQuantity] = useState(1);
  const [ownerPin, setOwnerPin] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [savedBonNumber, setSavedBonNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCustomerSearch("");
    setSelectedCustomerCode(customers[0].code);
    setItems([createItem(1)]);
    setItemSequence(2);
    setShipping(25000);
    setExtraDiscount(0);
    setUseBonus(false);
    setBonusProductName(products[2].name);
    setBonusQuantity(1);
    setOwnerPin("");
    setApprovalReason("");
    setSavedBonNumber(null);
  }, [open]);

  const selectedCustomer = customers.find((customer) => customer.code === selectedCustomerCode) ?? customers[0];

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.code}`.toLowerCase().includes(query)
    );
  }, [customerSearch]);

  const calculations = useMemo(() => {
    const itemDetails = items.map((item) => {
      const product = products.find((entry) => entry.name === item.productName) ?? products[0];
      const discountRate = product.type === "LM" ? 0.1 : 0.05;
      const gross = product.price * item.quantity;
      const discount = roundToHundred(gross * discountRate);
      const net = roundToHundred(gross - discount);
      const estimatedCost = roundToHundred(product.price * 0.82 * item.quantity);

      return {
        ...item,
        product,
        gross,
        discount,
        net,
        estimatedCost
      };
    });

    const grossProducts = itemDetails.reduce((sum, item) => sum + item.gross, 0);
    const customerDiscount = itemDetails.reduce((sum, item) => sum + item.discount, 0);
    const productRevenueBeforeExtra = itemDetails.reduce((sum, item) => sum + item.net, 0);
    const safeExtraDiscount = Math.max(0, roundToHundred(extraDiscount));
    const productRevenue = Math.max(0, roundToHundred(productRevenueBeforeExtra - safeExtraDiscount));
    const productCost = itemDetails.reduce((sum, item) => sum + item.estimatedCost, 0);
    const totalInvoice = roundToHundred(productRevenue + Math.max(0, shipping));
    const estimatedProfit = roundToHundred(productRevenue - productCost);
    const bonusProduct = products.find((entry) => entry.name === bonusProductName) ?? products[0];
    const safeBonusQuantity = useBonus ? Math.min(Math.max(1, bonusQuantity), selectedCustomer.bonus) : 0;
    const bonusPromoCost = roundToHundred(bonusProduct.price * 0.82 * safeBonusQuantity);

    return {
      itemDetails,
      grossProducts,
      customerDiscount,
      safeExtraDiscount,
      productRevenue,
      productCost,
      totalInvoice,
      estimatedProfit,
      safeBonusQuantity,
      bonusProduct,
      bonusPromoCost
    };
  }, [items, shipping, extraDiscount, useBonus, bonusQuantity, bonusProductName, selectedCustomer.bonus]);

  const hasNegativeProfit = calculations.estimatedProfit < 0;
  const ownerApprovalValid = !hasNegativeProfit || (ownerPin.length >= 4 && approvalReason.trim().length >= 8);
  const canContinueFromProducts = items.length > 0 && items.every((item) => item.quantity > 0);

  if (!open) return null;

  const addItem = () => {
    setItems((current) => [...current, createItem(itemSequence)]);
    setItemSequence((value) => value + 1);
  };

  const updateItem = (id: string, changes: Partial<BonItemDraft>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  };

  const removeItem = (id: string) => {
    setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id));
  };

  const saveBon = () => {
    if (!ownerApprovalValid) return;
    const timestamp = new Date();
    const number = `BON-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, "0")}${String(timestamp.getDate()).padStart(2, "0")}-${String(timestamp.getTime()).slice(-3)}`;
    setSavedBonNumber(number);
  };

  return (
    <div className="dialog-backdrop bon-form-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bon-dialog bon-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bon-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {savedBonNumber ? (
          <BonSuccess number={savedBonNumber} total={calculations.totalInvoice} onClose={onClose} />
        ) : (
          <>
            <header className="dialog-header bon-form-header">
              <div>
                <span className="eyebrow">Transaksi baru</span>
                <h2 id="bon-dialog-title">Buat Bon</h2>
                <p>Selesaikan satu tahap dalam satu waktu agar data mudah diperiksa.</p>
              </div>
              <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup form Bon">
                <X size={24} />
              </button>
            </header>

            <BonStepper step={step} />

            <div className="bon-form-content">
              {step === 1 && (
                <CustomerStep
                  search={customerSearch}
                  setSearch={setCustomerSearch}
                  filteredCustomers={filteredCustomers}
                  selectedCustomerCode={selectedCustomerCode}
                  setSelectedCustomerCode={setSelectedCustomerCode}
                />
              )}

              {step === 2 && (
                <ProductStep
                  items={items}
                  updateItem={updateItem}
                  removeItem={removeItem}
                  addItem={addItem}
                  shipping={shipping}
                  setShipping={setShipping}
                  extraDiscount={extraDiscount}
                  setExtraDiscount={setExtraDiscount}
                  useBonus={useBonus}
                  setUseBonus={setUseBonus}
                  bonusProductName={bonusProductName}
                  setBonusProductName={setBonusProductName}
                  bonusQuantity={bonusQuantity}
                  setBonusQuantity={setBonusQuantity}
                  availableBonus={selectedCustomer.bonus}
                  calculations={calculations}
                />
              )}

              {step === 3 && (
                <ReviewStep
                  customer={selectedCustomer}
                  calculations={calculations}
                  shipping={shipping}
                  hasNegativeProfit={hasNegativeProfit}
                  ownerPin={ownerPin}
                  setOwnerPin={setOwnerPin}
                  approvalReason={approvalReason}
                  setApprovalReason={setApprovalReason}
                />
              )}
            </div>

            <footer className="dialog-footer bon-form-footer">
              {step === 1 ? (
                <button className="button button--secondary" type="button" onClick={onClose}>Batal</button>
              ) : (
                <button className="button button--secondary" type="button" onClick={() => setStep((step - 1) as BonStep)}>
                  <ArrowLeft size={19} />
                  Kembali
                </button>
              )}

              {step < 3 ? (
                <button
                  className="button button--primary"
                  type="button"
                  disabled={step === 2 && !canContinueFromProducts}
                  onClick={() => setStep((step + 1) as BonStep)}
                >
                  Lanjutkan
                  <ChevronRight size={19} />
                </button>
              ) : (
                <button
                  className="button button--primary"
                  type="button"
                  disabled={!ownerApprovalValid}
                  onClick={saveBon}
                >
                  <ReceiptText size={20} />
                  Simpan Bon
                </button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function BonStepper({ step }: { step: BonStep }) {
  const steps = [
    { number: 1, label: "Pelanggan" },
    { number: 2, label: "Produk" },
    { number: 3, label: "Periksa" }
  ];

  return (
    <ol className="bon-stepper" aria-label="Tahapan membuat Bon">
      {steps.map((item) => {
        const active = item.number === step;
        const complete = item.number < step;
        return (
          <li className={`${active ? "bon-step--active" : ""} ${complete ? "bon-step--complete" : ""}`} key={item.number}>
            <span className="bon-step-number">{complete ? <Check size={18} /> : item.number}</span>
            <span>{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CustomerStep({
  search,
  setSearch,
  filteredCustomers,
  selectedCustomerCode,
  setSelectedCustomerCode
}: {
  search: string;
  setSearch: (value: string) => void;
  filteredCustomers: typeof customers;
  selectedCustomerCode: string;
  setSelectedCustomerCode: (value: string) => void;
}) {
  return (
    <section className="bon-step-panel" aria-labelledby="customer-step-title">
      <div className="bon-step-heading">
        <div className="bon-step-heading-icon"><UserRound size={25} /></div>
        <div>
          <span className="eyebrow">Tahap 1 dari 3</span>
          <h3 id="customer-step-title">Pilih pelanggan</h3>
          <p>Diskon, piutang, dan bonus pelanggan akan diterapkan otomatis.</p>
        </div>
      </div>

      <label className="search-box bon-customer-search">
        <Search size={21} aria-hidden="true" />
        <span className="sr-only">Cari pelanggan</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama atau kode pelanggan"
          autoFocus
        />
      </label>

      <div className="bon-customer-list">
        {filteredCustomers.map((customer) => {
          const selected = customer.code === selectedCustomerCode;
          return (
            <button
              className={`bon-customer-option ${selected ? "bon-customer-option--selected" : ""}`}
              type="button"
              key={customer.code}
              onClick={() => setSelectedCustomerCode(customer.code)}
              aria-pressed={selected}
            >
              <span className="customer-avatar">{customer.name.slice(0, 2).toUpperCase()}</span>
              <span className="bon-customer-copy">
                <strong>{customer.name}</strong>
                <small>{customer.code}</small>
                <span>Piutang {formatCurrency(customer.receivable)} · Bonus {customer.bonus} unit</span>
              </span>
              <span className="bon-choice-indicator">{selected && <Check size={19} />}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProductStep({
  items,
  updateItem,
  removeItem,
  addItem,
  shipping,
  setShipping,
  extraDiscount,
  setExtraDiscount,
  useBonus,
  setUseBonus,
  bonusProductName,
  setBonusProductName,
  bonusQuantity,
  setBonusQuantity,
  availableBonus,
  calculations
}: {
  items: BonItemDraft[];
  updateItem: (id: string, changes: Partial<BonItemDraft>) => void;
  removeItem: (id: string) => void;
  addItem: () => void;
  shipping: number;
  setShipping: (value: number) => void;
  extraDiscount: number;
  setExtraDiscount: (value: number) => void;
  useBonus: boolean;
  setUseBonus: (value: boolean) => void;
  bonusProductName: string;
  setBonusProductName: (value: string) => void;
  bonusQuantity: number;
  setBonusQuantity: (value: number) => void;
  availableBonus: number;
  calculations: ReturnType<typeof useBonCalculationsPlaceholder>;
}) {
  return (
    <section className="bon-step-panel" aria-labelledby="product-step-title">
      <div className="bon-step-heading">
        <div className="bon-step-heading-icon"><PackagePlus size={25} /></div>
        <div>
          <span className="eyebrow">Tahap 2 dari 3</span>
          <h3 id="product-step-title">Tambahkan produk</h3>
          <p>Gunakan tombol besar dan periksa jumlah setiap produk sebelum lanjut.</p>
        </div>
      </div>

      <div className="bon-product-layout">
        <div className="bon-product-main">
          <div className="bon-item-editor-list">
            {items.map((item, index) => {
              const product = products.find((entry) => entry.name === item.productName) ?? products[0];
              return (
                <article className="bon-item-editor" key={item.id}>
                  <div className="bon-item-editor-header">
                    <div>
                      <span className="eyebrow">Produk {index + 1}</span>
                      <h4>{product.name}</h4>
                    </div>
                    <button
                      className="icon-button bon-remove-item"
                      type="button"
                      disabled={items.length === 1}
                      onClick={() => removeItem(item.id)}
                      aria-label={`Hapus produk ${index + 1}`}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <label className="field">
                    <span>Nama produk</span>
                    <select value={item.productName} onChange={(event) => updateItem(item.id, { productName: event.target.value })}>
                      {products.map((entry) => (
                        <option value={entry.name} key={entry.name}>{entry.name}</option>
                      ))}
                    </select>
                  </label>

                  <div className="bon-item-editor-meta">
                    <span>Tipe <strong>{product.type}</strong></span>
                    <span>Stok <strong>{product.stock}</strong></span>
                    <span>Harga <strong>{formatCurrency(product.price)}</strong></span>
                  </div>

                  <label className="field">
                    <span>Jumlah</span>
                    <div className="quantity-control bon-quantity-control">
                      <button type="button" onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })} aria-label="Kurangi jumlah">−</button>
                      <input
                        value={item.quantity}
                        onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                        inputMode="numeric"
                      />
                      <button type="button" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })} aria-label="Tambah jumlah">+</button>
                    </div>
                  </label>
                </article>
              );
            })}
          </div>

          <button className="button button--secondary bon-add-item" type="button" onClick={addItem}>
            <Plus size={20} />
            Tambah Produk Lain
          </button>

          <section className="bon-adjustment-card">
            <h4>Biaya dan potongan</h4>
            <div className="bon-adjustment-grid">
              <label className="field">
                <span>Ongkir</span>
                <input
                  value={shipping}
                  onChange={(event) => setShipping(Math.max(0, Number(event.target.value) || 0))}
                  inputMode="numeric"
                />
                <small>{formatCurrency(shipping)}</small>
              </label>
              <label className="field">
                <span>Potongan tambahan</span>
                <input
                  value={extraDiscount}
                  onChange={(event) => setExtraDiscount(Math.max(0, Number(event.target.value) || 0))}
                  inputMode="numeric"
                />
                <small>{formatCurrency(extraDiscount)}</small>
              </label>
            </div>
          </section>

          <section className={`bon-bonus-card ${useBonus ? "bon-bonus-card--active" : ""}`}>
            <label className="bon-bonus-toggle">
              <input
                type="checkbox"
                checked={useBonus}
                disabled={availableBonus === 0}
                onChange={(event) => setUseBonus(event.target.checked)}
              />
              <span className="custom-checkbox">{useBonus && <Check size={18} />}</span>
              <span>
                <strong>Gunakan bonus pelanggan</strong>
                <small>Tersedia {availableBonus} unit. Bonus tidak menambah omzet, piutang, atau laba.</small>
              </span>
            </label>

            {useBonus && availableBonus > 0 && (
              <div className="bon-bonus-fields">
                <label className="field">
                  <span>Produk bonus</span>
                  <select value={bonusProductName} onChange={(event) => setBonusProductName(event.target.value)}>
                    {products.map((entry) => (
                      <option value={entry.name} key={entry.name}>{entry.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Jumlah bonus</span>
                  <div className="quantity-control">
                    <button type="button" onClick={() => setBonusQuantity(Math.max(1, bonusQuantity - 1))}>−</button>
                    <input
                      value={bonusQuantity}
                      onChange={(event) => setBonusQuantity(Math.min(availableBonus, Math.max(1, Number(event.target.value) || 1)))}
                      inputMode="numeric"
                    />
                    <button type="button" onClick={() => setBonusQuantity(Math.min(availableBonus, bonusQuantity + 1))}>+</button>
                  </div>
                </label>
              </div>
            )}
          </section>
        </div>

        <aside className="bon-live-summary" aria-label="Ringkasan sementara Bon">
          <h4>Ringkasan Sementara</h4>
          <SummaryRow label="Harga produk" value={calculations.grossProducts} />
          <SummaryRow label="Diskon pelanggan" value={-calculations.customerDiscount} />
          <SummaryRow label="Potongan tambahan" value={-calculations.safeExtraDiscount} />
          <SummaryRow label="Ongkir" value={shipping} />
          <div className="bon-live-total">
            <span>Total sementara</span>
            <strong>{formatCurrency(calculations.totalInvoice)}</strong>
          </div>
          <small>Nilai akhir dibulatkan ke Rp100 terdekat.</small>
        </aside>
      </div>
    </section>
  );
}

function ReviewStep({
  customer,
  calculations,
  shipping,
  hasNegativeProfit,
  ownerPin,
  setOwnerPin,
  approvalReason,
  setApprovalReason
}: {
  customer: (typeof customers)[number];
  calculations: ReturnType<typeof useBonCalculationsPlaceholder>;
  shipping: number;
  hasNegativeProfit: boolean;
  ownerPin: string;
  setOwnerPin: (value: string) => void;
  approvalReason: string;
  setApprovalReason: (value: string) => void;
}) {
  return (
    <section className="bon-step-panel" aria-labelledby="review-step-title">
      <div className="bon-step-heading">
        <div className="bon-step-heading-icon"><ReceiptText size={25} /></div>
        <div>
          <span className="eyebrow">Tahap 3 dari 3</span>
          <h3 id="review-step-title">Periksa Bon</h3>
          <p>Pastikan pelanggan, produk, dan total sudah benar sebelum disimpan.</p>
        </div>
      </div>

      <div className="bon-review-layout">
        <div className="bon-review-main">
          <section className="bon-review-card">
            <div className="bon-review-card-header">
              <div>
                <span className="eyebrow">Pelanggan</span>
                <h4>{customer.name}</h4>
                <p>{customer.code} · Piutang {formatCurrency(customer.receivable)}</p>
              </div>
              <UserRound size={24} />
            </div>
          </section>

          <section className="bon-review-card">
            <div className="bon-review-card-header">
              <div>
                <span className="eyebrow">Produk</span>
                <h4>{calculations.itemDetails.length} jenis produk</h4>
              </div>
              <PackagePlus size={24} />
            </div>
            <div className="bon-review-item-list">
              {calculations.itemDetails.map((item) => (
                <div className="bon-review-item" key={item.id}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <span>{item.product.type} · {item.quantity} item</span>
                  </div>
                  <strong>{formatCurrency(item.net)}</strong>
                </div>
              ))}
            </div>
          </section>

          {calculations.safeBonusQuantity > 0 && (
            <section className="bon-review-card bon-review-bonus">
              <div className="bon-review-card-header">
                <div>
                  <span className="eyebrow">Bonus</span>
                  <h4>{calculations.bonusProduct.name}</h4>
                  <p>{calculations.safeBonusQuantity} unit bonus · Harga jual Rp0</p>
                </div>
                <Gift size={24} />
              </div>
              <div className="bon-review-note">Biaya promosi tercatat terpisah sebesar {formatCurrency(calculations.bonusPromoCost)}.</div>
            </section>
          )}

          {hasNegativeProfit && (
            <section className="bon-negative-profit-card">
              <div className="bon-negative-profit-heading">
                <AlertTriangle size={25} />
                <div>
                  <h4>Transaksi menghasilkan laba negatif</h4>
                  <p>Masukkan PIN Owner dan alasan persetujuan untuk melanjutkan.</p>
                </div>
              </div>
              <div className="bon-owner-grid">
                <label className="field">
                  <span>PIN Owner</span>
                  <input
                    type="password"
                    value={ownerPin}
                    onChange={(event) => setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="Minimal 4 angka"
                  />
                </label>
                <label className="field field--wide">
                  <span>Alasan persetujuan</span>
                  <textarea
                    value={approvalReason}
                    onChange={(event) => setApprovalReason(event.target.value)}
                    rows={3}
                    placeholder="Contoh: harga khusus untuk pelanggan lama"
                  />
                </label>
              </div>
            </section>
          )}
        </div>

        <aside className="bon-final-summary">
          <div className="bon-final-summary-header">
            <ShieldCheck size={24} />
            <div>
              <strong>Ringkasan Akhir</strong>
              <span>Perhitungan otomatis</span>
            </div>
          </div>
          <SummaryRow label="Harga produk" value={calculations.grossProducts} />
          <SummaryRow label="Diskon pelanggan" value={-calculations.customerDiscount} />
          <SummaryRow label="Potongan tambahan" value={-calculations.safeExtraDiscount} />
          <SummaryRow label="Ongkir" value={shipping} />
          <div className="bon-final-total">
            <span>Total Tagihan</span>
            <strong>{formatCurrency(calculations.totalInvoice)}</strong>
          </div>
          <div className={`bon-profit-indicator ${hasNegativeProfit ? "bon-profit-indicator--danger" : ""}`}>
            <span>Estimasi laba</span>
            <strong>{formatCurrency(calculations.estimatedProfit)}</strong>
          </div>
          {calculations.safeBonusQuantity > 0 && (
            <div className="bon-promo-cost">
              <span>Biaya promosi bonus</span>
              <strong>{formatCurrency(calculations.bonusPromoCost)}</strong>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function BonSuccess({ number, total, onClose }: { number: string; total: number; onClose: () => void }) {
  return (
    <div className="bon-success-state">
      <div className="bon-success-icon"><CheckCircle2 size={42} /></div>
      <span className="eyebrow">Bon berhasil disimpan</span>
      <h2>{number}</h2>
      <p>Total tagihan {formatCurrency(total)} telah dicatat sebagai Bon belum lunas.</p>
      <div className="bon-success-note">
        <ShieldCheck size={22} />
        <span>Harga, diskon, dan data produk tersimpan sebagai snapshot transaksi.</span>
      </div>
      <button className="button button--primary button--large" type="button" onClick={onClose}>Selesai</button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="bon-summary-row">
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

function useBonCalculationsPlaceholder() {
  return {
    itemDetails: [] as Array<BonItemDraft & {
      product: (typeof products)[number];
      gross: number;
      discount: number;
      net: number;
      estimatedCost: number;
    }>,
    grossProducts: 0,
    customerDiscount: 0,
    safeExtraDiscount: 0,
    productRevenue: 0,
    productCost: 0,
    totalInvoice: 0,
    estimatedProfit: 0,
    safeBonusQuantity: 0,
    bonusProduct: products[0],
    bonusPromoCost: 0
  };
}
