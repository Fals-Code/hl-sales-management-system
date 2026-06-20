import type { ApiContext } from "./types";

const OVERDUE_DAYS = 30;

export async function syncNotificationConditions(ctx: ApiContext, userId: string) {
  await ctx.notifications.syncInventory(userId);

  const customers = await ctx.db.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true }
  });
  for (const customer of customers) {
    const availability = await ctx.bonus.getAvailability(customer.id);
    await ctx.notifications.syncBonusEligibility({
      userId,
      customerId: customer.id,
      customerName: customer.name,
      availableUnits: availability.availableUnits
    });
  }

  const cutoff = new Date(Date.now() - OVERDUE_DAYS * 86_400_000);
  const overdue = await ctx.db.bon.findMany({
    where: {
      status: "PIUTANG",
      deletedAt: null,
      bonDate: { lte: cutoff }
    },
    select: { id: true, bonNumber: true, bonDate: true }
  });
  const overdueIds = new Set(overdue.map((bon) => bon.id));
  for (const bon of overdue) {
    const age = Math.max(OVERDUE_DAYS, Math.floor((Date.now() - bon.bonDate.getTime()) / 86_400_000));
    await ctx.notifications.publish({
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

  const staleOverdue = await ctx.db.notification.findMany({
    where: { userId, eventKey: "receivable-overdue", dismissedAt: null },
    select: { entityId: true }
  });
  for (const notification of staleOverdue) {
    if (!overdueIds.has(notification.entityId)) {
      await ctx.notifications.resolve(userId, "receivable-overdue", notification.entityId);
    }
  }

  const negative = await ctx.db.bon.findMany({
    where: { hasNegativeProfit: true, status: { not: "VOID" }, deletedAt: null },
    select: { id: true, bonNumber: true }
  });
  const negativeIds = new Set(negative.map((bon) => bon.id));
  for (const bon of negative) {
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
  }

  const staleNegative = await ctx.db.notification.findMany({
    where: { userId, eventKey: "negative-profit", dismissedAt: null },
    select: { entityId: true }
  });
  for (const notification of staleNegative) {
    if (!negativeIds.has(notification.entityId)) {
      await ctx.notifications.resolve(userId, "negative-profit", notification.entityId);
    }
  }
}
