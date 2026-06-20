import { AlertTriangle, Bell, CheckCheck, CircleAlert, CircleCheck, Info, Package, Sparkles, Trash2, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "./notification-store";
import type { AppNotification, NotificationCategory } from "./notification-events";

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, unreadCount, markRead, markAllRead, dismiss } = useNotifications();
  const [mode, setMode] = useState<"ALL" | "UNREAD">("ALL");
  const [category, setCategory] = useState<"ALL" | NotificationCategory>("ALL");

  if (!open) return null;

  const visible = notifications.filter((notification) => {
    if (mode === "UNREAD" && notification.readAt) return false;
    return category === "ALL" || notification.category === category;
  });

  const openNotification = (notification: AppNotification) => {
    markRead(notification.id);
    if (notification.targetUrl) window.location.hash = notification.targetUrl;
    onClose();
  };

  return (
    <section className="notification-center" aria-label="Pusat notifikasi">
      <header className="notification-center__header">
        <div><strong>Notifikasi</strong><span>{unreadCount} belum dibaca</span></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup notifikasi"><X size={19} /></button>
      </header>

      <div className="notification-center__toolbar">
        <div className="notification-center__tabs" role="tablist" aria-label="Filter status notifikasi">
          <button type="button" className={mode === "ALL" ? "is-active" : ""} onClick={() => setMode("ALL")}>Semua</button>
          <button type="button" className={mode === "UNREAD" ? "is-active" : ""} onClick={() => setMode("UNREAD")}>Belum dibaca</button>
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value as "ALL" | NotificationCategory)} aria-label="Filter kategori notifikasi">
          <option value="ALL">Semua kategori</option>
          <option value="RECEIVABLE">Piutang</option>
          <option value="PAYMENT">Pembayaran</option>
          <option value="TRANSACTION">Transaksi</option>
          <option value="INVENTORY">Persediaan</option>
          <option value="BONUS">Bonus</option>
          <option value="SECURITY">Keamanan</option>
          <option value="SYSTEM">Sistem</option>
        </select>
      </div>

      <div className="notification-center__bulk">
        <span>{visible.length} notifikasi ditampilkan</span>
        <button type="button" disabled={unreadCount === 0} onClick={markAllRead}><CheckCheck size={16} />Tandai semua dibaca</button>
      </div>

      <div className="notification-center__list">
        {visible.length === 0 ? (
          <div className="notification-center__empty"><Bell size={28} /><strong>Tidak ada notifikasi</strong><span>Semua kondisi pada filter ini sudah tertangani.</span></div>
        ) : visible.map((notification) => {
          const dismissAllowed = notification.severity !== "CRITICAL" || Boolean(notification.readAt);
          return (
            <article key={notification.id} className={`notification-item notification-item--${notification.severity.toLowerCase()} ${notification.readAt ? "is-read" : "is-unread"}`}>
              <button className="notification-item__main" type="button" onClick={() => openNotification(notification)}>
                <span className="notification-item__icon">{notificationIcon(notification)}</span>
                <span className="notification-item__copy"><strong>{notification.title}</strong><span>{notification.message}</span><small>{categoryLabel(notification.category)} · {formatNotificationTime(notification.createdAt)}</small></span>
                {!notification.readAt && <span className="notification-item__dot" aria-label="Belum dibaca" />}
              </button>
              <button className="notification-item__dismiss" type="button" disabled={!dismissAllowed} onClick={() => dismiss(notification.id)} aria-label={dismissAllowed ? "Tutup notifikasi" : "Baca notifikasi kritis sebelum menutup"}><Trash2 size={16} /></button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function notificationIcon(notification: AppNotification) {
  if (notification.category === "INVENTORY") return <Package size={20} />;
  if (notification.category === "BONUS") return <Sparkles size={20} />;
  if (notification.category === "RECEIVABLE" || notification.category === "PAYMENT") return <WalletCards size={20} />;
  if (notification.severity === "SUCCESS") return <CircleCheck size={20} />;
  if (notification.severity === "WARNING") return <AlertTriangle size={20} />;
  if (notification.severity === "CRITICAL") return <CircleAlert size={20} />;
  return <Info size={20} />;
}

function categoryLabel(category: NotificationCategory) {
  return ({ TRANSACTION: "Transaksi", RECEIVABLE: "Piutang", PAYMENT: "Pembayaran", INVENTORY: "Persediaan", BONUS: "Bonus", SECURITY: "Keamanan", SYSTEM: "Sistem" } as const)[category];
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Baru saja";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
