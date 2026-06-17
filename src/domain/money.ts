import { ValidationError } from "./errors";

export function toSafeMoneyNumber(value: number | bigint | null | undefined, field = "money"): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new ValidationError(`${field} must be a safe integer.`);
    return value;
  }
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  const min = BigInt(Number.MIN_SAFE_INTEGER);
  if (value > max || value < min) {
    throw new ValidationError(`${field} exceeds JavaScript safe integer range.`);
  }
  return Number(value);
}

export function toDbMoney(value: number | bigint, field = "money"): bigint {
  if (typeof value === "bigint") return value;
  if (!Number.isSafeInteger(value)) throw new ValidationError(`${field} must be a safe integer.`);
  return BigInt(value);
}
