export const BON_NUMBER_PATTERN = /^(BON|BONUS)-\d{8}-\d{3}$/;

export const normalizeBonNumber = (value: string) => value.trim().toUpperCase();

export const isValidBonNumber = (value: string) => BON_NUMBER_PATTERN.test(normalizeBonNumber(value));
