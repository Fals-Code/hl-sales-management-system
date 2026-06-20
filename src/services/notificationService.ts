import type { Notification, PrismaClient } from "@prisma/client";

export type NotificationCategory = "TRANSACTION" | "RECEIVABLE" | "PAYMENT" | "INVENTORY" | "BONUS" | "SECURITY" | "SYSTEM";
export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
export type NotificationEntityType = "BON" | "PAYMENT" | "CUSTOMER" | "PRODUCT";

export type PublishNotificationInput = {
  userId: string;
  eventKey: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  targetUrl?: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  expiresAt?: Date;
};

type Listener = (notification: Notification) => void;

export class NotificationHub {
  private readonly listeners = new Map<string, Set<Listener>>();

  subscribe(userId: string, listener: Listener) {
    const current = this.listeners.get(userId) ?? new Set<Listener>();
    current.add(listener);
    this.listeners.set(userId, current);
    return () => {
      const listeners = this.listeners.get(userId);
      if (!listeners) return;
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(userId);
    };
  }

  publish(userId: string, notification: Notification) {
    for (const listener of this.listeners.get(userId) ?? []) listener(notification);
  }
}

export class NotificationService {
  constructor(private readonly db: PrismaClient, readonly hub: NotificationHub = new NotificationHub()) {}

  async publish(input: PublishNotificationInput) {
    const entityId = input.entityId ?? "global";
    const notification = await this.db.notification.upsert({
      where: { userId_eventKey_entityId: { userId: input.userId, eventKey: input.eventKey, entityId } },
      create: {
        userId: input.userId,
        eventKey: input.eventKey,
        category: input.category,
        severity: input.severity,
        title: input.title,
        message: input.message,
        targetUrl: input.targetUrl,
        entityType: input.entityType,
        entityId,
        expiresAt: input.expiresAt
      },
      update: {
        category: input.category,
        severity: input.severity,
        title: input.title,
        message: input.message,
        targetUrl: input.targetUrl,
        entityType: input.entityType,
        createdAt: new Date(),
        readAt: null,
        dismissedAt: null,
        expiresAt: input.expiresAt
      }
    });
    this.hub.publish(input.userId, notification);
    return notification;
  }

  async resolve(userId: string, eventKey: string, entityId = "global") {
    await this.db.notification.updateMany({
      where: { userId, eventKey, entityId, dismissedAt: null },
      data: { dismissedAt: new Date() }
    });
  }

  async list(input: {
    userId: string;
    mode?: "ALL" | "UNREAD";
    category?: NotificationCategory;
    limit?: number;
    cursor?: string;
  }) {
    const now = new Date();
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
    const baseWhere = {
      userId: input.userId,
      dismissedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    };
    const items = await this.db.notification.findMany({
      where: {
        ...baseWhere,
        ...(input.mode === "UNREAD" ? { readAt: null } : {}),
        ...(input.category ? { category: input.category } : {})
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {})
    });
    const unreadCount = await this.db.notification.count({ where: { ...baseWhere, readAt: null } });
    return { items, unreadCount, nextCursor: items.length === limit ? items[items.length - 1]?.id ?? null : null };
  }

  markRead(userId: string, id: string) {
    return this.db.notification.update({ where: { id, userId }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    const result = await this.db.notification.updateMany({
      where: { userId, readAt: null, dismissedAt: null },
      data: { readAt: new Date() }
    });
    return { updated: result.count };
  }

  dismiss(userId: string, id: string) {
    return this.db.notification.update({ where: { id, userId }, data: { dismissedAt: new Date() } });
  }

  async syncInventory(userId: string, productIds?: string[]) {
    const products = await this.db.product.findMany({
      where: { deletedAt: null, ...(productIds?.length ? { id: { in: productIds } } : {}) },
      select: { id: true, name: true, stock: true }
    });
    await Promise.all(products.map(async (product) => {
      if (product.stock > 5) {
        await this.resolve(userId, "inventory-stock", product.id);
        return;
      }
      const outOfStock = product.stock === 0;
      await this.publish({
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
    }));
  }

  async syncBonusEligibility(input: { userId: string; customerId: string; customerName: string; availableUnits: number }) {
    if (input.availableUnits <= 0) {
      await this.resolve(input.userId, "bonus-eligible", input.customerId);
      return;
    }
    await this.publish({
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
}
