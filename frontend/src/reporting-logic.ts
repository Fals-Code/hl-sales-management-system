import type { ProductType } from "./acceptance-data";
import type { StoredBon, StoredCustomer, StoredProduct } from "./store";

export type ReportScope = "ALL" | ProductType;

export function reportDateFor(bon: StoredBon) {
  if (bon.status === "Piutang") return bon.date;
  if (bon.status === "Lunas") return bon.paymentDate;
  return bon.paymentDate ?? bon.date;
}

export function calculateScoped(bon: StoredBon, scope: ReportScope, customers: StoredCustomer[], products: StoredProduct[]) {
  const customer = customers.find((item) => item.code === bon.customerCode);
  const values = bon.lines.reduce((result, line) => {
    const product = products.find((item) => item.id === line.productId);
    const productType = line.snapshotProductType ?? product?.type;
    if (!product || !customer || !productType || (scope !== "ALL" && productType !== scope)) return result;
    const base = line.snapshotBasePrice ?? product.basePrice;
    const cost = line.snapshotCostPrice ?? product.costPrice;
    const discounts = line.snapshotDiscounts ?? (productType === "LM" ? customer.discountLm : customer.discountBr);
    const unit = bon.isBonus ? 0 : roundHundred(discounts.reduce((price, discount) => Math.floor(price * (100 - discount) / 100), base));
    const lineOmzet = unit * line.quantity;
    result.omzet += lineOmzet;
    result.profit += bon.isBonus ? 0 : (unit - cost) * line.quantity;
    result.bonusCost += bon.isBonus ? cost * line.quantity : 0;
    result[productType === "LM" ? "lm" : "br"] += lineOmzet;
    return result;
  }, { omzet: 0, profit: 0, bonusCost: 0, lm: 0, br: 0 });
  const shipping = scope === "ALL" && !bon.isBonus ? bon.shipping : 0;
  return { ...values, total: bon.isBonus ? 0 : values.omzet + shipping };
}

export const roundHundred = (value: number) => Math.floor((value + 50) / 100) * 100;
