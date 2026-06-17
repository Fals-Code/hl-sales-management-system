import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { AuthService } from "./authService";
import { BonusService } from "./bonusService";
import { AUTHORIZATION_TYPE } from "../domain/constants";
import { BusinessError } from "../domain/errors";
import { toDbMoney, toSafeMoneyNumber } from "../domain/money";

export class SettlementService {
  constructor(private readonly db: PrismaClient, private readonly auth: AuthService) {}

  async settleBons(input: { customerId: string; bonIds: string[]; paidAt?: Date }) {
    return this.db.$transaction(async (tx) => {
      if (!input.bonIds.length) throw new BusinessError("At least one Bon is required.");
      const bons = await tx.bon.findMany({ where: { id: { in: input.bonIds }, customerId: input.customerId } });
      if (bons.length !== new Set(input.bonIds).size) throw new BusinessError("One or more Bon records are invalid.");
      for (const bon of bons) {
        if (bon.status !== "PIUTANG" || bon.deletedAt) throw new BusinessError("Only active Piutang Bon can be settled.");
      }

      const totals = bons.reduce(
        (acc, bon) => ({
          amount: acc.amount + toSafeMoneyNumber(bon.totalAmount, "totalAmount"),
          lm: acc.lm + toSafeMoneyNumber(bon.revenueLm, "revenueLm"),
          br: acc.br + toSafeMoneyNumber(bon.revenueBr, "revenueBr"),
          profit: acc.profit + toSafeMoneyNumber(bon.profitAmount, "profitAmount"),
          bonusCost: acc.bonusCost + toSafeMoneyNumber(bon.bonusCost, "bonusCost")
        }),
        { amount: 0, lm: 0, br: 0, profit: 0, bonusCost: 0 }
      );

      const payment = await tx.payment.create({
        data: {
          paymentNumber: await uniquePaymentNumber(tx),
          customerId: input.customerId,
          paidAt: input.paidAt ?? new Date(),
          totalAmount: toDbMoney(totals.amount, "totalAmount"),
          historicalPaymentAmount: toDbMoney(totals.amount, "historicalPaymentAmount"),
          activePaymentAmount: toDbMoney(totals.amount, "activePaymentAmount"),
          revenueLm: toDbMoney(totals.lm, "revenueLm"),
          revenueBr: toDbMoney(totals.br, "revenueBr"),
          profitAmount: toDbMoney(totals.profit, "profitAmount"),
          bonusCost: toDbMoney(totals.bonusCost, "bonusCost"),
          bons: {
            create: bons.map((bon) => ({
              bonId: bon.id,
              amount: bon.totalAmount,
              allocatedInvoiceAmount: bon.totalAmount,
              allocatedProductRevenue: bon.revenueLm + bon.revenueBr,
              allocatedShipping: bon.shippingCost,
              allocatedProfit: bon.profitAmount
            }))
          }
        }
      });
      const updated = await tx.bon.updateMany({
        where: { id: { in: input.bonIds }, status: "PIUTANG", deletedAt: null },
        data: { status: "LUNAS", settledAt: input.paidAt ?? new Date() }
      });
      if (updated.count !== input.bonIds.length) {
        throw new BusinessError("Settlement failed because one or more Bon records changed state.");
      }
      await new BonusService(tx).recordEarnedForSettlement({
        customerId: input.customerId,
        paymentId: payment.id,
        reason: "Bonus units earned from settled turnover"
      });
      return tx.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { bons: true } });
    });
  }

  async settleMonthly(input: { customerId: string; month: number; year: number; paidAt?: Date }) {
    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      throw new BusinessError("Month must be between 1 and 12.");
    }
    const from = new Date(Date.UTC(input.year, input.month - 1, 1));
    const to = new Date(Date.UTC(input.year, input.month, 1));
    const bons = await this.db.bon.findMany({
      where: {
        customerId: input.customerId,
        status: "PIUTANG",
        deletedAt: null,
        bonDate: { gte: from, lt: to }
      },
      orderBy: { bonDate: "asc" }
    });
    if (!bons.length) throw new BusinessError("No active Piutang Bon found for the requested month.");
    return this.settleBons({ customerId: input.customerId, bonIds: bons.map((bon) => bon.id), paidAt: input.paidAt });
  }

  async cancelPayment(input: { paymentId: string; userId: string; ownerPin: string; reason: string }) {
    return this.db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { bons: true } });
      if (!payment) throw new BusinessError("Payment not found.");
      if (payment.canceledAt) throw new BusinessError("Payment has already been canceled.");
      const scopedAuth = new AuthService(tx as unknown as PrismaClient);
      const authorization = await scopedAuth.authorizeOwner({
        userId: input.userId,
        ownerPin: input.ownerPin,
        type: AUTHORIZATION_TYPE.CANCEL_PAYMENT,
        reason: input.reason,
        context: { paymentId: payment.id }
      });
      const bonIds = payment.bons.map((link) => link.bonId);
      const activeBons = await tx.bon.findMany({ where: { id: { in: bonIds } } });
      if (activeBons.some((bon) => bon.status === "VOID")) {
        throw new BusinessError("Payment with a Void Bon cannot be canceled through regular payment cancellation.");
      }
      if (activeBons.some((bon) => bon.status !== "LUNAS")) {
        throw new BusinessError("Only currently paid Bon can be restored to Piutang.");
      }
      const canceled = await tx.payment.updateMany({
        where: { id: payment.id, canceledAt: null },
        data: { canceledAt: new Date(), cancelReason: input.reason, canceledById: input.userId, cancelAuthorizationId: authorization.id }
      });
      if (canceled.count !== 1) throw new BusinessError("Payment has already been canceled.");
      const restored = await tx.bon.updateMany({
        where: { id: { in: bonIds }, status: "LUNAS" },
        data: { status: "PIUTANG", settledAt: null }
      });
      if (restored.count !== bonIds.length) {
        throw new BusinessError("Payment cancellation failed because one or more Bon records changed state.");
      }
      await new BonusService(tx).reverseEarnedForPayment({
        customerId: payment.customerId,
        paymentId: payment.id,
        reason: "Settlement canceled"
      });
      await tx.paymentBon.updateMany({
        where: { paymentId: payment.id, reversedAt: null },
        data: { reversedAt: new Date() }
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { activePaymentAmount: 0 }
      });
      return tx.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { bons: true } });
    });
  }
}

async function uniquePaymentNumber(tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const value = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const existing = await tx.payment.findUnique({ where: { paymentNumber: value } });
    if (!existing) return value;
  }
  throw new BusinessError("Unable to generate unique payment number.");
}
