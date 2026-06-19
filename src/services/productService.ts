import { PrismaClient } from "@prisma/client";
import { BusinessError } from "../domain/errors";
import { ProductTypeValue } from "../domain/constants";
import { assertNonNegativeMoney, assertProductType } from "../domain/validation";
import { toDbMoney, toSafeMoneyNumber } from "../domain/money";

export class ProductService {
  constructor(private readonly db: PrismaClient) {}

  async createProduct(input: {
    sku?: string;
    name: string;
    type: ProductTypeValue;
    stock: number;
    costPrice: number;
    basePrice: number;
  }) {
    validateProduct(input);
    return this.db.product.create({
      data: {
        ...input,
        costPrice: toDbMoney(input.costPrice, "costPrice"),
        basePrice: toDbMoney(input.basePrice, "basePrice")
      }
    });
  }

  async updateProduct(input: {
    id: string;
    sku?: string | null;
    name?: string;
    type?: ProductTypeValue;
    stock?: number;
    costPrice?: number;
    basePrice?: number;
  }) {
    const product = await this.db.product.findFirst({ where: { id: input.id, deletedAt: null } });
    if (!product) throw new BusinessError("Product not found.");
    validateProduct({
      name: input.name ?? product.name,
      type: input.type ?? product.type,
      stock: input.stock ?? product.stock,
      costPrice: input.costPrice ?? toSafeMoneyNumber(product.costPrice, "costPrice"),
      basePrice: input.basePrice ?? toSafeMoneyNumber(product.basePrice, "basePrice")
    });
    return this.db.product.update({
      where: { id: input.id },
      data: {
        sku: input.sku,
        name: input.name,
        type: input.type,
        stock: input.stock,
        costPrice: input.costPrice === undefined ? undefined : toDbMoney(input.costPrice, "costPrice"),
        basePrice: input.basePrice === undefined ? undefined : toDbMoney(input.basePrice, "basePrice")
      }
    });
  }

  async softDeleteProduct(id: string) {
    return this.db.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

function validateProduct(input: { name: string; type?: string; stock: number; costPrice: number; basePrice: number }) {
  if (!input.name.trim()) throw new BusinessError("Product name is required.");
  if (input.type) assertProductType(input.type);
  if (!Number.isSafeInteger(input.stock) || input.stock < 0) throw new BusinessError("stock must be a non-negative integer.");
  assertNonNegativeMoney(input.costPrice, "costPrice");
  assertNonNegativeMoney(input.basePrice, "basePrice");
}
