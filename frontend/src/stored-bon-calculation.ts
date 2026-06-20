import type { StoredBon, StoredCustomer, StoredProduct } from "./store";
import { roundToHundred } from "./acceptance-data";

export function calculateStoredBon(bon: StoredBon, customers: StoredCustomer[], products: StoredProduct[]) {
  const customer = customers.find((entry) => entry.code === bon.customerCode) ?? historicalCustomer(bon.customerCode);
  const lineDetails = bon.lines.map((line) => {
    const catalog = products.find((entry) => entry.id === line.productId || entry.backendId === line.backendProductId);
    const productType = line.snapshotProductType ?? catalog?.type ?? "BR";
    const costPrice = line.snapshotCostPrice ?? catalog?.costPrice ?? 0;
    const basePrice = line.snapshotBasePrice ?? catalog?.basePrice ?? 0;
    const discounts = line.snapshotDiscounts ?? (productType === "LM" ? customer.discountLm : customer.discountBr);
    const product = {
      id: catalog?.id ?? line.productId,
      name: line.snapshotProductName ?? catalog?.name ?? "Produk historis",
      type: productType,
      stock: catalog?.stock ?? 0,
      costPrice,
      basePrice,
      active: catalog?.active ?? false
    };
    const discountedUnitPrice = bon.isBonus ? 0 : roundToHundred(discounts.reduce(
      (price, discount) => Math.floor(price * (100 - discount) / 100),
      basePrice
    ));
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
      usesSnapshot: Boolean(line.snapshotBasePrice !== undefined || line.snapshotCostPrice !== undefined || line.snapshotDiscounts || line.snapshotProductName || line.snapshotProductType)
    };
  });

  const omzet = lineDetails.reduce((sum, line) => sum + line.lineOmzet, 0);
  const profit = lineDetails.reduce((sum, line) => sum + line.lineProfit, 0);
  const bonusCost = lineDetails.reduce((sum, line) => sum + line.lineBonusCost, 0);
  const amountOwed = bon.isBonus ? 0 : omzet + bon.shipping;

  return { customer, lineDetails, omzet, profit, bonusCost, amountOwed, negativeProfit: !bon.isBonus && profit < 0 };
}

function historicalCustomer(code: string): StoredCustomer {
  return {
    code,
    name: "Pelanggan historis",
    phone: "",
    address: "",
    discountLm: [],
    discountBr: [],
    bonusThreshold: 0,
    accumulatedPaidOmzet: 0,
    bonusesGranted: 0,
    thresholdHistory: [],
    active: false
  };
}
