export type NotificationCategory = "TRANSACTION" | "RECEIVABLE" | "PAYMENT" | "INVENTORY" | "BONUS" | "SECURITY" | "SYSTEM";
export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
export type NotificationEntityType = "BON" | "PAYMENT" | "CUSTOMER" | "PRODUCT";

export type AppNotification = {
  id: string;
  eventKey: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  targetUrl?: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
  expiresAt?: string;
};

export type AppNotificationInput = Omit<AppNotification, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type AppToast = {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt: string;
};

export const APP_NOTIFICATION_EVENT = "hl:app-notification";
export const APP_TOAST_EVENT = "hl:app-toast";

export function notificationId(eventKey: string, entityId?: string) {
  return `${eventKey}:${entityId || "global"}`;
}

export function emitAppNotification(input: AppNotificationInput) {
  if (typeof window === "undefined") return;
  const notification: AppNotification = {
    ...input,
    id: input.id || notificationId(input.eventKey, input.entityId),
    createdAt: input.createdAt || new Date().toISOString()
  };
  window.dispatchEvent(new CustomEvent<AppNotification>(APP_NOTIFICATION_EVENT, { detail: notification }));
}

export function emitAppToast(input: Omit<AppToast, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const toast: AppToast = {
    ...input,
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  };
  window.dispatchEvent(new CustomEvent<AppToast>(APP_TOAST_EVENT, { detail: toast }));
}
