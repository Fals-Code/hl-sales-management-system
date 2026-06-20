import { bonusesAvailable } from "./acceptance-data";
import type { StoredBon, StoredCustomer, StoredProduct } from "./store";
import { notificationId, type AppNotification } from "./notification-events";

type NotificationSource = {
  customers: StoredCustomer[];
  products: StoredProduct[];
  bons: StoredBon[];
  now?: Date;
  overdueDays?: number;
  lowStockThreshold?: number;
};

export function buildActionableNotifications({
  customers,
  products,
  bons,
  now = new Date(),
  overdueDays = 30,
  lowStockThreshold = 5
}: NotificationSource): AppNotification[] {
  const createdAt = now.toISOString();
  const notifications: AppNotification[] = [];

  for (const product of products) {
    if (!product.active || product.id.startsWith("SNAP-")) continue;
    if (product.stock > lowStockThreshold) continue;
    const outOfStock = product.stock === 0;
    notifications.push({
      id: notificationId("inventory-stock", product.backendId ?? product.id),
      eventKey: "inventory-stock",
      category: "INVENTORY",
      severity: outOfStock ? "CRITICAL" : "WARNING",
      title: outOfStock ? "Stok produk habis" : "Stok produk menipis",
      message: outOfStock
        ? `${product.name} tidak memiliki stok tersisa.`
        : `${product.name} tersisa ${product.stock} unit.`,
      targetUrl: "#/products",
      entityType: "PRODUCT",
      entityId: product.backendId ?? product.id,
      createdAt
    });
  }

  for (const customer of customers) {
    if (!customer.active) continue;
    const available = bonusesAvailable(customer);
    if (available <= 0) continue;
    notifications.push({
      id: notificationId("bonus-eligible", customer.backendId ?? customer.code),
      eventKey: "bonus-eligible",
      category: "BONUS",
      severity: "SUCCESS",
      title: "Bonus pelanggan tersedia",
      message: `${customer.name} memiliki ${available} unit Bonus Bon yang dapat digunakan.`,
      targetUrl: `#/bons/new?mode=bonus&customer=${encodeURIComponent(customer.code)}`,
      entityType: "CUSTOMER",
      entityId: customer.backendId ?? customer.code,
      createdAt
    });
  }

  for (const bon of bons) {
    if (bon.deletedAt || bon.isBonus) continue;
    const entityId = bon.backendId ?? bon.number;

    if (bon.status === "Piutang") {
      const age = ageInDays(bon.date, now);
      if (age >= overdueDays) {
        notifications.push({
          id: notificationId("receivable-overdue", entityId),
          eventKey: "receivable-overdue",
          category: "RECEIVABLE",
          severity: age >= overdueDays * 2 ? "CRITICAL" : "WARNING",
          title: "Piutang melewati batas umur",
          message: `${bon.number} telah berumur ${age} hari dan perlu ditindaklanjuti.`,
          targetUrl: `#/bon/${encodeURIComponent(bon.number)}`,
          entityType: "BON",
          entityId,
          createdAt
        });
      }
    }

    if (bon.status === "Void") {
      notifications.push({
        id: notificationId("bon-void", entityId),
        eventKey: "bon-void",
        category: "TRANSACTION",
        severity: "WARNING",
        title: "Bon telah di-Void",
        message: `${bon.number} dibatalkan dan tetap tersimpan dalam riwayat audit.`,
        targetUrl: `#/bon/${encodeURIComponent(bon.number)}`,
        entityType: "BON",
        entityId,
        createdAt
      });
    }

    if (hasNegativeProfit(bon, products)) {
      notifications.push({
        id: notificationId("negative-profit", entityId),
        eventKey: "negative-profit",
        category: "TRANSACTION",
        severity: "CRITICAL",
        title: "Transaksi dengan laba negatif",
        message: `${bon.number} memiliki laba negatif dan memerlukan perhatian Owner.`,
        targetUrl: `#/bon/${encodeURIComponent(bon.number)}`,
        entityType: "BON",
        entityId,
        createdAt
      });
    }
  }

  return deduplicateNotifications(notifications)
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || right.createdAt.localeCompare(left.createdAt));
}

export function deduplicateNotifications(notifications: AppNotification[]) {
  const result = new Map<string, AppNotification>();
  for (const notification of notifications) {
    const key = notificationId(notification.eventKey, notification.entityId);
    const current = result.get(key);
    if (!current || severityRank(notification.severity) >= severityRank(current.severity)) {
      result.set(key, { ...notification, id: key });
    }
  }
  return [...result.values()];
}

function ageInDays(dateOnly: string, now: Date) {
  const source = new Date(`${dateOnly.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(source.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - source.getTime()) / 86_400_000));
}

function hasNegativeProfit(bon: StoredBon, products: StoredProduct[]) {
  if (bon.isBonus || bon.status === "Void") return false;
  const totalProfit = bon.lines.reduce((sum, line) => {
    const product = products.find((entry) => entry.id === line.productId || entry.backendId === line.backendProductId);
    const basePrice = line.snapshotBasePrice ?? product?.basePrice ?? 0;
    const costPrice = line.snapshotCostPrice ?? product?.costPrice ?? 0;
    const discounts = line.snapshotDiscounts ?? [];
    const discounted = discounts.reduce((price, discount) => Math.floor(price * (100 - discount) / 100), basePrice);
    const finalPrice = Math.floor((discounted + 50) / 100) * 100;
    return sum + (finalPrice - costPrice) * line.quantity;
  }, 0);
  return totalProfit < 0;
}

function severityRank(severity: AppNotification["severity"]) {
  return ({ INFO: 1, SUCCESS: 2, WARNING: 3, CRITICAL: 4 } as const)[severity];
}
