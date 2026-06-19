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
}
