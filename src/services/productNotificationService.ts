import type { PrismaClient } from "@prisma/client";
import { NotificationDomainService } from "./notificationDomainService";
import { ProductService } from "./productService";

export class ProductNotificationService extends ProductService {
  constructor(db: PrismaClient, private readonly domain: NotificationDomainService) {
    super(db);
  }

  override async createProduct(input: Parameters<ProductService["createProduct"]>[0]) {
    const product = await super.createProduct(input);
    const userId = await this.domain.resolveUserId();
    await this.domain.product(userId, "created", product).catch(() => undefined);
    return product;
  }

  override async updateProduct(input: Parameters<ProductService["updateProduct"]>[0]) {
    const product = await super.updateProduct(input);
    const userId = await this.domain.resolveUserId();
    await this.domain.product(userId, "updated", product).catch(() => undefined);
    return product;
  }

  override async softDeleteProduct(id: string) {
    const product = await super.softDeleteProduct(id);
    const userId = await this.domain.resolveUserId();
    await this.domain.product(userId, "deactivated", product).catch(() => undefined);
    return product;
  }
}
