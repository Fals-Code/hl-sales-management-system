import type { PrismaClient } from "@prisma/client";
import { CustomerService } from "./customerService";
import { NotificationDomainService } from "./notificationDomainService";

export class CustomerNotificationService extends CustomerService {
  constructor(db: PrismaClient, private readonly domain: NotificationDomainService) {
    super(db);
  }

  override async createCustomer(input: Parameters<CustomerService["createCustomer"]>[0]) {
    const customer = await super.createCustomer(input);
    const userId = await this.domain.resolveUserId();
    await this.domain.customer(userId, "created", customer).catch(() => undefined);
    return customer;
  }

  override async updateCustomer(input: Parameters<CustomerService["updateCustomer"]>[0]) {
    const customer = await super.updateCustomer(input);
    const userId = await this.domain.resolveUserId(input.changedById);
    await this.domain.customer(userId, "updated", customer).catch(() => undefined);
    await this.domain.syncBonus(userId, customer.id).catch(() => undefined);
    return customer;
  }

  override async softDeleteCustomer(id: string) {
    const customer = await super.softDeleteCustomer(id);
    const userId = await this.domain.resolveUserId();
    await this.domain.customer(userId, "deactivated", customer).catch(() => undefined);
    return customer;
  }
}
