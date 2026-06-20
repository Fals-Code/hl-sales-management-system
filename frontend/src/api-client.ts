import { resolveApiBaseUrl } from "./api-base-url";
import { emitAppNotification, emitAppToast } from "./notification-events";

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, unknown> = {},
    public readonly status?: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: { code: string; message: string; fields?: Record<string, unknown> } };

type ApiFile = {
  blob: Blob;
  filename?: string;
};

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, window.location);
export const useApi = import.meta.env.VITE_USE_API === "true";
export const SESSION_EXPIRED_EVENT = "hl:session-expired";

export async function apiRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body !== undefined && init.body !== null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
      signal: controller.signal
    });
    const payload = await readPayload<T>(response);
    if (!response.ok || !payload.success) {
      const failure = payload as ApiFailure;
      if (response.status === 401 && path !== "/api/v1/auth/login") notifySessionExpired();
      throw new ApiClientError(
        failure.error?.code || "INTERNAL_SERVER_ERROR",
        failure.error?.message || "Permintaan gagal diproses.",
        failure.error?.fields || {},
        response.status
      );
    }
    return payload.data;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      notifyTransportFailure("REQUEST_TIMEOUT", "Server terlalu lama merespons.");
      throw new ApiClientError("REQUEST_TIMEOUT", "Server terlalu lama merespons.");
    }
    notifyTransportFailure("NETWORK_ERROR", "Tidak dapat terhubung ke server.");
    throw new ApiClientError("NETWORK_ERROR", "Tidak dapat terhubung ke server.");
  } finally {
    window.clearTimeout(timer);
  }
}

export async function createApiFileObjectUrl(path: string) {
  const file = await fetchApiFile(path);
  return {
    url: URL.createObjectURL(file.blob),
    filename: file.filename
  };
}

export async function downloadApiFile(path: string, fallbackFilename: string) {
  const file = await fetchApiFile(path);
  const objectUrl = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = file.filename || fallbackFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

async function fetchApiFile(path: string): Promise<ApiFile> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: { Accept: "application/pdf" }
    });

    if (!response.ok) {
      if (response.status === 401) notifySessionExpired();
      let failure: ApiFailure | undefined;
      try {
        failure = await response.json() as ApiFailure;
      } catch {
        failure = undefined;
      }
      throw new ApiClientError(
        failure?.error?.code || "DOWNLOAD_FAILED",
        failure?.error?.message || "File gagal dimuat.",
        failure?.error?.fields || {},
        response.status
      );
    }

    return {
      blob: await response.blob(),
      filename: responseFilename(response.headers.get("Content-Disposition"))
    };
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    notifyTransportFailure("NETWORK_ERROR", "File tidak dapat diambil karena koneksi ke server bermasalah.");
    throw new ApiClientError("NETWORK_ERROR", "Tidak dapat terhubung ke server.");
  }
}

async function readPayload<T>(response: Response): Promise<ApiSuccess<T> | ApiFailure> {
  try {
    return await response.json() as ApiSuccess<T> | ApiFailure;
  } catch {
    return { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Respons server tidak valid." } };
  }
}

function responseFilename(contentDisposition: string | null) {
  if (!contentDisposition) return undefined;
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1];
}

function notifySessionExpired() {
  const hadSession = window.localStorage.getItem("hl-demo-session") === "active";
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  if (!hadSession) return;
  emitAppToast({ severity: "WARNING", title: "Sesi berakhir", message: "Silakan masuk kembali untuk melanjutkan pekerjaan." });
  emitAppNotification({
    eventKey: "session-expired",
    category: "SECURITY",
    severity: "WARNING",
    title: "Sesi pengguna berakhir",
    message: "Sesi aplikasi telah berakhir dan memerlukan login ulang.",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString()
  });
}

function notifyTransportFailure(eventKey: string, message: string) {
  emitAppToast({ severity: "CRITICAL", title: "Koneksi backend bermasalah", message });
  emitAppNotification({
    eventKey,
    category: "SYSTEM",
    severity: "CRITICAL",
    title: "Koneksi backend bermasalah",
    message,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString()
  });
}

function withSuccessToast<T>(request: Promise<T>, title: string, message: string) {
  return request.then((value) => {
    emitAppToast({ severity: "SUCCESS", title, message });
    return value;
  });
}

export const authApi = {
  login: (username: string, password: string) => apiRequest<{ userId: string; expiresAt: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  }),
  logout: () => apiRequest<Record<string, never>>("/api/v1/auth/logout", { method: "POST" }),
  me: () => apiRequest<{ id: string; username: string }>("/api/v1/auth/me")
};

export const bonApi = {
  validateNumber: (bonNumber: string, excludeId?: string) => {
    const query = new URLSearchParams({ bonNumber });
    if (excludeId) query.set("excludeId", excludeId);
    return apiRequest<{ available: boolean }>(`/api/v1/bons/validate-number?${query.toString()}`);
  },
  preview: <T>(payload: unknown) => apiRequest<T>("/api/v1/bons/preview", { method: "POST", body: JSON.stringify(payload) }),
  create: <T>(payload: unknown) => withSuccessToast(apiRequest<T>("/api/v1/bons", { method: "POST", body: JSON.stringify(payload) }), "Bon berhasil dibuat", "Transaksi telah disimpan dan data aplikasi diperbarui."),
  update: <T>(id: string, payload: unknown) => withSuccessToast(apiRequest<T>(`/api/v1/bons/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }), "Bon berhasil diperbarui", "Perubahan transaksi Piutang telah disimpan."),
  remove: <T>(id: string) => withSuccessToast(apiRequest<T>(`/api/v1/bons/${encodeURIComponent(id)}`, { method: "DELETE" }), "Bon dinonaktifkan", "Bon disembunyikan dari transaksi aktif dan riwayat tetap tersimpan.")
};

export const bonusBonApi = {
  create: <T>(payload: unknown) => withSuccessToast(apiRequest<T>("/api/v1/bonus-bons", { method: "POST", body: JSON.stringify(payload) }), "Bonus Bon berhasil dibuat", "Unit bonus telah digunakan dan saldo bonus diperbarui.")
};
