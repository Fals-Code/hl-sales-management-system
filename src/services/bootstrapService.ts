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
          thresholdHistories: { orderBy: { effectiveFrom: "asc" } },
          bonusLedgers: { orderBy: { createdAt: "desc" } }
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

    const availabilityService = new BonusService(this.db);
    const customersWithAvailability = await Promise.all(
      customers.map(async (customer) => {
        const { bonusLedgers, ...profile } = customer;
        return {
          ...profile,
          bonusAvailability: await availabilityService.getAvailability(customer.id),
          bonusHistory: bonusLedgers
        };
      })
    );

    const productsWithStock = await Promise.all(products.map(async (product) => {
      const rows = await this.db.$queryRaw<Array<{ stock: number }>>`SELECT "stock" FROM "Product" WHERE "id" = ${product.id}`;
      return { ...product, stock: rows[0]?.stock ?? 0 };
    }));

    return {
      generatedAt: new Date(),
      customers: customersWithAvailability,
      products: productsWithStock,
      bons
    };
  }
}
