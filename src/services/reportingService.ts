import { Prisma, PrismaClient } from "@prisma/client";
import { PRODUCT_TYPE } from "../domain/constants";
import { BonusService } from "./bonusService";
import { toSafeMoneyNumber } from "../domain/money";

export type ReportFilters = {
  customerId?: string;
  month?: number;
  year?: number;
  productType?: "LM" | "BR";
  status?: "PIUTANG" | "LUNAS" | "VOID";
  hasNegativeProfit?: boolean;
  bonDateFrom?: Date;
  bonDateTo?: Date;
  paidAtFrom?: Date;
  paidAtTo?: Date;
};

export class ReportingService {
  constructor(private readonly db: PrismaClient) {}

  async overall(filters: ReportFilters = {}) {
    const voidWhere = buildBonWhere({ ...filters, status: "VOID" }, "bon");

    const [totalPiutang, activeAllocations, historicalPayments, activeBonusCost, voidCount, canceledPaymentCount, negativeCount, usedUnits] = await Promise.all([
      this.getPiutangTotal(filters),
      this.db.paymentBon.findMany({ where: buildPaymentBonWhere(filters), include: { bon: { include: { items: true } }, payment: true } }),
      this.db.payment.aggregate({ where: buildPaymentWhere(filters, true), _sum: { historicalPaymentAmount: true } }),
      this.getActiveBonusCost(filters),
      this.db.bon.count({ where: voidWhere }),
      this.db.payment.count({ where: { ...buildPaymentWhere(filters, true), canceledAt: { not: null } } }),
      this.db.bon.count({ where: { ...buildBonWhere(filters, "bon"), hasNegativeProfit: true, deletedAt: null } }),
      this.getNetUsedBonusUnits(filters)
    ]);

    const paid = summarizeAllocations(activeAllocations, filters.productType);
    return {
      totalPiutang,
      historicalPaymentAmount: filters.productType ? paid.totalAmount : toSafeMoneyNumber(historicalPayments._sum.historicalPaymentAmount, "historicalPaymentAmount"),
      activePaymentAmount: paid.totalAmount,
      totalPaid: paid.totalAmount,
      totalRevenue: paid.revenueLm + paid.revenueBr,
      totalRevenueLm: paid.revenueLm,
      totalRevenueBr: paid.revenueBr,
      totalProfit: paid.profitAmount,
      totalShipping: paid.shippingCost,
      totalBonusGiven: usedUnits,
      totalBonusCost: activeBonusCost,
      negativeProfitTransactions: negativeCount,
      voidBonCount: voidCount,
      canceledPaymentCount
    };
  }

  async byCustomer(customerId: string, filters: ReportFilters = {}) {
    const customerFilters = { ...filters, customerId };
    const [totalBon, totalPiutang, activeAllocations, activeBonusCost, negativeCount, bonus] = await Promise.all([
      this.db.bon.count({ where: buildBonWhere(customerFilters, "bon") }),
      this.getPiutangTotal(customerFilters),
      this.db.paymentBon.findMany({ where: buildPaymentBonWhere(customerFilters), include: { bon: { include: { items: true } }, payment: true } }),
      this.getActiveBonusCost(customerFilters),
      this.db.bon.count({ where: { ...buildBonWhere(customerFilters, "bon"), hasNegativeProfit: true } }),
      new BonusService(this.db).getAvailability(customerId)
    ]);
    const paid = summarizeAllocations(activeAllocations, filters.productType);
    return {
      customerId,
      totalBon,
      totalPiutang,
      totalPaid: paid.totalAmount,
      totalRevenue: paid.revenueLm + paid.revenueBr,
      totalRevenueLm: paid.revenueLm,
      totalRevenueBr: paid.revenueBr,
      totalProfit: paid.profitAmount,
      totalShipping: paid.shippingCost,
      bonusAvailable: bonus.availableUnits,
      bonusEntitled: bonus.entitledUnits,
      bonusAlreadyGiven: bonus.usedUnits,
      totalBonusCost: activeBonusCost,
      negativeProfitTransactions: negativeCount
    };
  }

  async lmRecap(filters: ReportFilters = {}) {
    return this.productTypeRecap(PRODUCT_TYPE.LM, filters);
  }

  async brRecap(filters: ReportFilters = {}) {
    return this.productTypeRecap(PRODUCT_TYPE.BR, filters);
  }

