import { PrismaClient } from "@prisma/client";
import { ProductTypeValue } from "../domain/constants";
import { assertNonNegativeMoney, assertPercentBps } from "../domain/validation";
import { BusinessError } from "../domain/errors";
import { toDbMoney, toSafeMoneyNumber } from "../domain/money";

export type DiscountTierConfig = {
  productType: ProductTypeValue;
  sequence: number;
  percentBps: number;
};

export class CustomerService {
  constructor(private readonly db: PrismaClient) {}

  async createCustomer(input: {
    code?: string;
    name: string;
    phone?: string;
    address?: string;
    bonusThreshold?: number;
    discountTiers?: DiscountTierConfig[];
  }) {
    validateCustomerInput(input);
    return this.db.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          code: input.code,
          name: input.name,
          phone: input.phone,
          address: input.address,
          bonusThreshold: toDbMoney(input.bonusThreshold ?? 0, "bonusThreshold")
        }
      });
      if (input.discountTiers?.length) {
        await tx.customerDiscountTier.createMany({
          data: input.discountTiers.map((tier) => validateTier(customer.id, tier))
        });
      }
      return tx.customer.findUniqueOrThrow({ where: { id: customer.id }, include: { discountTiers: true } });
    });
  }

  async updateCustomer(input: {
    id: string;
    name?: string;
    phone?: string | null;
    address?: string | null;
    bonusThreshold?: number;
    discountTiers?: DiscountTierConfig[];
    changedById?: string;
    thresholdReason?: string;
  }) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!existing) throw new BusinessError("Customer not found.");
      if (input.bonusThreshold !== undefined) assertNonNegativeMoney(input.bonusThreshold, "bonusThreshold");
      if (input.discountTiers) input.discountTiers.forEach((tier) => validateTier(input.id, tier));

      const thresholdChanged = input.bonusThreshold !== undefined && input.bonusThreshold !== toSafeMoneyNumber(existing.bonusThreshold, "bonusThreshold");
      const carryoverRevenue = thresholdChanged ? await getCurrentBonusCarryover(tx, input.id, toSafeMoneyNumber(existing.bonusThreshold, "bonusThreshold")) : undefined;
      const updated = await tx.customer.update({
        where: { id: input.id },
        data: {
          name: input.name,
          phone: input.phone,
          address: input.address,
          bonusThreshold: input.bonusThreshold === undefined ? undefined : toDbMoney(input.bonusThreshold, "bonusThreshold"),
          bonusCarryoverRevenue: carryoverRevenue === undefined ? undefined : toDbMoney(carryoverRevenue, "bonusCarryoverRevenue")
        }
      });

      if (thresholdChanged && carryoverRevenue !== undefined) {
        const changedAt = new Date();
        await tx.bonusThresholdHistory.updateMany({
          where: { customerId: input.id, effectiveUntil: null },
          data: { effectiveUntil: changedAt }
        });
        await tx.bonusThresholdHistory.create({
          data: {
            customerId: input.id,
            oldValue: existing.bonusThreshold,
            newValue: toDbMoney(input.bonusThreshold ?? 0, "bonusThreshold"),
            effectiveFrom: changedAt,
            carryoverRevenue: toDbMoney(carryoverRevenue, "carryoverRevenue"),
            changedById: input.changedById,
            reason: input.thresholdReason
          }
        });
      }

      if (input.discountTiers) {
        await tx.customerDiscountTier.deleteMany({ where: { customerId: input.id } });
        if (input.discountTiers.length) {
          await tx.customerDiscountTier.createMany({
            data: input.discountTiers.map((tier) => validateTier(input.id, tier))
          });
        }
      }
      return tx.customer.findUniqueOrThrow({ where: { id: updated.id }, include: { discountTiers: true } });
    });
  }

  async softDeleteCustomer(id: string) {
    return this.db.customer.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

async function getCurrentBonusCarryover(tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0], customerId: string, threshold: number) {
  if (threshold <= 0) return 0;
  const paid = await tx.bon.aggregate({
    where: { customerId, status: "LUNAS", deletedAt: null },
    _sum: { revenueLm: true, revenueBr: true }
  });
  const total = toSafeMoneyNumber(paid._sum.revenueLm, "revenueLm") + toSafeMoneyNumber(paid._sum.revenueBr, "revenueBr");
  return total % threshold;
}

function validateCustomerInput(input: { name: string; bonusThreshold?: number; discountTiers?: DiscountTierConfig[] }) {
  if (!input.name.trim()) throw new BusinessError("Customer name is required.");
  if (input.bonusThreshold !== undefined) assertNonNegativeMoney(input.bonusThreshold, "bonusThreshold");
  input.discountTiers?.forEach((tier) => validateTier("customer", tier));
}

function validateTier(customerId: string, tier: DiscountTierConfig) {
  if (!Number.isInteger(tier.sequence) || tier.sequence <= 0) {
    throw new BusinessError("Discount sequence must be a positive integer.");
  }
  assertPercentBps(tier.percentBps);
  return {
    customerId,
    productType: tier.productType,
    sequence: tier.sequence,
    percentBps: tier.percentBps
  };
}
