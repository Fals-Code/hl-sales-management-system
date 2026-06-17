import { Prisma, PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { AuthService } from "./authService";
import { BonusService } from "./bonusService";
import { AUTHORIZATION_TYPE, BonItemKindValue, ITEM_KIND } from "../domain/constants";
import { calculateBon } from "../domain/calculationEngine";
import { AuthorizationError, BusinessError } from "../domain/errors";
import { assertNonNegativeMoney, assertProductType } from "../domain/validation";
import { toDbMoney, toSafeMoneyNumber } from "../domain/money";

export type BonItemInput = {
  productId: string;
  quantity: number;
  kind?: BonItemKindValue;
};

export type SaveBonInput = {
  customerId: string;
  items: BonItemInput[];
  shippingCost?: number;
  bonDate?: Date;
  userId?: string;
  ownerPin?: string;
  negativeProfitReason?: string;
};

export class TransactionService {
  constructor(private readonly db: PrismaClient, private readonly auth: AuthService) {}

  async createBon(input: SaveBonInput) {
    return this.db.$transaction(async (tx) => {
      const calculation = await buildCalculation(tx, input);
      const bonusUnits = countBonusUnits(input.items);
      if (bonusUnits > 0) {
        const availability = await new BonusService(tx).getAvailability(input.customerId);
        if (bonusUnits > availability.availableUnits) {
          throw new BusinessError("Requested bonus units exceed available bonus units.");
        }
      }
      let authorizationId: string | undefined;
      if (calculation.hasNegativeProfit) {
        authorizationId = await this.authorizeNegativeProfit(tx, input, calculation.profitAmount);
      }

      const bon = await tx.bon.create({
        data: {
          bonNumber: await uniqueBonNumber(tx),
          customerId: input.customerId,
          bonDate: input.bonDate ?? new Date(),
          shippingCost: toDbMoney(calculation.shippingCost, "shippingCost"),
          totalBeforeDiscount: toDbMoney(calculation.totalBeforeDiscount, "totalBeforeDiscount"),
          totalAfterDiscount: toDbMoney(calculation.totalAfterDiscount, "totalAfterDiscount"),
          totalAmount: toDbMoney(calculation.totalAmount, "totalAmount"),
          revenueLm: toDbMoney(calculation.revenueLm, "revenueLm"),
          revenueBr: toDbMoney(calculation.revenueBr, "revenueBr"),
          profitAmount: toDbMoney(calculation.profitAmount, "profitAmount"),
          bonusCost: toDbMoney(calculation.bonusCost, "bonusCost"),
          hasNegativeProfit: calculation.hasNegativeProfit,
          negativeProfitAuthorizedById: authorizationId,
          negativeProfitReason: input.negativeProfitReason
        }
      });

      await writeItems(tx, bon.id, calculation.items);
      if (bonusUnits > 0) {
        await new BonusService(tx).useBonusUnits({
          customerId: input.customerId,
          units: bonusUnits,
          bonId: bon.id,
          reason: "Bonus item used in Bon"
        });
      }
      return tx.bon.findUniqueOrThrow({ where: { id: bon.id }, include: { items: true } });
    });
  }

  async updatePiutangBon(bonId: string, input: SaveBonInput) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.bon.findUnique({ where: { id: bonId } });
      if (!existing || existing.deletedAt) throw new BusinessError("Bon not found.");
      if (existing.status !== "PIUTANG") throw new BusinessError("Only Piutang Bon can be edited.");

      await new BonusService(tx).reverseBonUsage({
        customerId: existing.customerId,
        bonId,
        reason: "Reversal before Piutang Bon edit"
      });

      const calculation = await buildCalculation(tx, input);
      const bonusUnits = countBonusUnits(input.items);
      if (bonusUnits > 0) {
        const availability = await new BonusService(tx).getAvailability(input.customerId);
        if (bonusUnits > availability.availableUnits) {
          throw new BusinessError("Requested bonus units exceed available bonus units.");
        }
      }
      let authorizationId: string | undefined;
      if (calculation.hasNegativeProfit) {
        authorizationId = await this.authorizeNegativeProfit(tx, input, calculation.profitAmount);
      }

      await tx.bonItem.deleteMany({ where: { bonId } });
      await writeItems(tx, bonId, calculation.items);
      await tx.bon.update({
        where: { id: bonId },
        data: {
          customerId: input.customerId,
          bonDate: input.bonDate,
          shippingCost: toDbMoney(calculation.shippingCost, "shippingCost"),
          totalBeforeDiscount: toDbMoney(calculation.totalBeforeDiscount, "totalBeforeDiscount"),
          totalAfterDiscount: toDbMoney(calculation.totalAfterDiscount, "totalAfterDiscount"),
          totalAmount: toDbMoney(calculation.totalAmount, "totalAmount"),
          revenueLm: toDbMoney(calculation.revenueLm, "revenueLm"),
          revenueBr: toDbMoney(calculation.revenueBr, "revenueBr"),
          profitAmount: toDbMoney(calculation.profitAmount, "profitAmount"),
          bonusCost: toDbMoney(calculation.bonusCost, "bonusCost"),
          hasNegativeProfit: calculation.hasNegativeProfit,
          negativeProfitAuthorizedById: authorizationId,
          negativeProfitReason: input.negativeProfitReason
        }
      });
      if (bonusUnits > 0) {
        await new BonusService(tx).useBonusUnits({
          customerId: input.customerId,
          units: bonusUnits,
          bonId,
          reason: "Bonus item used in edited Bon"
        });
      }
      return tx.bon.findUniqueOrThrow({ where: { id: bonId }, include: { items: true } });
    });
  }

  async softDeletePiutangBon(bonId: string) {
    return this.db.$transaction(async (tx) => {
      const bon = await tx.bon.findUnique({ where: { id: bonId } });
      if (!bon || bon.deletedAt) throw new BusinessError("Bon not found.");
      if (bon.status !== "PIUTANG") throw new BusinessError("Only Piutang Bon can be soft-deleted.");
      await new BonusService(tx).reverseBonUsage({
        customerId: bon.customerId,
        bonId,
        reason: "Bonus reversal after Piutang Bon deletion"
      });
      return tx.bon.update({ where: { id: bonId }, data: { deletedAt: new Date() } });
    });
  }

  private async authorizeNegativeProfit(tx: Prisma.TransactionClient, input: SaveBonInput, profitAmount: number) {
    if (!input.userId || !input.ownerPin || !input.negativeProfitReason?.trim()) {
      throw new AuthorizationError("Negative-profit transaction requires Owner PIN and reason.");
    }
    const scopedAuth = new AuthService(tx as unknown as PrismaClient);
    const auth = await scopedAuth.authorizeOwner({
      userId: input.userId,
      ownerPin: input.ownerPin,
      type: AUTHORIZATION_TYPE.LOSS_TRANSACTION,
      reason: input.negativeProfitReason,
      context: { profitAmount }
    });
    return auth.id;
  }
}

