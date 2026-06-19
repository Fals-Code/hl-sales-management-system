import { ValidationError } from "./errors";

export const BON_NUMBER_PATTERN = /^(BON|BONUS)-\d{8}-\d{3}$/;
export const BON_NUMBER_PATTERN_SOURCE = "^(BON|BONUS)-\\d{8}-\\d{3}$";

export function normalizeBonNumber(value: string) {
  return value.trim().toUpperCase();
}

export function assertBonNumber(value: string) {
  const normalized = normalizeBonNumber(value);
  if (!BON_NUMBER_PATTERN.test(normalized)) {
    throw new ValidationError("Nomor Bon harus menggunakan format BON-YYYYMMDD-NNN atau BONUS-YYYYMMDD-NNN.");
  }
  return normalized;
}
