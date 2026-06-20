import type { PrismaClient } from "@prisma/client";
import { AuthService } from "./authService";
import { NotificationDomainService } from "./notificationDomainService";
import { TransactionService } from "./transactionService";

export class TransactionNotificationService extends TransactionService {
  constructor(db: PrismaClient, auth: AuthService, private readonly domain: NotificationDomainService) {
    super(db, auth);
  }

  override async createBon(input: Parameters<TransactionService["createBon"]>[0]) {
    const bon = await super.createBon(input);
    const userId = await this.domain.resolveUserId(input.userId);
    const bonusOnly = bon.items.length > 0 && bon.items.every((item) => item.isBonus);
    await this.domain.bon(userId, bonusOnly ? "bonus-created" : "created", bon.id).catch(() => undefined);
    return bon;
  }

  override async updatePiutangBon(bonId: string, input: Parameters<TransactionService["updatePiutangBon"]>[1]) {
    const bon = await super.updatePiutangBon(bonId, input);
    const userId = await this.domain.resolveUserId(input.userId);
    await this.domain.bon(userId, "updated", bon.id).catch(() => undefined);
    return bon;
  }

  override async softDeletePiutangBon(bonId: string) {
    const bon = await super.softDeletePiutangBon(bonId);
    const userId = await this.domain.resolveUserId();
    await this.domain.bon(userId, "deactivated", bon.id).catch(() => undefined);
    return bon;
  }
}
