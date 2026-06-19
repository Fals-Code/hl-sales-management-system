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
    const { stock, ...productInput } = input;
    return this.db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productInput,
          costPrice: toDbMoney(input.costPrice, "costPrice"),
          basePrice: toDbMoney(input.basePrice, "basePrice")
        }
      });
      await tx.$executeRaw`UPDATE "Product" SET "stock" = ${stock} WHERE "id" = ${product.id}`;
      return { ...product, stock };
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
    const currentStock = await this.readStock(product.id);
    validateProduct({
      name: input.name ?? product.name,
      type: input.type ?? product.type,
      stock: input.stock ?? currentStock,
      costPrice: input.costPrice ?? toSafeMoneyNumber(product.costPrice, "costPrice"),
      basePrice: input.basePrice ?? toSafeMoneyNumber(product.basePrice, "basePrice")
    });
    return this.db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: input.id },
        data: {
          sku: input.sku,
          name: input.name,
          type: input.type,
          costPrice: input.costPrice === undefined ? undefined : toDbMoney(input.costPrice, "costPrice"),
          basePrice: input.basePrice === undefined ? undefined : toDbMoney(input.basePrice, "basePrice")
        }
      });
      const stock = input.stock ?? currentStock;
      if (input.stock !== undefined) {
        await tx.$executeRaw`UPDATE "Product" SET "stock" = ${input.stock} WHERE "id" = ${input.id}`;
      }
      return { ...updated, stock };
    });
  }

  async softDeleteProduct(id: string) {
    const product = await this.db.product.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ...product, stock: await this.readStock(id) };
  }

  private async readStock(id: string) {
    const rows = await this.db.$queryRaw<Array<{ stock: number }>>`SELECT "stock" FROM "Product" WHERE "id" = ${id}`;
    return rows[0]?.stock ?? 0;
  }
}

function validateProduct(input: { name: string; type?: string; stock: number; costPrice: number; basePrice: number }) {
  if (!input.name.trim()) throw new BusinessError("Product name is required.");
  if (input.type) assertProductType(input.type);
  if (!Number.isSafeInteger(input.stock) || input.stock < 0) throw new BusinessError("stock must be a non-negative integer.");
  assertNonNegativeMoney(input.costPrice, "costPrice");
  assertNonNegativeMoney(input.basePrice, "basePrice");
}
