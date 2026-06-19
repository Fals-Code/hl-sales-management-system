import { apiRequest } from "./api-client";

export const DEFAULT_PAGE_SIZE = 100;

export async function collectPages<T>(path: string, pageSize = DEFAULT_PAGE_SIZE): Promise<T[]> {
  const result: T[] = [];
  let page = 1;
  let batch: T[] = [];
  do {
    const query = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    const separator = path.includes("?") ? "&" : "?";
    batch = await apiRequest<T[]>(`${path}${separator}${query.toString()}`);
    result.push(...batch);
    page += 1;
  } while (batch.length === pageSize);
  return result;
}
