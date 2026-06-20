import type { PrismaClient } from "@prisma/client";
import { BonusService } from "./bonusService";
import { NotificationService, type PublishNotificationInput } from "./notificationService";

const OVERDUE_DAYS = 30;

export class ConditionNotificationService extends NotificationService {
  private readonly bonus: BonusService;

  constructor(private readonly conditionDb: PrismaClient) {
    super(conditionDb);
    this.bonus = new BonusService(conditionDb);
  }

  override async list(input: Parameters<NotificationService["list"]>[0]) {
    await this.syncConditions(input.userId);
    return super.list(input);
  }

  override async syncInventory(userId: string, productIds?: string[]) {
    const products = await this.conditionDb.product.findMany({
      where: { deletedAt: null, ...(productIds?.length ? { id: { in: productIds } } : {}) },
      select: { id: true, name: true, stock: true }
    });
    for (const product of products) {
      if (product.stock > 5) {
        await this.resolve(userId, "inventory-stock", product.id);
        continue;
      }
      const outOfStock = product.stock === 0;
      await this.ensureCondition({
        userId,
        eventKey: "inventory-stock",
        category: "INVENTORY",
        severity: outOfStock ? "CRITICAL" : "WARNING",
        title: outOfStock ? "Stok produk habis" : "Stok produk menipis",
        message: outOfStock ? `${product.name} tidak memiliki stok tersisa.` : `${product.name} tersisa ${product.stock} unit.`,
        targetUrl: "#/products",
        entityType: "PRODUCT",
        entityId: product.id
      });
    }
  }

  override async syncBonusEligibility(input: { userId: string; customerId: string; customerName: string; availableUnits: number }) {
    if (input.availableUnits <= 0) {
      await this.resolve(input.userId, "bonus-eligible", input.customerId);
      return;
    }
    await this.ensureCondition({
      userId: input.userId,
      eventKey: "bonus-eligible",
      category: "BONUS",
      severity: "SUCCESS",
      title: "Bonus pelanggan tersedia",
      message: `${input.customerName} memiliki ${input.availableUnits} unit Bonus Bon yang dapat digunakan.`,
      targetUrl: `#/bons/new?mode=bonus&customer=${encodeURIComponent(input.customerId)}`,
      entityType: "CUSTOMER",
      entityId: input.customerId
    });
  }

  private async syncConditions(userId: string) {
    await this.syncInventory(userId);
    await this.syncCustomers(userId);
    await this.syncReceivables(userId);
    await this.syncNegativeProfit(userId);
  }

  private async syncCustomers(userId: string) {
    const customers = await this.conditionDb.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    });
    for (const customer of customers) {
      const availability = await this.bonus.getAvailability(customer.id);
      await this.syncBonusEligibility({
        userId,
        customerId: customer.id,
        customerName: customer.name,
        availableUnits: availability.availableUnits
      });
    }
  }

  private async syncReceivables(userId: string) {
    const cutoff = new Date(Date.now() - OVERDUE_DAYS * 86_400_000);
    const overdue = await this.conditionDb.bon.findMany({
      where: { status: "PIUTANG", deletedAt: null, bonDate: { lte: cutoff } },
      select: { id: true, bonNumber: true, bonDate: true }
    });
    const activeIds = new Set(overdue.map((bon) => bon.id));
    for (const bon of overdue) {
      const age = Math.max(OVERDUE_DAYS, Math.floor((Date.now() - bon.bonDate.getTime()) / 86_400_000));
      await this.ensureCondition({
        userId,
        eventKey: "receivable-overdue",
        category: "RECEIVABLE",
        severity: age >= OVERDUE_DAYS * 2 ? "CRITICAL" : "WARNING",
        title: "Piutang melewati batas umur",
        message: `${bon.bonNumber} telah berumur ${age} hari dan perlu ditindaklanjuti.`,
        targetUrl: `#/bon/${encodeURIComponent(bon.bonNumber)}`,
        entityType: "BON",
        entityId: bon.id
      });
    }
    await this.resolveStale(userId, "receivable-overdue", activeIds);
  }

  private async syncNegativeProfit(userId: string) {
    const negative = await this.conditionDb.bon.findMany({
      where: { hasNegativeProfit: true, status: { not: "VOID" }, deletedAt: null },
      select: { id: true, bonNumber: true }
    });
    const activeIds = new Set(negative.map((bon) => bon.id));
    for (const bon of negative) {
      await this.ensureCondition({
        userId,
        eventKey: "negative-profit",
        category: "TRANSACTION",
        severity: "CRITICAL",
        title: "Transaksi dengan laba negatif",
        message: `${bon.bonNumber} memiliki laba negatif dan memerlukan perhatian Owner.`,
        targetUrl: `#/bon/${encodeURIComponent(bon.bonNumber)}`,
        entityType: "BON",
        entityId: bon.id
      });
    }
    await this.resolveStale(userId, "negative-profit", activeIds);
  }

  private async ensureCondition(input: PublishNotificationInput) {
    const entityId = input.entityId ?? "global";
    const existing = await this.conditionDb.notification.findUnique({
      where: { userId_eventKey_entityId: { userId: input.userId, eventKey: input.eventKey, entityId } }
    });
    if (existing) {
      const unchanged = existing.category === input.category
        && existing.severity === input.severity
        && existing.title === input.title
        && existing.message === input.message
        && existing.targetUrl === (input.targetUrl ?? null)
        && existing.entityType === (input.entityType ?? null);
      if (unchanged) return existing;
    }
    return this.publish(input);
  }

  private async resolveStale(userId: string, eventKey: string, activeIds: Set<string>) {
    const current = await this.conditionDb.notification.findMany({
      where: { userId, eventKey, dismissedAt: null },
      select: { entityId: true }
    });
    for (const notification of current) {
      if (!activeIds.has(notification.entityId)) await this.resolve(userId, eventKey, notification.entityId);
    }
  }
}
