import { BonItemKindValue, ITEM_KIND, ProductTypeValue, PRODUCT_TYPE } from "./constants";
import { assertNonNegativeMoney, assertPercentBps, assertPositiveQuantity } from "./validation";

export type DiscountTierInput = {
  sequence: number;
  percentBps: number;
};

export type CalculateItemInput = {
  productId?: string;
  productName: string;
  productType: ProductTypeValue;
  costPrice: number;
  basePrice: number;
  quantity: number;
  kind?: BonItemKindValue;
  discounts?: DiscountTierInput[];
};

export type CalculatedItem = {
  productId?: string;
  kind: BonItemKindValue;
  productNameSnapshot: string;
  productTypeSnapshot: ProductTypeValue;
  costPriceSnapshot: number;
  basePriceSnapshot: number;
  discountSnapshot: DiscountTierInput[];
  priceAfterDiscount: number;
  finalPrice: number;
  quantity: number;
  subtotal: number;
  profitAmount: number;
  isBonus: boolean;
};

export type CalculatedBon = {
  items: CalculatedItem[];
  shippingCost: number;
  totalBeforeDiscount: number;
  totalAfterDiscount: number;
  totalAmount: number;
  revenueLm: number;
  revenueBr: number;
  profitAmount: number;
  bonusCost: number;
  hasNegativeProfit: boolean;
};

export function roundToNearestHundred(amount: number): number {
  assertNonNegativeMoney(amount, "amount");
  return Math.floor((amount + 50) / 100) * 100;
}

export function applyCascadingDiscount(basePrice: number, discounts: DiscountTierInput[] = []): number {
  assertNonNegativeMoney(basePrice, "basePrice");
  return [...discounts]
    .sort((a, b) => a.sequence - b.sequence)
    .reduce((current, tier) => {
      assertPercentBps(tier.percentBps);
      return Math.floor((current * (10000 - tier.percentBps)) / 10000);
    }, basePrice);
}

export function calculateItem(input: CalculateItemInput): CalculatedItem {
  assertNonNegativeMoney(input.costPrice, "costPrice");
  assertNonNegativeMoney(input.basePrice, "basePrice");
  assertPositiveQuantity(input.quantity);

  const kind = input.kind ?? ITEM_KIND.REGULER;
  const isBonus = kind === ITEM_KIND.BONUS;
  const discountSnapshot = isBonus ? [] : [...(input.discounts ?? [])].sort((a, b) => a.sequence - b.sequence);
  const priceAfterDiscount = isBonus ? 0 : applyCascadingDiscount(input.basePrice, discountSnapshot);
  const finalPrice = isBonus ? 0 : roundToNearestHundred(priceAfterDiscount);
  const subtotal = finalPrice * input.quantity;
  const profitAmount = isBonus ? 0 : (finalPrice - input.costPrice) * input.quantity;

  return {
    productId: input.productId,
    kind,
    productNameSnapshot: input.productName,
    productTypeSnapshot: input.productType,
    costPriceSnapshot: input.costPrice,
    basePriceSnapshot: input.basePrice,
    discountSnapshot,
    priceAfterDiscount,
    finalPrice,
    quantity: input.quantity,
    subtotal,
    profitAmount,
    isBonus
  };
}

export function calculateBon(items: CalculateItemInput[], shippingCost = 0): CalculatedBon {
  assertNonNegativeMoney(shippingCost, "shippingCost");
  const calculatedItems = items.map(calculateItem);
  const totalBeforeDiscount = calculatedItems.reduce((sum, item) => {
    if (item.isBonus) return sum;
    return sum + item.basePriceSnapshot * item.quantity;
  }, 0);
  const totalAfterDiscount = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalAmount = totalAfterDiscount + shippingCost;
  const revenueLm = calculatedItems.reduce((sum, item) => {
    if (item.isBonus || item.productTypeSnapshot !== PRODUCT_TYPE.LM) return sum;
    return sum + item.subtotal;
  }, 0);
  const revenueBr = calculatedItems.reduce((sum, item) => {
    if (item.isBonus || item.productTypeSnapshot !== PRODUCT_TYPE.BR) return sum;
    return sum + item.subtotal;
  }, 0);
  const profitAmount = calculatedItems.reduce((sum, item) => sum + item.profitAmount, 0);
  const bonusCost = calculatedItems.reduce((sum, item) => {
    if (!item.isBonus) return sum;
    return sum + item.costPriceSnapshot * item.quantity;
  }, 0);

  return {
    items: calculatedItems,
    shippingCost,
    totalBeforeDiscount,
    totalAfterDiscount,
    totalAmount,
    revenueLm,
    revenueBr,
    profitAmount,
    bonusCost,
    hasNegativeProfit: profitAmount < 0
  };
}
