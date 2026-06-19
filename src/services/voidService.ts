import { Prisma, PrismaClient } from "@prisma/client";
import { AuthService } from "./authService";
import { BonusService } from "./bonusService";
import { lockInventoryRows, restoreInventory } from "./inventoryService";
import { AUTHORIZATION_TYPE } from "../domain/constants";
import { BusinessError } from "../domain/errors";
import { toSafeMoneyNumber } from "../domain/money";

export class VoidService {
  constructor(private readonly db: PrismaClient, private readonly auth: AuthService) {}

  async voidPaidBon(input: { bonId: string; userId: string; ownerPin: string; reason: string }) {
    return this.db.$transaction(async (tx) => {
      await lockBonRow(tx, input.bonId);
      const bon = await tx.bon.findUnique({
        where: { id: input.bonId },
        include: { paymentLinks: true, items: true }
      });
      if (!bon) throw new BusinessError("Bon not found.");
      if (bon.status !== "LUNAS") throw new BusinessError("Only Lunas Bon can be voided through this process.");
      if (!input.reason.trim()) throw new BusinessError("Void reason is required.");
      if (bon.inventoryAppliedAt) await lockInventoryRows(tx, bon.items);

      const scopedAuth = new AuthService(tx as unknown as PrismaClient);
      const authorization = await scopedAuth.authorizeOwner({
        userId: input.userId,
        ownerPin: input.ownerPin,
        type: AUTHORIZATION_TYPE.VOID_BON,
        reason: input.reason,
        context: { bonId: bon.id, previousTotal: bon.totalAmount }
      });

      const voided = await tx.bon.updateMany({
        where: { id: bon.id, status: "LUNAS" },
        data: { status: "VOID", voidedAt: new Date(), inventoryAppliedAt: null }
      });
      if (voided.count !== 1) throw new BusinessError("Bon has already changed state and cannot be voided.");

      if (bon.inventoryAppliedAt) {
        await restoreInventory(tx, bon.items);
      }

      const bonusService = new BonusService(tx);
      await bonusService.reverseBonUsage({
        customerId: bon.customerId,
        bonId: bon.id,
        reason: "Bonus usage reversed after Void"
      });
      for (const link of bon.paymentLinks) {
        await tx.paymentBon.update({
          where: { paymentId_bonId: { paymentId: link.paymentId, bonId: bon.id } },
          data: { reversedAt: new Date() }
        });
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: link.paymentId } });
        await tx.payment.update({
          where: { id: link.paymentId },
          data: {
            activePaymentAmount: BigInt(
              Math.max(0, toSafeMoneyNumber(payment.activePaymentAmount, "activePaymentAmount") - toSafeMoneyNumber(link.allocatedInvoiceAmount, "allocatedInvoiceAmount"))
            )
          }
        });
        await bonusService.reconcileEarnedAfterVoid({
          customerId: bon.customerId,
          bonId: bon.id,
          paymentId: link.paymentId,
          reason: "Bonus entitlement reversed after Void"
        });
      }

      await tx.voidRecord.create({
        data: {
          bonId: bon.id,
          reason: input.reason,
          authorizedById: input.userId,
          authorizationId: authorization.id,
          previousStatus: bon.status,
          previousTotal: bon.totalAmount,
          previousRevenueLm: bon.revenueLm,
          previousRevenueBr: bon.revenueBr,
          previousProfit: bon.profitAmount,
          previousBonusCost: bon.bonusCost,
          reversalImpactJson: JSON.stringify({
            revenueLm: -toSafeMoneyNumber(bon.revenueLm, "revenueLm"),
            revenueBr: -toSafeMoneyNumber(bon.revenueBr, "revenueBr"),
            profitAmount: -toSafeMoneyNumber(bon.profitAmount, "profitAmount"),
            bonusCost: -toSafeMoneyNumber(bon.bonusCost, "bonusCost")
          })
        }
      });
      return tx.bon.findUniqueOrThrow({ where: { id: bon.id }, include: { voidRecord: true } });
    });
  }
}

async function lockBonRow(tx: Prisma.TransactionClient, bonId: string) {
  await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Bon"
    WHERE "id" = ${bonId}
    FOR UPDATE
  `;
}
