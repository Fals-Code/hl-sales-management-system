export type ProductType = "LM" | "BR";
export type AcceptanceBonStatus = "Piutang" | "Lunas" | "Void" | "Bonus";

export type ThresholdHistory = {
  date: string;
  previousAmount: number;
  newAmount: number;
  note: string;
};

export type CustomerProfile = {
  code: string;
  name: string;
  phone: string;
  address: string;
  discountLm: number[];
  discountBr: number[];
  bonusThreshold: number;
  accumulatedPaidOmzet: number;
  bonusesGranted: number;
  thresholdHistory: ThresholdHistory[];
  active: boolean;
};

export type ProductProfile = {
  id: string;
  name: string;
  type: ProductType;
  stock: number;
  costPrice: number;
  basePrice: number;
  active: boolean;
};

export type AcceptanceBonLine = {
  productId: string;
  quantity: number;
  snapshotCostPrice?: number;
  snapshotBasePrice?: number;
  snapshotDiscounts?: number[];
};

export type AcceptanceBon = {
  number: string;
  date: string;
  paymentDate?: string;
  customerCode: string;
  description: string;
  status: AcceptanceBonStatus;
  shipping: number;
  isBonus: boolean;
  lines: AcceptanceBonLine[];
};

export const customerProfiles: CustomerProfile[] = [
  {
    code: "PLG-001",
    name: "Toko Sinar Abadi",
    phone: "0812-3456-7890",
    address: "Surabaya",
    discountLm: [20, 20, 10],
    discountBr: [10, 5],
    bonusThreshold: 10_000_000,
    accumulatedPaidOmzet: 35_000_000,
    bonusesGranted: 2,
    thresholdHistory: [
      { date: "2026-01-01", previousAmount: 8_000_000, newAmount: 10_000_000, note: "Penyesuaian program bonus 2026" }
    ],
    active: true
  },
  {
    code: "PLG-002",
    name: "CV Berkah Jaya",
    phone: "0813-2222-1100",
    address: "Sidoarjo",
    discountLm: [15, 10],
    discountBr: [8, 5],
    bonusThreshold: 12_000_000,
    accumulatedPaidOmzet: 14_200_000,
    bonusesGranted: 0,
    thresholdHistory: [],
    active: true
  },
  {
    code: "PLG-003",
    name: "Toko Maju Lancar",
    phone: "0821-4433-8877",
    address: "Gresik",
    discountLm: [10, 5],
    discountBr: [5],
    bonusThreshold: 10_000_000,
    accumulatedPaidOmzet: 7_350_000,
    bonusesGranted: 0,
    thresholdHistory: [],
    active: true
  },
  {
    code: "PLG-004",
    name: "UD Makmur",
    phone: "0812-9900-4411",
    address: "Mojokerto",
    discountLm: [20, 10, 5],
    discountBr: [12, 5],
    bonusThreshold: 15_000_000,
    accumulatedPaidOmzet: 31_100_000,
    bonusesGranted: 1,
    thresholdHistory: [
      { date: "2026-03-01", previousAmount: 10_000_000, newAmount: 15_000_000, note: "Disesuaikan dengan volume transaksi" }
    ],
    active: true
  }
];

export const productProfiles: ProductProfile[] = [
  { id: "PRD-001", name: "Logam Mulia 1 Gram", type: "LM", stock: 28, costPrice: 1_295_600, basePrice: 1_580_000, active: true },
  { id: "PRD-002", name: "Logam Mulia 0,5 Gram", type: "LM", stock: 41, costPrice: 672_400, basePrice: 820_000, active: true },
  { id: "PRD-003", name: "Gelang Retail A", type: "BR", stock: 15, costPrice: 360_000, basePrice: 475_000, active: true },
  { id: "PRD-004", name: "Kalung Retail B", type: "BR", stock: 9, costPrice: 485_000, basePrice: 625_000, active: true }
];

