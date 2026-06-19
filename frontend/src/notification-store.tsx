import { AlertTriangle, CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAppStore } from "./store";
import { buildActionableNotifications } from "./notification-logic";
import { APP_NOTIFICATION_EVENT, APP_TOAST_EVENT, type AppNotification, type AppToast } from "./notification-events";

const STORAGE_KEY = "hl-general-notifications-v1";

type PersistedEntry = {
  readAt?: string;
  dismissedAt?: string;
  notification?: AppNotification;
};

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
  const [persisted, setPersisted] = useState<Record<string, PersistedEntry>>(readPersisted);
  const [toasts, setToasts] = useState<AppToast[]>([]);

  const derived = useMemo(
    () => buildActionableNotifications({ customers, products, bons }),
    [customers, products, bons]
  );

  const notifications = useMemo(() => {
    const now = Date.now();
    const combined = new Map<string, AppNotification>();

    for (const notification of derived) {
      const state = persisted[notification.id];
      combined.set(notification.id, {
        ...notification,
        readAt: state?.readAt,
        dismissedAt: state?.dismissedAt
      });
    }

    for (const state of Object.values(persisted)) {
      const notification = state.notification;
      if (!notification || combined.has(notification.id)) continue;
      if (notification.expiresAt && new Date(notification.expiresAt).getTime() <= now) continue;
      combined.set(notification.id, {
        ...notification,
        readAt: state.readAt ?? notification.readAt,
        dismissedAt: state.dismissedAt ?? notification.dismissedAt
      });
    }

    return [...combined.values()]
      .filter((notification) => !notification.dismissedAt)
      .sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || right.createdAt.localeCompare(left.createdAt));
  }, [derived, persisted]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [persisted]);

  useEffect(() => {
    const receiveNotification = (event: Event) => {
      const notification = (event as CustomEvent<AppNotification>).detail;
      if (!notification) return;
      setPersisted((current) => ({
        ...current,
        [notification.id]: {
          ...current[notification.id],
          dismissedAt: undefined,
          notification
        }
      }));
    };

    const receiveToast = (event: Event) => {
      const toast = (event as CustomEvent<AppToast>).detail;
      if (!toast) return;
      setToasts((current) => {
        const duplicate = current.some((entry) => entry.title === toast.title && entry.message === toast.message);
        return duplicate ? current : [...current.slice(-3), toast];
      });
      window.setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== toast.id));
      }, toast.severity === "CRITICAL" ? 8_000 : 5_000);
    };

    window.addEventListener(APP_NOTIFICATION_EVENT, receiveNotification);
    window.addEventListener(APP_TOAST_EVENT, receiveToast);
    return () => {
      window.removeEventListener(APP_NOTIFICATION_EVENT, receiveNotification);
      window.removeEventListener(APP_TOAST_EVENT, receiveToast);
    };
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.readAt).length,
    markRead: (id) => setPersisted((current) => ({
      ...current,
      [id]: { ...current[id], readAt: current[id]?.readAt ?? new Date().toISOString() }
    })),
    markAllRead: () => {
      const readAt = new Date().toISOString();
      setPersisted((current) => {
        const next = { ...current };
        for (const notification of notifications) {
          next[notification.id] = { ...next[notification.id], readAt: next[notification.id]?.readAt ?? readAt };
        }
        return next;
      });
    },
    dismiss: (id) => setPersisted((current) => ({
      ...current,
      [id]: { ...current[id], dismissedAt: new Date().toISOString() }
    }))
  }), [notifications]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("NotificationProvider is required");
  return value;
}

function ToastViewport({ toasts, onClose }: { toasts: AppToast[]; onClose: (id: string) => void }) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <article key={toast.id} className={`app-toast app-toast--${toast.severity.toLowerCase()}`} role={toast.severity === "CRITICAL" ? "alert" : "status"}>
          <span>{toastIcon(toast.severity)}</span>
          <div><strong>{toast.title}</strong><p>{toast.message}</p></div>
          <button type="button" onClick={() => onClose(toast.id)} aria-label="Tutup pesan"><X size={17} /></button>
        </article>
      ))}
    </div>
  );
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

function readPersisted(): Record<string, PersistedEntry> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
