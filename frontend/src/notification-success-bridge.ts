import {
  APP_NOTIFICATION_EVENT,
  APP_TOAST_EVENT,
  notificationId,
  type AppNotification,
  type AppToast,
  type NotificationCategory
} from "./notification-events";

const BRIDGE_FLAG = "__hlSuccessToastNotificationBridgeInstalled";

type BridgeWindow = Window & { [BRIDGE_FLAG]?: boolean };

export function installSuccessToastNotificationBridge() {
  if (typeof window === "undefined") return;

  const bridgeWindow = window as BridgeWindow;
  if (bridgeWindow[BRIDGE_FLAG]) return;
  bridgeWindow[BRIDGE_FLAG] = true;

  window.addEventListener(APP_TOAST_EVENT, (event) => {
    const toast = (event as CustomEvent<AppToast>).detail;
    if (!toast || toast.severity !== "SUCCESS") return;

    const destination = successDestination(toast.title);
    const entityId = toast.id;
    const notification: AppNotification = {
      id: notificationId("action-success", entityId),
      eventKey: "action-success",
      category: destination.category,
      severity: "SUCCESS",
      title: toast.title,
      message: toast.message,
      targetUrl: destination.targetUrl,
      entityId,
      createdAt: toast.createdAt,
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString()
    };

    window.dispatchEvent(new CustomEvent<AppNotification>(APP_NOTIFICATION_EVENT, { detail: notification }));
  });
}

function successDestination(title: string): { category: NotificationCategory; targetUrl: string } {
  const normalized = title.toLowerCase();
  if (normalized.includes("bonus")) return { category: "BONUS", targetUrl: "#/bonus" };
  if (normalized.includes("pelunasan") || normalized.includes("pembayaran")) return { category: "PAYMENT", targetUrl: "#/settlements" };
  if (normalized.includes("bon")) return { category: "TRANSACTION", targetUrl: "#/bons" };
  return { category: "SYSTEM", targetUrl: "#/dashboard" };
}
