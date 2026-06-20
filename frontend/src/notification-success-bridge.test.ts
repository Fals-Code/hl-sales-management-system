import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_NOTIFICATION_EVENT,
  APP_TOAST_EVENT,
  type AppNotification,
  type AppToast
} from "./notification-events";
import { installSuccessToastNotificationBridge } from "./notification-success-bridge";

class TestCustomEvent<T> extends Event {
  readonly detail: T;

  constructor(type: string, init: { detail: T }) {
    super(type);
    this.detail = init.detail;
  }
}

describe("success toast notification bridge", () => {
  beforeEach(() => {
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("CustomEvent", TestCustomEvent);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores a successful Bon action as an unread transaction notification event", () => {
    const received: AppNotification[] = [];
    window.addEventListener(APP_NOTIFICATION_EVENT, (event) => {
      received.push((event as CustomEvent<AppNotification>).detail);
    });

    installSuccessToastNotificationBridge();
    const toast: AppToast = {
      id: "toast-create-bon",
      severity: "SUCCESS",
      title: "Bon berhasil dibuat",
      message: "Transaksi telah disimpan.",
      createdAt: "2026-06-20T06:00:00.000Z"
    };
    window.dispatchEvent(new CustomEvent<AppToast>(APP_TOAST_EVENT, { detail: toast }));

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      id: "action-success:toast-create-bon",
      eventKey: "action-success",
      category: "TRANSACTION",
      severity: "SUCCESS",
      title: "Bon berhasil dibuat",
      targetUrl: "#/bons",
      createdAt: toast.createdAt
    });
  });

  it("does not copy warning toasts that already have explicit domain notifications", () => {
    const received: AppNotification[] = [];
    window.addEventListener(APP_NOTIFICATION_EVENT, (event) => {
      received.push((event as CustomEvent<AppNotification>).detail);
    });

    installSuccessToastNotificationBridge();
    const toast: AppToast = {
      id: "toast-warning",
      severity: "WARNING",
      title: "Pembayaran dibatalkan",
      message: "Status dikembalikan.",
      createdAt: "2026-06-20T06:01:00.000Z"
    };
    window.dispatchEvent(new CustomEvent<AppToast>(APP_TOAST_EVENT, { detail: toast }));

    expect(received).toHaveLength(0);
  });
});
