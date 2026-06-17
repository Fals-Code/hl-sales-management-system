import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().min(1) }).strict();
export const optionalDateSchema = z.string().datetime().optional();
export const productTypeSchema = z.enum(["LM", "BR"]);
export const itemKindSchema = z.enum(["REGULER", "BONUS"]).optional();

export const booleanQuerySchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return value;
}, z.boolean());

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("asc")
  })
  .strict();

export const reportFilterSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(3000).optional(),
    customerId: z.string().min(1).optional(),
    productType: productTypeSchema.optional(),
    status: z.enum(["PIUTANG", "LUNAS", "VOID"]).optional(),
    transactionDateFrom: z.string().datetime().optional(),
    transactionDateTo: z.string().datetime().optional(),
    paymentDateFrom: z.string().datetime().optional(),
    paymentDateTo: z.string().datetime().optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.month === undefined) !== (value.year === undefined)) {
      ctx.addIssue({ code: "custom", path: [value.month === undefined ? "month" : "year"], message: "month and year must be provided together" });
    }
  });

export const moneySchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const quantitySchema = z.number().int().positive();
