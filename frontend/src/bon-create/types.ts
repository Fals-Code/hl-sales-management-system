import type { AcceptanceBonLine } from "../acceptance-data";
import type { StoredBon } from "../store";

export type Mode = "normal" | "bonus";
export type ApiBon = { id: string; bonNumber: string };

export type LineCalculation = {
  line: AcceptanceBonLine;
  productName: string;
  productCode: string;
  productType: string;
  discounts: number[];
  stock: number;
  unitPrice: number;
  subtotal: number;
  profit: number;
  invalidStock: boolean;
};

export type StoredDraft = {
  version: 1;
  savedAt: number;
  mode: Mode;
  date: string;
  number: string;
  customerCode: string;
  description: string;
  shipping: number;
  lines: AcceptanceBonLine[];
};

export type BonCalculation = {
  omzet: number;
  profit: number;
  shipping: number;
  total: number;
  quantity: number;
};

export type SavedBonSnapshot = {
  bon: StoredBon;
  customerName: string;
  lines: LineCalculation[];
  total: number;
};
