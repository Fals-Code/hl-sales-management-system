import { Prisma, PrismaClient } from "@prisma/client";
import { BONUS_MUTATION } from "../domain/constants";
import { BusinessError } from "../domain/errors";
import { toDbMoney, toSafeMoneyNumber } from "../domain/money";

type Db = PrismaClient | Prisma.TransactionClient;
type BonusMutation = (typeof BONUS_MUTATION)[keyof typeof BONUS_MUTATION];

export class BonusService {
  constructor(private readonly db: Db) {}

  async getBalance(customerId: string) {
    return (await this.getAvailability(customerId)).availableUnits;
  }

  async getAvailability(customerId: string) {
    const customer = await this.db.customer.findUniqueOrThrow({ where: { id: customerId } });
    const totalSettledRevenue = await this.getActiveSettledRevenue(customerId);
    const threshold = toSafeMoneyNumber(customer.bonusThreshold, "bonusThreshold");
    const entitledUnits = await this.getNetEarnedLedgerUnits(customerId);
    const ledgers = await this.db.bonusLedger.findMany({ where: { customerId }, orderBy: { createdAt: "asc" } });
    const ledgerBalance = ledgers.reduce((sum, ledger) => sum + ledger.amount, 0);
    const usedUnits = ledgers.reduce((sum, ledger) => {
      if (ledger.mutationType === BONUS_MUTATION.USED) return sum + Math.abs(ledger.amount);
      if (ledger.mutationType === BONUS_MUTATION.REVERSED && ledger.reversalOfId) {
        const source = ledgers.find((candidate) => candidate.id === ledger.reversalOfId);
        if (source?.mutationType === BONUS_MUTATION.USED) return sum - Math.abs(source.amount);
      }
      return sum;
    }, 0);
    const adjustmentUnits = ledgers.filter((ledger) => ledger.mutationType === BONUS_MUTATION.ADJUSTMENT).reduce((sum, ledger) => sum + ledger.amount, 0);

    return {
      customerId,
      threshold,
      totalSettledRevenue,
      entitledUnits,
      usedUnits,
      adjustmentUnits,
      ledgerBalance,
      availableUnits: ledgerBalance
    };
  }

  async appendLedger(input: {
    customerId: string;
    mutationType: BonusMutation;
    amount: number;
    bonId?: string;
    paymentId?: string;
    reason?: string;
    thresholdSnapshot?: number | null;
    revenueSnapshot?: number | null;
    reversalOfId?: string | null;
    allowNegative?: boolean;
  }) {
    if (!Number.isInteger(input.amount)) throw new BusinessError("Bonus ledger amount must be an integer unit count.");
    const availability = await this.getAvailability(input.customerId);
    const balanceBefore = availability.availableUnits;
    const balanceAfter = balanceBefore + input.amount;
    if (balanceAfter < 0 && !input.allowNegative) throw new BusinessError("Bonus units cannot become negative.");
    return this.db.bonusLedger.create({
      data: {
        customerId: input.customerId,
        mutationType: input.mutationType,
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        thresholdSnapshot: toDbMoney(input.thresholdSnapshot ?? availability.threshold, "thresholdSnapshot"),
        revenueSnapshot: toDbMoney(input.revenueSnapshot ?? availability.totalSettledRevenue, "revenueSnapshot"),
        reversalOfId: input.reversalOfId ?? undefined,
        bonId: input.bonId,
        paymentId: input.paymentId,
        reason: input.reason
      }
    });
  }

  async useBonusUnits(input: { customerId: string; units: number; bonId: string; reason?: string }) {
    if (!Number.isInteger(input.units) || input.units <= 0) throw new BusinessError("Bonus unit usage must be greater than zero.");
    const availability = await this.getAvailability(input.customerId);
    if (input.units > availability.availableUnits) {
      throw new BusinessError("Requested bonus units exceed available bonus units.");
    }
    return this.appendLedger({
      customerId: input.customerId,
      mutationType: BONUS_MUTATION.USED,
      amount: -input.units,
      bonId: input.bonId,
      reason: input.reason ?? "Bonus units used in Bon",
      thresholdSnapshot: availability.threshold,
      revenueSnapshot: availability.totalSettledRevenue
    });
  }

  async reverseBonUsage(input: { customerId: string; bonId: string; reason: string }) {
    const usedLedgers = await this.db.bonusLedger.findMany({
      where: { customerId: input.customerId, bonId: input.bonId, mutationType: BONUS_MUTATION.USED }
    });
    const existingReversals = await this.db.bonusLedger.findMany({
      where: { customerId: input.customerId, reversalOfId: { in: usedLedgers.map((ledger) => ledger.id) } }
    });
    const reversed = new Set(existingReversals.map((ledger) => ledger.reversalOfId));
    for (const ledger of usedLedgers) {
      if (reversed.has(ledger.id)) continue;
      await this.appendLedger({
        customerId: input.customerId,
        mutationType: BONUS_MUTATION.REVERSED,
        amount: Math.abs(ledger.amount),
        bonId: input.bonId,
        reason: input.reason,
        reversalOfId: ledger.id,
        allowNegative: true
      });
    }
  }

