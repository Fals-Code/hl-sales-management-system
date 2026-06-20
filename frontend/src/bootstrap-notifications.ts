import { useApi } from "./api-client";
import { installNotificationSessionBridge } from "./notification-session-bridge";
import { installSuccessToastNotificationBridge } from "./notification-success-bridge";
import { installResourceNotificationBridge } from "./resource-notification-bridge";

export function bootstrapNotifications() {
  if (useApi) installNotificationSessionBridge();
  else {
    installSuccessToastNotificationBridge();
    installResourceNotificationBridge();
  }
}
