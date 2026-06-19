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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
export const useApi = import.meta.env.VITE_USE_API === "true";
export const SESSION_EXPIRED_EVENT = "hl:session-expired";

export async function apiRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
      signal: controller.signal
    });
    const payload = await readPayload<T>(response);
    if (!response.ok || !payload.success) {
      const failure = payload as ApiFailure;
      if (response.status === 401 && path !== "/api/v1/auth/login") {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      }
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
      throw new ApiClientError("REQUEST_TIMEOUT", "Server terlalu lama merespons.");
    }
    throw new ApiClientError("NETWORK_ERROR", "Tidak dapat terhubung ke server.");
  } finally {
    window.clearTimeout(timer);
  }
}

export async function downloadApiFile(path: string, fallbackFilename: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/pdf" }
  });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    let failure: ApiFailure | undefined;
    try {
      failure = await response.json() as ApiFailure;
    } catch {
      failure = undefined;
    }
    throw new ApiClientError(
      failure?.error?.code || "DOWNLOAD_FAILED",
      failure?.error?.message || "File gagal diunduh.",
      failure?.error?.fields || {},
      response.status
    );
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = responseFilename(response.headers.get("Content-Disposition")) || fallbackFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
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
  create: <T>(payload: unknown) => apiRequest<T>("/api/v1/bons", { method: "POST", body: JSON.stringify(payload) }),
  update: <T>(id: string, payload: unknown) => apiRequest<T>(`/api/v1/bons/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  remove: <T>(id: string) => apiRequest<T>(`/api/v1/bons/${encodeURIComponent(id)}`, { method: "DELETE" })
};

export const bonusBonApi = {
  create: <T>(payload: unknown) => apiRequest<T>("/api/v1/bonus-bons", { method: "POST", body: JSON.stringify(payload) })
};
