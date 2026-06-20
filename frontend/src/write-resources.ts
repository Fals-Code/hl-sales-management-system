import { apiRequest } from "./api-client";
import type { ApiCustomerDto, ApiProductDto, ApiProductType } from "./hydration-api";
import { emitAppNotification, emitAppToast } from "./notification-events";

export type CustomerWriteInput = {
  code: string;
  name: string;
  phone?: string;
  address?: string;
  bonusThreshold: number;
  discountTiers: Array<{ productType: ApiProductType; sequence: number; percentBps: number }>;
};

export type ProductWriteInput = {
  sku: string;
  name: string;
  type: ApiProductType;
  stock: number;
  costPrice: number;
  basePrice: number;
};

type PaymentDto = {
  id: string;
  customerId: string;
  canceledAt: string | null;
  bons: Array<{ bonId: string; reversedAt: string | null }>;
};

export const customerResourceApi = {
  create: (payload: CustomerWriteInput) => apiRequest<ApiCustomerDto>("/api/v1/customers", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  update: (id: string, payload: Omit<CustomerWriteInput, "code">) => apiRequest<ApiCustomerDto>(`/api/v1/customers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }),
  remove: (id: string) => apiRequest<ApiCustomerDto>(`/api/v1/customers/${encodeURIComponent(id)}`, {
    method: "DELETE"
  })
};

export const productResourceApi = {
  create: (payload: ProductWriteInput) => apiRequest<ApiProductDto>("/api/v1/products", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  update: (id: string, payload: Omit<ProductWriteInput, "sku" | "type">) => apiRequest<ApiProductDto>(`/api/v1/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }),
  remove: (id: string) => apiRequest<ApiProductDto>(`/api/v1/products/${encodeURIComponent(id)}`, {
    method: "DELETE"
  })
};

export const settlementResourceApi = {
  settle: async (customerId: string, bonIds: string[], settlementDate: string) => {
    const result = await apiRequest<PaymentDto>("/api/v1/settlements", {
      method: "POST",
      body: JSON.stringify({ customerId, bonIds, settlementDate: toIsoDate(settlementDate) })
    });
    emitAppToast({ severity: "SUCCESS", title: "Pelunasan berhasil", message: `${bonIds.length} Bon telah ditandai Lunas.` });
    return result;
  },
  cancelForBon: async (customerId: string, bonId: string, ownerPin: string, reason: string) => {
    const payments = await apiRequest<PaymentDto[]>(`/api/v1/payments?customerId=${encodeURIComponent(customerId)}&status=active&limit=100&sortOrder=desc`);
    const payment = payments.find((candidate) => candidate.bons.some((link) => link.bonId === bonId && !link.reversedAt));
    if (!payment) throw new Error("Pembayaran aktif untuk Bon ini tidak ditemukan.");
    const result = await apiRequest<PaymentDto>(`/api/v1/payments/${encodeURIComponent(payment.id)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ ownerPin, reason })
    });
    emitAppToast({ severity: "WARNING", title: "Pembayaran dibatalkan", message: "Status dan pengakuan cash basis telah dikembalikan." });
    emitAppNotification({
      eventKey: "payment-canceled",
      category: "PAYMENT",
      severity: "WARNING",
      title: "Pembayaran dibatalkan",
      message: "Pembayaran dibatalkan dengan otorisasi Owner dan tersimpan dalam audit.",
      targetUrl: "#/settlements",
      entityType: "PAYMENT",
      entityId: payment.id
    });
    return result;
  }
};

export const transactionResourceApi = {
  void: async (bonId: string, ownerPin: string, reason: string) => {
    const result = await apiRequest(`/api/v1/bons/${encodeURIComponent(bonId)}/void`, {
      method: "POST",
      body: JSON.stringify({ ownerPin, reason })
    });
    emitAppToast({ severity: "WARNING", title: "Bon berhasil di-Void", message: "Transaksi dibatalkan dan jejak audit tetap tersimpan." });
    emitAppNotification({
      eventKey: "bon-void",
      category: "TRANSACTION",
      severity: "WARNING",
      title: "Bon telah di-Void",
      message: "Bon dibatalkan dengan otorisasi Owner.",
      targetUrl: "#/bons",
      entityType: "BON",
      entityId: bonId
    });
    return result;
  }
};

function toIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
}
