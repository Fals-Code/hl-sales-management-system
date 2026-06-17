export const BON_STATUS = {
  PIUTANG: "PIUTANG",
  LUNAS: "LUNAS",
  VOID: "VOID"
} as const;

export const PRODUCT_TYPE = {
  LM: "LM",
  BR: "BR"
} as const;

export const ITEM_KIND = {
  REGULER: "REGULER",
  BONUS: "BONUS"
} as const;

export const BONUS_MUTATION = {
  EARNED: "EARNED",
  USED: "USED",
  REVERSED: "REVERSED",
  ADJUSTMENT: "ADJUSTMENT"
} as const;

export const AUTHORIZATION_TYPE = {
  LOSS_TRANSACTION: "LOSS_TRANSACTION",
  VOID_BON: "VOID_BON",
  CANCEL_PAYMENT: "CANCEL_PAYMENT"
} as const;

export type ProductTypeValue = keyof typeof PRODUCT_TYPE;
export type BonItemKindValue = keyof typeof ITEM_KIND;
