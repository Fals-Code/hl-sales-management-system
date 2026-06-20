import { apiRequest } from "./api-client";
import type { AppNotification, NotificationCategory } from "./notification-events";

export type NotificationListResponse = {
  items: AppNotification[];
  unreadCount: number;
  nextCursor: string | null;
};

export const notificationApi = {
  list: (input: { mode?: "ALL" | "UNREAD"; category?: NotificationCategory; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (input.mode) query.set("mode", input.mode);
    if (input.category) query.set("category", input.category);
    if (input.limit) query.set("limit", String(input.limit));
    const suffix = query.size ? `?${query.toString()}` : "";
    return apiRequest<NotificationListResponse>(`/api/v1/notifications${suffix}`);
  },
  markRead: (id: string) => apiRequest<AppNotification>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
  markAllRead: () => apiRequest<{ updated: number }>("/api/v1/notifications/read-all", { method: "POST" }),
  dismiss: (id: string) => apiRequest<AppNotification>(`/api/v1/notifications/${encodeURIComponent(id)}`, { method: "DELETE" })
};