function countBonusUnits(items: BonItemInput[]) {
  return items.reduce((sum, item) => {
    if ((item.kind ?? ITEM_KIND.REGULER) !== ITEM_KIND.BONUS) return sum;
    return sum + item.quantity;
  }, 0);
}

async function buildCalculation(tx: Prisma.TransactionClient, input: SaveBonInput) {
  assertNonNegativeMoney(input.shippingCost ?? 0, "shippingCost");
  if (!input.items.length) throw new BusinessError("Bon must contain at least one item.");
  const customer = await tx.customer.findFirst({
    where: { id: input.customerId, deletedAt: null },
    include: { discountTiers: true }
  });
  if (!customer) throw new BusinessError("Customer not found.");

  const productIds = input.items.map((item) => item.productId);
  const products = await tx.product.findMany({ where: { id: { in: productIds }, deletedAt: null } });
  if (products.length !== new Set(productIds).size) throw new BusinessError("One or more products are invalid.");
  const productMap = new Map(products.map((product) => [product.id, product]));

  return calculateBon(
    input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BusinessError("Product not found.");
      assertProductType(product.type);
      const kind = item.kind ?? ITEM_KIND.REGULER;
      return {
        productId: product.id,
        productName: product.name,
        productType: product.type as "LM" | "BR",
        costPrice: toSafeMoneyNumber(product.costPrice, "costPrice"),
        basePrice: toSafeMoneyNumber(product.basePrice, "basePrice"),
        quantity: item.quantity,
        kind,
        discounts:
          kind === ITEM_KIND.BONUS
            ? []
            : customer.discountTiers
                .filter((tier) => tier.productType === product.type)
                .map((tier) => ({ sequence: tier.sequence, percentBps: tier.percentBps }))
      };
    }),
    input.shippingCost ?? 0
  );
}

async function writeItems(tx: Prisma.TransactionClient, bonId: string, items: ReturnType<typeof calculateBon>["items"]) {
  await tx.bonItem.createMany({
    data: items.map((item) => ({
      bonId,
      productId: item.productId,
      kind: item.kind,
      productNameSnapshot: item.productNameSnapshot,
      productTypeSnapshot: item.productTypeSnapshot,
      basePriceSnapshot: toDbMoney(item.basePriceSnapshot, "basePriceSnapshot"),
      costPriceSnapshot: toDbMoney(item.costPriceSnapshot, "costPriceSnapshot"),
      discountSnapshotJson: JSON.stringify(item.discountSnapshot),
      priceAfterDiscount: toDbMoney(item.priceAfterDiscount, "priceAfterDiscount"),
      finalPrice: toDbMoney(item.finalPrice, "finalPrice"),
      quantity: item.quantity,
      subtotal: toDbMoney(item.subtotal, "subtotal"),
      profitAmount: toDbMoney(item.profitAmount, "profitAmount"),
      isBonus: item.isBonus
    }))
  });
}

async function uniqueBonNumber(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const value = `BON-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const existing = await tx.bon.findUnique({ where: { bonNumber: value } });
    if (!existing) return value;
  }
  throw new BusinessError("Unable to generate unique Bon number.");
}
