export type ProductType = "LM" | "BR";
export type AcceptanceBonStatus = "Piutang" | "Lunas" | "Void" | "Bonus";

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
    accumulatedPaidOmzet: 25_000_000,
    bonusesGranted: 0,
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
    accumulatedPaidOmzet: 24_100_000,
    bonusesGranted: 0,
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
    lines: [{ productId: "PRD-001", quantity: 1 }, { productId: "PRD-003", quantity: 1 }]
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
    lines: [{ productId: "PRD-002", quantity: 2 }, { productId: "PRD-004", quantity: 2 }]
  },
  {
    number: "BON-20260617-012",
    date: "2026-06-17",
    customerCode: "PLG-003",
    description: "Penjualan LM",
    status: "Piutang",
    shipping: 0,
    isBonus: false,
    lines: [{ productId: "PRD-002", quantity: 1 }]
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
    lines: [{ productId: "PRD-004", quantity: 4 }, { productId: "PRD-003", quantity: 3 }]
  },
  {
    number: "BONUS-20260610-003",
    date: "2026-06-10",
    paymentDate: "2026-06-10",
    customerCode: "PLG-001",
    description: "Bonus pelanggan",
    status: "Bonus",
    shipping: 0,
    isBonus: true,
    lines: [{ productId: "PRD-003", quantity: 2 }]
  }
];

export const roundToHundred = (value: number) => Math.round(value / 100) * 100;

export const cascadingPrice = (basePrice: number, steps: number[]) =>
  roundToHundred(steps.reduce((price, discount) => price * (1 - discount / 100), basePrice));

export const effectiveDiscount = (steps: number[]) =>
  Math.round((1 - steps.reduce((factor, discount) => factor * (1 - discount / 100), 1)) * 10_000) / 100;

export const bonusesAvailable = (customer: CustomerProfile) =>
  Math.max(0, Math.floor(customer.accumulatedPaidOmzet / customer.bonusThreshold) - customer.bonusesGranted);

export const getCustomer = (code: string) =>
  customerProfiles.find((customer) => customer.code === code) ?? customerProfiles[0];

export const getProduct = (id: string) =>
  productProfiles.find((product) => product.id === id) ?? productProfiles[0];

export const calculateBon = (bon: AcceptanceBon) => {
  const customer = getCustomer(bon.customerCode);
  const lineDetails = bon.lines.map((line) => {
    const product = getProduct(line.productId);
    const discounts = product.type === "LM" ? customer.discountLm : customer.discountBr;
    const discountedUnitPrice = bon.isBonus ? 0 : cascadingPrice(product.basePrice, discounts);
    const lineOmzet = bon.isBonus ? 0 : discountedUnitPrice * line.quantity;
    const lineProfit = bon.isBonus ? 0 : (discountedUnitPrice - product.costPrice) * line.quantity;

    return {
      ...line,
      product,
      discounts,
      discountedUnitPrice,
      lineOmzet,
      lineProfit
    };
  });

  const omzet = lineDetails.reduce((sum, line) => sum + line.lineOmzet, 0);
  const profit = lineDetails.reduce((sum, line) => sum + line.lineProfit, 0);
  const amountOwed = bon.isBonus ? 0 : omzet + bon.shipping;

  return { customer, lineDetails, omzet, profit, amountOwed };
};

export const toDisplayDate = (isoDate?: string) => {
  if (!isoDate) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${isoDate}T00:00:00`));
};

export const currentIsoDate = () => new Date().toISOString().slice(0, 10);
