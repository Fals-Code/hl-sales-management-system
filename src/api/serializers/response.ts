import { toSafeMoneyNumber } from "../../domain/money";

const hiddenKeys = new Set([
  "passwordHash",
  "ownerPinHash",
  "tokenHash",
  "negativeProfitAuthorizedById",
  "cancelAuthorizationId",
  "authorizationId"
]);

export function success(data: unknown = {}, meta: Record<string, unknown> = {}) {
  return { success: true, data: serialize(data), meta: serialize(meta) };
}

export function failure(code: string, message: string, fields: Record<string, unknown> = {}) {
  return { success: false, error: { code, message, fields: serialize(fields) } };
}

export function serialize(value: unknown): unknown {
  if (typeof value === "bigint") return toSafeMoneyNumber(value, "value");
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serialize(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !hiddenKeys.has(key))
      .map(([key, item]) => [key, serialize(item)])
  );
}