  async productTypeRecap(productType: "LM" | "BR", filters: ReportFilters = {}) {
    const items = await this.db.bonItem.findMany({
      where: {
        isBonus: false,
        productTypeSnapshot: productType,
        bon: buildBonWhere({ ...filters, status: "LUNAS" }, "paid")
      },
      include: { bon: true }
    });
    return {
      productType,
      revenue: items.reduce((sum, item) => sum + toSafeMoneyNumber(item.subtotal, "subtotal"), 0),
      profit: items.reduce((sum, item) => sum + toSafeMoneyNumber(item.profitAmount, "profitAmount"), 0),
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      bonCount: new Set(items.map((item) => item.bonId)).size
    };
  }

  async negativeProfitTransactions(filters: ReportFilters = {}) {
    return this.db.bon.findMany({
      where: { ...buildBonWhere(filters, "bon"), hasNegativeProfit: true, deletedAt: null },
      include: { items: true, customer: true },
      orderBy: { bonDate: "desc" }
    });
  }

  async transactionRows(filters: ReportFilters = {}) {
    const rows = await this.db.bon.findMany({
      where: buildBonWhere(filters, "bon"),
      include: { customer: true, items: true, paymentLinks: { include: { payment: true } }, voidRecord: true },
      orderBy: [{ bonDate: "desc" }, { bonNumber: "desc" }]
    });
    return rows.map((bon) => ({
      ...bon,
      status: bon.status !== "VOID" && bon.items.length > 0 && bon.items.every((item) => item.isBonus)
        ? "BONUS"
        : bon.status
    }));
  }

  async receivableRows(filters: ReportFilters = {}) {
    return this.transactionRows({ ...filters, status: "PIUTANG" });
  }

