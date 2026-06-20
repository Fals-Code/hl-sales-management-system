import { emitAppNotification, type NotificationCategory, type NotificationEntityType } from "./notification-events";

type ResourceAction = "created" | "updated" | "deactivated";
type ResourceKind = "customer" | "product";

type ResourceActionInput = {
  kind: ResourceKind;
  action: ResourceAction;
  name: string;
  entityId?: string;
  createdAt?: string;
};

const COPY: Record<ResourceKind, Record<ResourceAction, { title: string; verb: string }>> = {
  customer: {
    created: { title: "Pelanggan berhasil ditambahkan", verb: "ditambahkan" },
    updated: { title: "Pelanggan berhasil diperbarui", verb: "diperbarui" },
    deactivated: { title: "Pelanggan dinonaktifkan", verb: "dinonaktifkan" }
  },
  product: {
    created: { title: "Produk berhasil ditambahkan", verb: "ditambahkan" },
    updated: { title: "Produk berhasil diperbarui", verb: "diperbarui" },
    deactivated: { title: "Produk dinonaktifkan", verb: "dinonaktifkan" }
  }
};

export function emitResourceActionNotification({
  kind,
  action,
  name,
  entityId,
  createdAt = new Date().toISOString()
}: ResourceActionInput) {
  const copy = COPY[kind][action];
  const category: NotificationCategory = kind === "product" ? "INVENTORY" : "SYSTEM";
  const entityType: NotificationEntityType = kind === "product" ? "PRODUCT" : "CUSTOMER";
  const targetUrl = kind === "product" ? "#/products" : "#/customers";
  const actionInstanceId = `${entityId || name}:${createdAt}`;

  emitAppNotification({
    eventKey: `${kind}-${action}`,
    category,
    severity: action === "deactivated" ? "WARNING" : "SUCCESS",
    title: copy.title,
    message: `${name} telah ${copy.verb}.`,
    targetUrl,
    entityType,
    entityId: actionInstanceId,
    createdAt,
    expiresAt: new Date(new Date(createdAt).getTime() + 30 * 86_400_000).toISOString()
  });
}
