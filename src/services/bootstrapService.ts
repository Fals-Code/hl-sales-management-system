import type { PrismaClient } from "@prisma/client";
import { BonusService } from "./bonusService";

export class BootstrapService {
  constructor(private readonly db: PrismaClient) {}

  async load() {
    const [customers, products, bons] = await Promise.all([
      this.db.customer.findMany({
        where: { deletedAt: null },
        include: {
          discountTiers: { orderBy: [{ productType: "asc" }, { sequence: "asc" }] },
          thresholdHistories: { orderBy: { effectiveFrom: "asc" } }
        },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }]
      }),
      this.db.product.findMany({
        where: { deletedAt: null },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }]
      }),
      this.db.bon.findMany({
        where: { deletedAt: null },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          customer: { select: { id: true, code: true, name: true } }
        },
        orderBy: [{ bonDate: "desc" }, { createdAt: "desc" }]
      })
    ]);

    const bonus = new BonusService(this.db);
    const customersWithAvailability = await Promise.all(
      customers.map(async (customer) => ({
        ...customer,
        bonusAvailability: await bonus.getAvailability(customer.id)
      }))
    );

    return {
      generatedAt: new Date(),
      customers: customersWithAvailability,
      products,
      bons
    };
  }
}
