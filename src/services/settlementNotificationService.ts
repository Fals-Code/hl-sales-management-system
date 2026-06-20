import type { PrismaClient } from "@prisma/client";
import { AuthService } from "./authService";
import { NotificationDomainService } from "./notificationDomainService";
import { SettlementService } from "./settlementService";

export class SettlementNotificationService extends SettlementService {
  constructor(db: PrismaClient, auth: AuthService, private readonly domain: NotificationDomainService) {
    super(db, auth);
  }

  override async settleBons(input: Parameters<SettlementService["settleBons"]>[0]) {
    const payment = await super.settleBons(input);
    const userId = await this.domain.resolveUserId();
    await this.domain.payment(userId, "settled", payment.id).catch(() => undefined);
    return payment;
  }

  override async cancelPayment(input: Parameters<SettlementService["cancelPayment"]>[0]) {
    const payment = await super.cancelPayment(input);
    const userId = await this.domain.resolveUserId(input.userId);
    await this.domain.payment(userId, "canceled", payment.id).catch(() => undefined);
    return payment;
  }
}
