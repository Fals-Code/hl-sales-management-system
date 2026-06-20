import type { PrismaClient } from "@prisma/client";
import { AuthService } from "./authService";
import { NotificationDomainService } from "./notificationDomainService";
import { VoidService } from "./voidService";

export class VoidNotificationService extends VoidService {
  constructor(db: PrismaClient, auth: AuthService, private readonly domain: NotificationDomainService) {
    super(db, auth);
  }

  override async voidPaidBon(input: Parameters<VoidService["voidPaidBon"]>[0]) {
    const bon = await super.voidPaidBon(input);
    const userId = await this.domain.resolveUserId(input.userId);
    await this.domain.bon(userId, "voided", bon.id).catch(() => undefined);
    return bon;
  }
}
