import type { Prisma, PrismaClient } from "@prisma/client";
import { BusinessError } from "../domain/errors";

export type InventoryItem = {
  productId?: string | null;
  quantity: number;
};

type InventoryDb = Prisma.TransactionClient | PrismaClient;

type StockRow = {
  id: string;
  name: string;
  stock: number;
  deletedAt: Date | null;
};

export async function assertInventoryAvailable(tx: InventoryDb, items: InventoryItem[]) {
  for (const [productId, quantity] of aggregateInventoryItems(items)) {
    const product = await readStock(tx, productId);
    if (!product || product.deletedAt) throw new BusinessError("One or more products are invalid.");
    if (product.stock < quantity) throw insufficientStock(product.name, product.stock, quantity);
  }
}

export async function reserveInventory(tx: InventoryDb, items: InventoryItem[]) {
  for (const [productId, quantity] of aggregateInventoryItems(items)) {
    const updated = await tx.$executeRaw`
      UPDATE "Product"
      SET "stock" = "stock" - ${quantity}, "updatedAt" = NOW()
      WHERE "id" = ${productId}
        AND "deletedAt" IS NULL
        AND "stock" >= ${quantity}
    `;

    if (updated !== 1) {
      const product = await readStock(tx, productId);
      if (!product || product.deletedAt) throw new BusinessError("One or more products are invalid.");
      throw insufficientStock(product.name, product.stock, quantity);
    }
  }
}

export async function restoreInventory(tx: InventoryDb, items: InventoryItem[]) {
  for (const [productId, quantity] of aggregateInventoryItems(items)) {
    const updated = await tx.$executeRaw`
      UPDATE "Product"
      SET "stock" = "stock" + ${quantity}, "updatedAt" = NOW()
      WHERE "id" = ${productId}
    `;
    if (updated !== 1) throw new BusinessError("Product inventory could not be restored.");
  }
}

export function aggregateInventoryItems(items: InventoryItem[]) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (!item.productId) continue;
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new BusinessError("Inventory quantity must be a positive integer.");
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return [...quantities.entries()].sort(([left], [right]) => left.localeCompare(right));
}

async function readStock(tx: InventoryDb, productId: string) {
  const rows = await tx.$queryRaw<StockRow[]>`
    SELECT "id", "name", "stock", "deletedAt"
    FROM "Product"
    WHERE "id" = ${productId}
    LIMIT 1
  `;
  return rows[0];
}

function insufficientStock(name: string, available: number, requested: number) {
  return new BusinessError(`Stok ${name} tidak mencukupi. Tersedia ${available} unit, diminta ${requested} unit.`);
}
