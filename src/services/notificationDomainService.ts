import type { PrismaClient } from "@prisma/client";
import { BonusService } from "./bonusService";
import { NotificationService } from "./notificationService";

export class NotificationDomainService {
  constructor(
    private readonly db: PrismaClient,
    private readonly notifications: NotificationService,
    private readonly bonus = new BonusService(db)
  ) {}

  async resolveUserId(explicitUserId?: string) {
    if (explicitUserId) return explicitUserId;
    const user = await this.db.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!user) throw new Error("Notification user is not available.");
    return user.id;
  }

  async auth(userId: string, action: "login" | "logout" | "login-failed") {
    const copy = {
      login: { severity: "INFO" as const, title: "Login berhasil", message: "Sesi pengguna berhasil dimulai." },
      logout: { severity: "INFO" as const, title: "Logout berhasil", message: "Sesi pengguna telah diakhiri." },
      "login-failed": { severity: "WARNING" as const, title: "Percobaan login gagal", message: "Terdapat percobaan login dengan kredensial yang tidak valid." }
    };
    const selected = copy[action];
    await this.notifications.publish({
      userId,
      eventKey: `auth-${action}`,
      category: "SECURITY",
      severity: selected.severity,
      title: selected.title,
      message: selected.message,
      targetUrl: "#/settings",
      entityId: "global",
      expiresAt: new Date(Date.now() + 7 * 86_400_000)
    });
  }

  async customer(userId: string, action: "created" | "updated" | "deactivated", customer: { id: string; name: string }) {
    const titles = {
      created: "Pelanggan berhasil ditambahkan",
      updated: "Pelanggan berhasil diperbarui",
      deactivated: "Pelanggan dinonaktifkan"
    };
    const verbs = { created: "ditambahkan", updated: "diperbarui", deactivated: "dinonaktifkan" };
    await this.notifications.publish({
      userId,
      eventKey: `customer-${action}`,
      category: "SYSTEM",
      severity: action === "deactivated" ? "WARNING" : "SUCCESS",
      title: titles[action],
      message: `${customer.name} telah ${verbs[action]}.`,
      targetUrl: "#/customers",
      entityType: "CUSTOMER",
      entityId: customer.id
    });
  }

  async product(userId: string, action: "created" | "updated" | "deactivated", product: { id: string; name: string }) {
    const titles = {
      created: "Produk berhasil ditambahkan",
      updated: "Produk berhasil diperbarui",
      deactivated: "Produk dinonaktifkan"
    };
    const verbs = { created: "ditambahkan", updated: "diperbarui", deactivated: "dinonaktifkan" };
    await this.notifications.publish({
      userId,
      eventKey: `product-${action}`,
      category: "INVENTORY",
      severity: action === "deactivated" ? "WARNING" : "SUCCESS",
      title: titles[action],
      message: `${product.name} telah ${verbs[action]}.`,
      targetUrl: "#/products",
      entityType: "PRODUCT",
      entityId: product.id
    });
    if (action === "deactivated") await this.notifications.resolve(userId, "inventory-stock", product.id);
    else await this.notifications.syncInventory(userId, [product.id]);
  }

  async bon(userId: string, action: "created" | "updated" | "deactivated" | "voided" | "bonus-created", bonId: string) {
    const bon = await this.db.bon.findUniqueOrThrow({ where: { id: bonId }, include: { items: true } });
    const copy = {
      created: { title: "Bon berhasil dibuat", message: `${bon.bonNumber} telah disimpan sebagai Piutang.`, severity: "SUCCESS" as const, category: "TRANSACTION" as const },
      updated: { title: "Bon berhasil diperbarui", message: `Perubahan pada ${bon.bonNumber} telah disimpan.`, severity: "SUCCESS" as const, category: "TRANSACTION" as const },
      deactivated: { title: "Bon dinonaktifkan", message: `${bon.bonNumber} dinonaktifkan dan riwayat tetap tersimpan.`, severity: "WARNING" as const, category: "TRANSACTION" as const },
      voided: { title: "Bon telah di-Void", message: `${bon.bonNumber} dibatalkan dan tersimpan dalam riwayat audit.`, severity: "WARNING" as const, category: "TRANSACTION" as const },
      "bonus-created": { title: "Bonus Bon berhasil dibuat", message: `${bon.bonNumber} telah dibuat dan saldo bonus diperbarui.`, severity: "SUCCESS" as const, category: "BONUS" as const }
    };
    const selected = copy[action];
    await this.notifications.publish({
      userId,
      eventKey: action === "voided" ? "bon-void" : `bon-${action}`,
      category: selected.category,
      severity: selected.severity,
      title: selected.title,
      message: selected.message,
      targetUrl: `#/bon/${encodeURIComponent(bon.bonNumber)}`,
      entityType: "BON",
      entityId: bon.id
    });

    if (bon.hasNegativeProfit && bon.status !== "VOID" && !bon.deletedAt) {
      await this.notifications.publish({
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
    } else {
      await this.notifications.resolve(userId, "negative-profit", bon.id);
    }

    const productIds = [...new Set(bon.items.map((item) => item.productId).filter((id): id is string => Boolean(id)))];
    if (productIds.length) await this.notifications.syncInventory(userId, productIds);
    await this.syncBonus(userId, bon.customerId);
  }

  async payment(userId: string, action: "settled" | "canceled", paymentId: string) {
    const payment = await this.db.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await this.notifications.publish({
      userId,
      eventKey: action === "settled" ? "payment-settled" : "payment-canceled",
      category: "PAYMENT",
      severity: action === "settled" ? "SUCCESS" : "WARNING",
      title: action === "settled" ? "Pelunasan berhasil" : "Pembayaran dibatalkan",
      message: action === "settled"
        ? `${payment.paymentNumber} berhasil mencatat pelunasan.`
        : `${payment.paymentNumber} dibatalkan dengan otorisasi Owner.`,
      targetUrl: "#/settlements",
      entityType: "PAYMENT",
      entityId: payment.id
    });
    await this.syncBonus(userId, payment.customerId);
  }

  async syncBonus(userId: string, customerId: string) {
    const [customer, availability] = await Promise.all([
      this.db.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } }),
      this.bonus.getAvailability(customerId)
    ]);
    if (!customer) return;
    await this.notifications.syncBonusEligibility({
      userId,
      customerId: customer.id,
      customerName: customer.name,
      availableUnits: availability.availableUnits
    });
  }
}
