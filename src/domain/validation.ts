import { PRODUCT_TYPE } from "./constants";
import { ValidationError } from "./errors";

export function assertNonNegativeMoney(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer Rupiah amount.`);
  }
}

export function assertPositiveQuantity(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError("Quantity must be greater than zero.");
  }
}

export function assertPercentBps(value: number, field = "discount percent") {
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new ValidationError(`${field} must be between 0 and 10000 basis points.`);
  }
}

export function assertProductType(value: string) {
  if (value !== PRODUCT_TYPE.LM && value !== PRODUCT_TYPE.BR) {
    throw new ValidationError("Product type must be LM or BR.");
  }
}
