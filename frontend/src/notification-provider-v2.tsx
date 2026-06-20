import { AlertTriangle, CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApi } from "./api-client";
import { notificationApi } from "./notification-api";
import { APP_NOTIFICATION_EVENT, APP_TOAST_EVENT, type AppNotification, type AppToast } from "./notification-events";
import { buildActionableNotifications } from "./notification-logic";
import { subscribeNotificationStream } from "./notification-stream";
import { useAppStore } from "./store";

const LOCAL_KEY = "hl-general-notifications-v2";
const CACHE_KEY = "hl-notification-cache-v2";

type LocalEntry = { readAt?: string; dismissedAt?: string; notification?: AppNotification };
type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { customers, products, bons } = useAppStore();
  const [local, setLocal] = useState<Record<string, LocalEntry>>(readLocal);
  const [remote, setRemote] = useState<AppNotification[]>(readRemoteCache);
  const [remoteUnread, setRemoteUnread] = useState(() => readRemoteCache().filter((item) => !item.readAt).length);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [sessionActive, setSessionActive] = useState(() => window.localStorage.getItem("hl-demo-session") === "active");

  const derived = useMemo(
    () => useApi ? [] : buildActionableNotifications({ customers, products, bons }),
    [customers, products, bons]
  );

  const refreshRemote = useCallback(async () => {
    if (!useApi || !sessionActive) return;
    try {
      const result = await notificationApi.list({ limit: 200 });
      setRemote(result.items);
      setRemoteUnread(result.unreadCount);
    } catch {
      // Cache and local system notifications remain available while the backend is unreachable.
    }
  }, [sessionActive]);

  useEffect(() => {
    const syncSession = () => setSessionActive(window.localStorage.getItem("hl-demo-session") === "active");
    window.addEventListener("hashchange", syncSession);
    window.addEventListener("hl:session-expired", syncSession);
    return () => {
      window.removeEventListener("hashchange", syncSession);
      window.removeEventListener("hl:session-expired", syncSession);
    };
  }, []);

  useEffect(() => {
    if (!useApi || !sessionActive) return;
    void refreshRemote();
    return subscribeNotificationStream((notification) => {
      setRemote((current) => {
        const previous = current.find((item) => item.id === notification.id);
        setRemoteUnread((count) => Math.max(0, count + (!notification.readAt && (!previous || previous.readAt) ? 1 : 0)));
        return [notification, ...current.filter((item) => item.id !== notification.id)];
      });
    }, () => { void refreshRemote(); });
  }, [refreshRemote, sessionActive]);

  useEffect(() => window.localStorage.setItem(LOCAL_KEY, JSON.stringify(local)), [local]);
  useEffect(() => window.localStorage.setItem(CACHE_KEY, JSON.stringify(remote)), [remote]);

  useEffect(() => {
    const receiveNotification = (event: Event) => {
      const notification = (event as CustomEvent<AppNotification>).detail;
      if (!notification) return;
      if (useApi && notification.category !== "SYSTEM" && notification.category !== "SECURITY") return;
      setLocal((current) => ({
        ...current,
        [notification.id]: { ...current[notification.id], dismissedAt: undefined, notification }
      }));
    };
    const receiveToast = (event: Event) => {
      const toast = (event as CustomEvent<AppToast>).detail;
      if (!toast) return;
      setToasts((current) => current.some((item) => item.title === toast.title && item.message === toast.message)
        ? current
        : [...current.slice(-3), toast]);
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), toast.severity === "CRITICAL" ? 8_000 : 5_000);
    };
    window.addEventListener(APP_NOTIFICATION_EVENT, receiveNotification);
    window.addEventListener(APP_TOAST_EVENT, receiveToast);
    return () => {
      window.removeEventListener(APP_NOTIFICATION_EVENT, receiveNotification);
      window.removeEventListener(APP_TOAST_EVENT, receiveToast);
    };
  }, []);

  const notifications = useMemo(() => {
    const now = Date.now();
    const combined = new Map<string, AppNotification>();
    for (const notification of remote) combined.set(notification.id, notification);
    for (const notification of derived) {
      const state = local[notification.id];
      combined.set(notification.id, { ...notification, readAt: state?.readAt, dismissedAt: state?.dismissedAt });
    }
    for (const state of Object.values(local)) {
      const notification = state.notification;
      if (!notification || combined.has(notification.id)) continue;
      if (notification.expiresAt && new Date(notification.expiresAt).getTime() <= now) continue;
      combined.set(notification.id, { ...notification, readAt: state.readAt ?? notification.readAt, dismissedAt: state.dismissedAt ?? notification.dismissedAt });
    }
    return [...combined.values()]
      .filter((item) => !item.dismissedAt)
      .sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || right.createdAt.localeCompare(left.createdAt));
  }, [derived, local, remote]);

  const remoteIds = useMemo(() => new Set(remote.map((item) => item.id)), [remote]);
  const localUnread = notifications.filter((item) => !remoteIds.has(item.id) && !item.readAt).length;

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount: useApi ? remoteUnread + localUnread : notifications.filter((item) => !item.readAt).length,
    markRead: (id) => {
      if (useApi && remoteIds.has(id)) {
        setRemote((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
        setRemoteUnread((count) => Math.max(0, count - 1));
        void notificationApi.markRead(id).catch(() => refreshRemote());
        return;
      }
      setLocal((current) => ({ ...current, [id]: { ...current[id], readAt: current[id]?.readAt ?? new Date().toISOString() } }));
    },
    markAllRead: () => {
      const readAt = new Date().toISOString();
      setRemote((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      setRemoteUnread(0);
      setLocal((current) => {
        const next = { ...current };
        for (const item of notifications) next[item.id] = { ...next[item.id], readAt: next[item.id]?.readAt ?? readAt };
        return next;
      });
      if (useApi) void notificationApi.markAllRead().catch(() => refreshRemote());
    },
    dismiss: (id) => {
      if (useApi && remoteIds.has(id)) {
        const unread = remote.find((item) => item.id === id && !item.readAt);
        setRemote((current) => current.filter((item) => item.id !== id));
        if (unread) setRemoteUnread((count) => Math.max(0, count - 1));
        void notificationApi.dismiss(id).catch(() => refreshRemote());
        return;
      }
      setLocal((current) => ({ ...current, [id]: { ...current[id], dismissedAt: new Date().toISOString() } }));
    }
  }), [localUnread, notifications, refreshRemote, remote, remoteIds, remoteUnread]);

  return <NotificationContext.Provider value={value}>
    {children}
    <ToastViewport toasts={toasts} onClose={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
  </NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("NotificationProvider is required");
  return value;
}

function ToastViewport({ toasts, onClose }: { toasts: AppToast[]; onClose: (id: string) => void }) {
  return <div className="toast-viewport" aria-live="polite" aria-atomic="false">{toasts.map((toast) =>
    <article key={toast.id} className={`app-toast app-toast--${toast.severity.toLowerCase()}`} role={toast.severity === "CRITICAL" ? "alert" : "status"}>
      <span>{toastIcon(toast.severity)}</span><div><strong>{toast.title}</strong><p>{toast.message}</p></div>
      <button type="button" onClick={() => onClose(toast.id)} aria-label="Tutup pesan"><X size={17} /></button>
    </article>
  )}</div>;
}

function toastIcon(severity: AppNotification["severity"]) {
  if (severity === "SUCCESS") return <CircleCheck size={20} />;
  if (severity === "WARNING") return <AlertTriangle size={20} />;
  if (severity === "CRITICAL") return <CircleAlert size={20} />;
  return <Info size={20} />;
}

function severityRank(severity: AppNotification["severity"]) {
  return ({ INFO: 1, SUCCESS: 2, WARNING: 3, CRITICAL: 4 } as const)[severity];
}

function readLocal(): Record<string, LocalEntry> {
  try { return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "{}"); } catch { return {}; }
}
function readRemoteCache(): AppNotification[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
