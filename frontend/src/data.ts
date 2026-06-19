import { BarChart3, CircleDollarSign, HandCoins, Home, ReceiptText, ShoppingBag, Users, WalletCards, Gift } from "lucide-react";

export type PageKey = "dashboard" | "customers" | "products" | "bons" | "create-bon" | "receivables" | "settlements" | "bonus" | "reports" | "settings";
export type BonStatus = "Belum Lunas" | "Lunas" | "Dibatalkan";

export type BonRow = {
  number: string;
  customer: string;
  date: string;
  amount: number;
  status: BonStatus;
};

export const navigation = [
  { key: "dashboard" as const, label: "Beranda", icon: Home },
  { key: "customers" as const, label: "Pelanggan", icon: Users },
  { key: "products" as const, label: "Produk", icon: ShoppingBag },
  { key: "bons" as const, label: "Bon", icon: ReceiptText },
  { key: "receivables" as const, label: "Piutang", icon: WalletCards },
  { key: "settlements" as const, label: "Pelunasan", icon: HandCoins },
  { key: "bonus" as const, label: "Bonus", icon: Gift },
  { key: "reports" as const, label: "Laporan", icon: BarChart3 }
];

export const summaryCards = [
  { label: "Total Piutang", value: 12500000, helper: "15 bon belum lunas", icon: WalletCards, tone: "blue" },
  { label: "Pembayaran Bulan Ini", value: 28750000, helper: "Naik 12% dari bulan lalu", icon: HandCoins, tone: "green" },
  { label: "Omzet Bulan Ini", value: 31200000, helper: "LM Rp18,4 jt · BR Rp12,8 jt", icon: CircleDollarSign, tone: "violet" },
  { label: "Laba HL Bulan Ini", value: 5450000, helper: "17,5% dari omzet produk", icon: BarChart3, tone: "orange" }
];

export const bons: BonRow[] = [
  { number: "BON-20260618-014", customer: "Toko Sinar Abadi", date: "18 Jun 2026", amount: 1250000, status: "Belum Lunas" },
  { number: "BON-20260618-013", customer: "CV Berkah Jaya", date: "18 Jun 2026", amount: 2860000, status: "Lunas" },
  { number: "BON-20260617-012", customer: "Toko Maju Lancar", date: "17 Jun 2026", amount: 780000, status: "Belum Lunas" },
  { number: "BON-20260617-011", customer: "UD Makmur", date: "17 Jun 2026", amount: 4120000, status: "Lunas" }
];

export const customers = [
  { name: "Toko Sinar Abadi", code: "PLG-001", receivable: 3250000, bonus: 2 },
  { name: "CV Berkah Jaya", code: "PLG-002", receivable: 0, bonus: 1 },
  { name: "Toko Maju Lancar", code: "PLG-003", receivable: 780000, bonus: 0 },
  { name: "UD Makmur", code: "PLG-004", receivable: 1500000, bonus: 3 }
];

export const products = [
  { name: "Logam Mulia 1 Gram", type: "LM", stock: 28, price: 1580000 },
  { name: "Logam Mulia 0,5 Gram", type: "LM", stock: 41, price: 820000 },
  { name: "Gelang Retail A", type: "BR", stock: 15, price: 475000 },
  { name: "Kalung Retail B", type: "BR", stock: 9, price: 625000 }
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