  async recordEarnedForSettlement(input: { customerId: string; paymentId: string; reason?: string }) {
    const availability = await this.getAvailability(input.customerId);
    const thresholdStart = await this.getCurrentThresholdStart(input.customerId);
    const currentPeriodRevenue = await this.getActiveSettledRevenue(input.customerId, thresholdStart);
    const earnedInCurrentPeriod = availability.threshold > 0 ? Math.floor(currentPeriodRevenue / availability.threshold) : 0;
    const earnedNetInCurrentPeriod = await this.getNetEarnedLedgerUnits(input.customerId, thresholdStart);
    const delta = earnedInCurrentPeriod - earnedNetInCurrentPeriod;
    await this.db.customer.update({
      where: { id: input.customerId },
      data: {
        bonusCarryoverRevenue: toDbMoney(availability.threshold > 0 ? currentPeriodRevenue % availability.threshold : 0, "bonusCarryoverRevenue")
      }
    });
    if (delta <= 0) return null;
    return this.appendLedger({
      customerId: input.customerId,
      mutationType: BONUS_MUTATION.EARNED,
      amount: delta,
      paymentId: input.paymentId,
      reason: input.reason ?? "Bonus units earned from settled turnover",
      thresholdSnapshot: availability.threshold,
      revenueSnapshot: currentPeriodRevenue,
      allowNegative: true
    });
  }

  async reverseEarnedForPayment(input: { customerId: string; paymentId: string; reason: string }) {
    const earnedLedgers = await this.db.bonusLedger.findMany({
      where: { customerId: input.customerId, paymentId: input.paymentId, mutationType: BONUS_MUTATION.EARNED }
    });
    const existingReversals = await this.db.bonusLedger.findMany({
      where: { customerId: input.customerId, reversalOfId: { in: earnedLedgers.map((ledger) => ledger.id) } }
    });
    const reversed = new Set(existingReversals.map((ledger) => ledger.reversalOfId));
    for (const ledger of earnedLedgers) {
      if (reversed.has(ledger.id)) continue;
      await this.appendLedger({
        customerId: input.customerId,
        mutationType: BONUS_MUTATION.REVERSED,
        amount: -Math.abs(ledger.amount),
        paymentId: input.paymentId,
        reason: input.reason,
        reversalOfId: ledger.id,
        allowNegative: true
      });
    }
    await this.recalculateCurrentCarryover(input.customerId);
  }

  async reconcileEarnedAfterVoid(input: { customerId: string; bonId: string; paymentId?: string; reason: string }) {
    const availability = await this.getAvailability(input.customerId);
    const thresholdStart = await this.getCurrentThresholdStart(input.customerId);
    const currentPeriodRevenue = await this.getActiveSettledRevenue(input.customerId, thresholdStart);
    const earnedInCurrentPeriod = availability.threshold > 0 ? Math.floor(currentPeriodRevenue / availability.threshold) : 0;
    const earnedNet = await this.getNetEarnedLedgerUnits(input.customerId, thresholdStart);
    const excess = earnedNet - earnedInCurrentPeriod;
    await this.recalculateCurrentCarryover(input.customerId);
    if (excess <= 0) return null;
    return this.appendLedger({
      customerId: input.customerId,
      mutationType: BONUS_MUTATION.REVERSED,
      amount: -excess,
      bonId: input.bonId,
      paymentId: input.paymentId,
      reason: input.reason,
      thresholdSnapshot: availability.threshold,
      revenueSnapshot: currentPeriodRevenue,
      allowNegative: true
    });
  }

  async isEligible(customerId: string) {
    const availability = await this.getAvailability(customerId);
    return {
      eligible: availability.availableUnits > 0,
      balance: availability.availableUnits,
      ...availability
    };
  }

  private async getActiveSettledRevenue(customerId: string, settledFrom?: Date) {
    const paid = await this.db.bon.aggregate({
      where: { customerId, status: "LUNAS", deletedAt: null, ...(settledFrom ? { settledAt: { gte: settledFrom } } : {}) },
      _sum: { revenueLm: true, revenueBr: true }
    });
    return toSafeMoneyNumber(paid._sum.revenueLm, "revenueLm") + toSafeMoneyNumber(paid._sum.revenueBr, "revenueBr");
  }

  private async getNetEarnedLedgerUnits(customerId: string, createdFrom?: Date) {
    const ledgers = await this.db.bonusLedger.findMany({
      where: {
        customerId,
        mutationType: { in: [BONUS_MUTATION.EARNED, BONUS_MUTATION.REVERSED] },
        ...(createdFrom ? { createdAt: { gte: createdFrom } } : {})
      }
    });
    const earnedIds = new Set(ledgers.filter((ledger) => ledger.mutationType === BONUS_MUTATION.EARNED).map((ledger) => ledger.id));
    return ledgers.reduce((sum, ledger) => {
      if (ledger.mutationType === BONUS_MUTATION.EARNED) return sum + ledger.amount;
      if (ledger.reversalOfId && earnedIds.has(ledger.reversalOfId)) return sum + ledger.amount;
      return sum;
    }, 0);
  }

  private async getCurrentThresholdStart(customerId: string) {
    const latest = await this.db.bonusThresholdHistory.findFirst({
      where: { customerId, effectiveUntil: null },
      orderBy: { effectiveFrom: "desc" }
    });
    return latest?.effectiveFrom;
  }

  private async recalculateCurrentCarryover(customerId: string) {
    const availability = await this.getAvailability(customerId);
    const thresholdStart = await this.getCurrentThresholdStart(customerId);
    const currentPeriodRevenue = await this.getActiveSettledRevenue(customerId, thresholdStart);
    await this.db.customer.update({
      where: { id: customerId },
      data: {
        bonusCarryoverRevenue: toDbMoney(availability.threshold > 0 ? currentPeriodRevenue % availability.threshold : 0, "bonusCarryoverRevenue")
      }
    });
  }
}