export const acceptanceBons: AcceptanceBon[] = [
  {
    number: "BON-20260618-014",
    date: "2026-06-18",
    customerCode: "PLG-001",
    description: "Penjualan rutin",
    status: "Piutang",
    shipping: 25_000,
    isBonus: false,
    lines: [
      { productId: "PRD-001", quantity: 1, snapshotCostPrice: 1_295_600, snapshotBasePrice: 1_580_000, snapshotDiscounts: [20, 20, 10] },
      { productId: "PRD-003", quantity: 1, snapshotCostPrice: 360_000, snapshotBasePrice: 475_000, snapshotDiscounts: [10, 5] }
    ]
  },
  {
    number: "BON-20260618-013",
    date: "2026-06-18",
    paymentDate: "2026-06-18",
    customerCode: "PLG-002",
    description: "Transaksi lunas",
    status: "Lunas",
    shipping: 15_000,
    isBonus: false,
    lines: [
      { productId: "PRD-002", quantity: 2, snapshotCostPrice: 672_400, snapshotBasePrice: 820_000, snapshotDiscounts: [15, 10] },
      { productId: "PRD-004", quantity: 2, snapshotCostPrice: 485_000, snapshotBasePrice: 625_000, snapshotDiscounts: [8, 5] }
    ]
  },
  {
    number: "BON-20260617-012",
    date: "2026-06-17",
    customerCode: "PLG-003",
    description: "Penjualan LM",
    status: "Piutang",
    shipping: 0,
    isBonus: false,
    lines: [{ productId: "PRD-002", quantity: 1, snapshotCostPrice: 672_400, snapshotBasePrice: 820_000, snapshotDiscounts: [10, 5] }]
  },
  {
    number: "BON-20260617-011",
    date: "2026-06-17",
    paymentDate: "2026-06-17",
    customerCode: "PLG-004",
    description: "Penjualan BR",
    status: "Lunas",
    shipping: 20_000,
    isBonus: false,
    lines: [
      { productId: "PRD-004", quantity: 4, snapshotCostPrice: 485_000, snapshotBasePrice: 625_000, snapshotDiscounts: [12, 5] },
      { productId: "PRD-003", quantity: 3, snapshotCostPrice: 360_000, snapshotBasePrice: 475_000, snapshotDiscounts: [12, 5] }
    ]
  },
  {
    number: "BON-20260615-010",
    date: "2026-06-15",
    paymentDate: "2026-06-16",
    customerCode: "PLG-001",
    description: "Pembelian gelang",
    status: "Lunas",
    shipping: 10_000,
    isBonus: false,
    lines: [{ productId: "PRD-003", quantity: 2, snapshotCostPrice: 350_000, snapshotBasePrice: 460_000, snapshotDiscounts: [10, 5] }]
  },
  {
    number: "BON-20260614-009",
    date: "2026-06-14",
    customerCode: "PLG-002",
    description: "Tambahan stok toko",
    status: "Piutang",
    shipping: 18_000,
    isBonus: false,
    lines: [{ productId: "PRD-004", quantity: 1, snapshotCostPrice: 480_000, snapshotBasePrice: 610_000, snapshotDiscounts: [8, 5] }]
  },
  {
    number: "BONUS-20260612-004",
    date: "2026-06-12",
    paymentDate: "2026-06-12",
    customerCode: "PLG-004",
    description: "Bonus pelanggan",
    status: "Bonus",
    shipping: 0,
    isBonus: true,
    lines: [{ productId: "PRD-003", quantity: 1, snapshotCostPrice: 350_000, snapshotBasePrice: 460_000, snapshotDiscounts: [12, 5] }]
  },
  {
    number: "BONUS-20260610-003",
    date: "2026-06-10",
    paymentDate: "2026-06-10",
    customerCode: "PLG-001",
    description: "Dua bonus pelanggan",
    status: "Bonus",
    shipping: 0,
    isBonus: true,
    lines: [{ productId: "PRD-003", quantity: 2, snapshotCostPrice: 350_000, snapshotBasePrice: 460_000, snapshotDiscounts: [10, 5] }]
  },
  {
    number: "BON-20260530-008",
    date: "2026-05-30",
    paymentDate: "2026-06-02",
    customerCode: "PLG-001",
    description: "Transaksi akhir Mei",
    status: "Lunas",
    shipping: 12_000,
    isBonus: false,
    lines: [{ productId: "PRD-002", quantity: 2, snapshotCostPrice: 660_000, snapshotBasePrice: 800_000, snapshotDiscounts: [20, 20, 10] }]
  },
  {
    number: "BON-20260528-007",
    date: "2026-05-28",
    customerCode: "PLG-001",
    description: "Piutang akhir Mei",
    status: "Piutang",
    shipping: 8_000,
    isBonus: false,
    lines: [{ productId: "PRD-003", quantity: 1, snapshotCostPrice: 350_000, snapshotBasePrice: 460_000, snapshotDiscounts: [10, 5] }]
  }
];

