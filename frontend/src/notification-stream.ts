import { resolveApiBaseUrl } from "./api-base-url";
import type { AppNotification } from "./notification-events";

export function subscribeNotificationStream(
  onNotification: (notification: AppNotification) => void,
  onOpen?: () => void
) {
  const baseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, window.location);
  const source = new EventSource(`${baseUrl}/api/v1/notifications/stream`, { withCredentials: true });

  source.addEventListener("notification", (event) => {
    try {
      const notification = JSON.parse((event as MessageEvent<string>).data) as AppNotification;
      onNotification(notification);
    } catch {
      return;
    }
  });
  source.addEventListener("open", () => onOpen?.());
  return () => source.close();
}
