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

export async function apiRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      signal: controller.signal
    });
    const payload = await readPayload<T>(response);
    if (!response.ok || !payload.success) {
      const failure = payload as ApiFailure;
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

async function readPayload<T>(response: Response): Promise<ApiSuccess<T> | ApiFailure> {
  try {
    return await response.json() as ApiSuccess<T> | ApiFailure;
  } catch {
    return { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Respons server tidak valid." } };
  }
}

export const bonApi = {
  validateNumber: (bonNumber: string, excludeId?: string) => {
    const query = new URLSearchParams({ bonNumber });
    if (excludeId) query.set("excludeId", excludeId);
    return apiRequest<{ available: boolean }>(`/api/v1/bons/validate-number?${query.toString()}`);
  },
  preview: <T>(payload: unknown) => apiRequest<T>("/api/v1/bons/preview", { method: "POST", body: JSON.stringify(payload) }),
  create: <T>(payload: unknown) => apiRequest<T>("/api/v1/bons", { method: "POST", body: JSON.stringify(payload) }),
  update: <T>(id: string, payload: unknown) => apiRequest<T>(`/api/v1/bons/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) })
};