  async bonusLogRows(filters: ReportFilters = {}) {
    const createdAt = buildDateRange(filters.paidAtFrom ?? filters.bonDateFrom, filters.paidAtTo ?? filters.bonDateTo)
      ?? (filters.month && filters.year ? monthRange(filters.month, filters.year) : undefined);
    return this.db.bonusLedger.findMany({
      where: {
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(createdAt ? { createdAt } : {})
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });
  }

  private async getPiutangTotal(filters: ReportFilters) {
    const where = buildBonWhere({ ...filters, status: "PIUTANG" }, "bon");
    if (!filters.productType) {
      const result = await this.db.bon.aggregate({ where, _sum: { totalAmount: true } });
      return toSafeMoneyNumber(result._sum.totalAmount, "totalPiutang");
    }
    const result = await this.db.bonItem.aggregate({
      where: {
        isBonus: false,
        productTypeSnapshot: filters.productType,
        bon: where
      },
      _sum: { subtotal: true }
    });
    return toSafeMoneyNumber(result._sum.subtotal, "totalPiutangScoped");
  }

  private async getActiveBonusCost(filters: ReportFilters) {
    if (filters.status === "VOID") return 0;
    const bonDate = buildDateRange(filters.bonDateFrom, filters.bonDateTo)
      ?? (filters.month && filters.year ? monthRange(filters.month, filters.year) : undefined);
    const items = await this.db.bonItem.findMany({
      where: {
        isBonus: true,
        ...(filters.productType ? { productTypeSnapshot: filters.productType } : {}),
        bon: {
          deletedAt: null,
          ...(filters.status ? { status: filters.status } : { status: { not: "VOID" } }),
          ...(filters.customerId ? { customerId: filters.customerId } : {}),
          ...(bonDate ? { bonDate } : {})
        }
      },
      select: { costPriceSnapshot: true, quantity: true }
    });
    return items.reduce(
      (sum, item) => sum + toSafeMoneyNumber(item.costPriceSnapshot, "costPriceSnapshot") * item.quantity,
      0
    );
  }

  private async getNetUsedBonusUnits(filters: ReportFilters) {
    const createdAt = buildDateRange(filters.paidAtFrom ?? filters.bonDateFrom, filters.paidAtTo ?? filters.bonDateTo)
      ?? (filters.month && filters.year ? monthRange(filters.month, filters.year) : undefined);
    const ledgers = await this.db.bonusLedger.findMany({
      where: {
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        mutationType: { in: ["USED", "REVERSED"] },
        ...(createdAt ? { createdAt } : {})
      }
    });
    const usedIds = new Set(ledgers.filter((ledger) => ledger.mutationType === "USED").map((ledger) => ledger.id));
    return ledgers.reduce((sum, ledger) => {
      if (ledger.mutationType === "USED") return sum + Math.abs(ledger.amount);
      if (ledger.reversalOfId && usedIds.has(ledger.reversalOfId)) return sum - Math.abs(ledger.amount);
      return sum;
    }, 0);
  }
}

type AllocationForSummary = {
  allocatedInvoiceAmount: bigint;
  allocatedProductRevenue: bigint;
  allocatedShipping: bigint;
  allocatedProfit: bigint;
  bon: {
    revenueLm: bigint;
    revenueBr: bigint;
    bonusCost: bigint;
    items: Array<{
      productTypeSnapshot: string;
      subtotal: bigint;
      profitAmount: bigint;
      costPriceSnapshot: bigint;
      quantity: number;
      isBonus: boolean;
    }>;
  };
};

function summarizeAllocations(allocations: AllocationForSummary[], productType?: "LM" | "BR") {
  return allocations.reduce(
    (acc, allocation) => {
      const scopedItems = allocation.bon.items.filter((item) => !productType || item.productTypeSnapshot === productType);
      const regularItems = scopedItems.filter((item) => !item.isBonus);
      const bonusItems = scopedItems.filter((item) => item.isBonus);
      const revenueLm = regularItems
        .filter((item) => item.productTypeSnapshot === PRODUCT_TYPE.LM)
        .reduce((sum, item) => sum + toSafeMoneyNumber(item.subtotal, "subtotal"), 0);
      const revenueBr = regularItems
        .filter((item) => item.productTypeSnapshot === PRODUCT_TYPE.BR)
        .reduce((sum, item) => sum + toSafeMoneyNumber(item.subtotal, "subtotal"), 0);
      const scopedProfit = regularItems.reduce((sum, item) => sum + toSafeMoneyNumber(item.profitAmount, "profitAmount"), 0);
      const scopedBonusCost = bonusItems.reduce(
        (sum, item) => sum + toSafeMoneyNumber(item.costPriceSnapshot, "costPriceSnapshot") * item.quantity,
        0
      );
      return {
        totalAmount: acc.totalAmount + (productType
          ? revenueLm + revenueBr
          : toSafeMoneyNumber(allocation.allocatedInvoiceAmount, "allocatedInvoiceAmount")),
        revenueLm: acc.revenueLm + revenueLm,
        revenueBr: acc.revenueBr + revenueBr,
        profitAmount: acc.profitAmount + (productType
          ? scopedProfit
          : toSafeMoneyNumber(allocation.allocatedProfit, "allocatedProfit")),
        shippingCost: acc.shippingCost + (productType
          ? 0
          : toSafeMoneyNumber(allocation.allocatedShipping, "allocatedShipping")),
        bonusCost: acc.bonusCost + (productType
          ? scopedBonusCost
          : toSafeMoneyNumber(allocation.bon.bonusCost, "bonusCost"))
      };
    },
    { totalAmount: 0, revenueLm: 0, revenueBr: 0, profitAmount: 0, shippingCost: 0, bonusCost: 0 }
  );
}

function buildPaymentBonWhere(filters: ReportFilters): Prisma.PaymentBonWhereInput {
  const bonFilters: ReportFilters = { ...filters, month: undefined, year: undefined, status: "LUNAS" };
  return {
    reversedAt: null,
    payment: buildPaymentWhere(filters, false),
    bon: buildBonWhere(bonFilters, "bon")
  };
}

function buildPaymentWhere(filters: ReportFilters, includeCanceled: boolean): Prisma.PaymentWhereInput {
  const paidAtRange = buildDateRange(filters.paidAtFrom, filters.paidAtTo) ?? (filters.month && filters.year ? monthRange(filters.month, filters.year) : undefined);
  return {
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(includeCanceled ? {} : { canceledAt: null }),
    ...(paidAtRange ? { paidAt: paidAtRange } : {})
  };
}

function buildBonWhere(filters: ReportFilters, mode: "bon" | "paid"): Prisma.BonWhereInput {
  const where: Prisma.BonWhereInput = { deletedAt: null };
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.status) where.status = filters.status;
  if (filters.hasNegativeProfit !== undefined) where.hasNegativeProfit = filters.hasNegativeProfit;
  const bonDateRange = buildDateRange(filters.bonDateFrom, filters.bonDateTo);
  if (bonDateRange) where.bonDate = bonDateRange;
  if (filters.month && filters.year && mode === "bon") {
    where.bonDate = monthRange(filters.month, filters.year);
  }
  if (filters.productType) {
    where.items = { some: { productTypeSnapshot: filters.productType, isBonus: false } };
  }
  const paidAtRange = buildDateRange(filters.paidAtFrom, filters.paidAtTo) ?? (filters.month && filters.year && mode === "paid" ? monthRange(filters.month, filters.year) : undefined);
  if (mode === "paid" && paidAtRange) {
    where.paymentLinks = { some: { payment: { paidAt: paidAtRange, canceledAt: null } } };
  }
  if (mode === "paid" && !paidAtRange) {
    where.paymentLinks = { some: { payment: { canceledAt: null } } };
  }
  return where;
}

function buildDateRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
}

function monthRange(month: number, year: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1))
  };
}
