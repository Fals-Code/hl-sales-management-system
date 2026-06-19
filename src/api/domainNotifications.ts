import type { ApiContext } from "./types";

export async function publishCustomerEvent(
  ctx: ApiContext,
  userId: string,
  action: "created" | "updated" | "deactivated",
  customer: { id: string; name: string }
) {
  const copy = {
    created: ["Pelanggan berhasil ditambahkan", `${customer.name} telah ditambahkan.`],
    updated: ["Pelanggan berhasil diperbarui", `${customer.name} telah diperbarui.`],
    deactivated: ["Pelanggan dinonaktifkan", `${customer.name} telah dinonaktifkan.`]
  } as const;
  const [title, message] = copy[action];
  await ctx.notifications.publish({
    userId,
    eventKey: `customer-${action}`,
    category: "SYSTEM",
    severity: action === "deactivated" ? "WARNING" : "SUCCESS",
    title,
    message,
    targetUrl: "#/customers",
    entityType: "CUSTOMER",
    entityId: customer.id
  });
}

export async function publishProductEvent(
  ctx: ApiContext,
  userId: string,
  action: "created" | "updated" | "deactivated",
  product: { id: string; name: string }
) {
  const copy = {
    created: ["Produk berhasil ditambahkan", `${product.name} telah ditambahkan.`],
    updated: ["Produk berhasil diperbarui", `${product.name} telah diperbarui.`],
    deactivated: ["Produk dinonaktifkan", `${product.name} telah dinonaktifkan.`]
  } as const;
  const [title, message] = copy[action];
  await ctx.notifications.publish({
    userId,
    eventKey: `product-${action}`,
    category: "INVENTORY",
    severity: action === "deactivated" ? "WARNING" : "SUCCESS",
    title,
    message,
    targetUrl: "#/products",
    entityType: "PRODUCT",
    entityId: product.id
  });
  if (action === "deactivated") await ctx.notifications.resolve(userId, "inventory-stock", product.id);
  else await ctx.notifications.syncInventory(userId, [product.id]);
}

export async function publishBonEvent(
  ctx: ApiContext,
  userId: string,
  action: "created" | "updated" | "deactivated" | "voided" | "bonus-created",
  bon: { id: string; bonNumber: string; customerId: string; hasNegativeProfit?: boolean; items?: Array<{ productId: string | null }> }
) {
  const copy = {
    created: ["Bon berhasil dibuat", `${bon.bonNumber} telah disimpan sebagai Piutang.`],
    updated: ["Bon berhasil diperbarui", `Perubahan pada ${bon.bonNumber} telah disimpan.`],
    deactivated: ["Bon dinonaktifkan", `${bon.bonNumber} dinonaktifkan dan riwayat tetap tersimpan.`],
    voided: ["Bon telah di-Void", `${bon.bonNumber} dibatalkan dan tersimpan dalam riwayat audit.`],
    "bonus-created": ["Bonus Bon berhasil dibuat", `${bon.bonNumber} telah dibuat dan saldo bonus diperbarui.`]
  } as const;
  const [title, message] = copy[action];
  await ctx.notifications.publish({
    userId,
    eventKey: action === "voided" ? "bon-void" : `bon-${action}`,
    category: action === "bonus-created" ? "BONUS" : "TRANSACTION",
    severity: action === "voided" || action === "deactivated" ? "WARNING" : "SUCCESS",
    title,
    message,
    targetUrl: `#/bon/${encodeURIComponent(bon.bonNumber)}`,
    entityType: "BON",
    entityId: bon.id
  });

  if (bon.hasNegativeProfit) {
    await ctx.notifications.publish({
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
    await ctx.notifications.resolve(userId, "negative-profit", bon.id);
  }

  const productIds = [...new Set((bon.items ?? []).map((item) => item.productId).filter((id): id is string => Boolean(id)))];
  if (productIds.length) await ctx.notifications.syncInventory(userId, productIds);
  await syncBonusEligibility(ctx, userId, bon.customerId);
}

export async function publishPaymentEvent(
  ctx: ApiContext,
  userId: string,
  action: "settled" | "canceled",
  payment: { id: string; paymentNumber: string; customerId: string; bons?: Array<{ bonId: string }> }
) {
  await ctx.notifications.publish({
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
  await syncBonusEligibility(ctx, userId, payment.customerId);
}

export async function syncBonusEligibility(ctx: ApiContext, userId: string, customerId: string) {
  const [customer, availability] = await Promise.all([
    ctx.db.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } }),
    ctx.bonus.getAvailability(customerId)
  ]);
  if (!customer) return;
  await ctx.notifications.syncBonusEligibility({
    userId,
    customerId: customer.id,
    customerName: customer.name,
    availableUnits: availability.availableUnits
  });
}