export const roundToHundred = (value: number) => Math.round(value / 100) * 100;

export const cascadingPrice = (basePrice: number, steps: number[]) =>
  roundToHundred(steps.reduce((price, discount) => price * (1 - discount / 100), basePrice));

export const effectiveDiscount = (steps: number[]) =>
  Math.round((1 - steps.reduce((factor, discount) => factor * (1 - discount / 100), 1)) * 10_000) / 100;

export const bonusesAvailable = (customer: CustomerProfile) =>
  customer.bonusThreshold <= 0
    ? 0
    : Math.max(0, Math.floor(customer.accumulatedPaidOmzet / customer.bonusThreshold) - customer.bonusesGranted);

export const getCustomer = (code: string) =>
  customerProfiles.find((customer) => customer.code === code) ?? customerProfiles[0];

export const getProduct = (id: string) =>
  productProfiles.find((product) => product.id === id) ?? productProfiles[0];

export const calculateBon = (bon: AcceptanceBon) => {
  const customer = getCustomer(bon.customerCode);
  const lineDetails = bon.lines.map((line) => {
    const catalogProduct = getProduct(line.productId);
    const currentDiscounts = catalogProduct.type === "LM" ? customer.discountLm : customer.discountBr;
    const discounts = line.snapshotDiscounts ?? currentDiscounts;
    const costPrice = line.snapshotCostPrice ?? catalogProduct.costPrice;
    const basePrice = line.snapshotBasePrice ?? catalogProduct.basePrice;
    const product = { ...catalogProduct, costPrice, basePrice };
    const discountedUnitPrice = bon.isBonus ? 0 : cascadingPrice(basePrice, discounts);
    const lineOmzet = bon.isBonus ? 0 : discountedUnitPrice * line.quantity;
    const lineProfit = bon.isBonus ? 0 : (discountedUnitPrice - costPrice) * line.quantity;
    const lineBonusCost = bon.isBonus ? costPrice * line.quantity : 0;

    return {
      ...line,
      product,
      discounts,
      discountedUnitPrice,
      lineOmzet,
      lineProfit,
      lineBonusCost,
      usesSnapshot: Boolean(line.snapshotBasePrice || line.snapshotCostPrice || line.snapshotDiscounts)
    };
  });

  const omzet = lineDetails.reduce((sum, line) => sum + line.lineOmzet, 0);
  const profit = lineDetails.reduce((sum, line) => sum + line.lineProfit, 0);
  const bonusCost = lineDetails.reduce((sum, line) => sum + line.lineBonusCost, 0);
  const amountOwed = bon.isBonus ? 0 : omzet + bon.shipping;

  return { customer, lineDetails, omzet, profit, bonusCost, amountOwed, negativeProfit: !bon.isBonus && profit < 0 };
};

export const generateNextBonNumber = (mode: "normal" | "bonus", date: string) => {
  const prefix = mode === "bonus" ? "BONUS" : "BON";
  const compactDate = date.replaceAll("-", "");
  const sameDayNumbers = acceptanceBons
    .filter((bon) => bon.number.startsWith(`${prefix}-${compactDate}-`))
    .map((bon) => Number(bon.number.split("-").at(-1)))
    .filter((value) => Number.isFinite(value));
  const next = Math.max(0, ...sameDayNumbers) + 1;
  return `${prefix}-${compactDate}-${String(next).padStart(3, "0")}`;
};

export const toDisplayDate = (isoDate?: string) => {
  if (!isoDate) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${isoDate}T00:00:00`));
};

export const currentIsoDate = () => new Date().toISOString().slice(0, 10);
