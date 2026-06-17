import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  AuthService,
  CustomerService,
  ProductService,
  ReportingService,
  SettlementService,
  TransactionService,
  VoidService
} from "../src";

export type TestContext = Awaited<ReturnType<typeof createTestContext>>;

export async function createTestContext(name: string) {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? readDotEnvValue("TEST_DATABASE_URL");
  if (!databaseUrl) {
    throw new Error(`TEST_DATABASE_URL is required for PostgreSQL integration tests (${name}).`);
  }

  const prismaCli = resolve(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe"
  });

  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const auth = new AuthService(db);
  const customers = new CustomerService(db);
  const products = new ProductService(db);
  const transactions = new TransactionService(db, auth);
  const settlements = new SettlementService(db, auth);
  const voids = new VoidService(db, auth);
  const reports = new ReportingService(db);
  return Promise.resolve({ db, auth, customers, products, transactions, settlements, voids, reports });
}

function readDotEnvValue(key: string) {
  try {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const index = line.indexOf("=");
      if (index <= 0 || line.slice(0, index) !== key) continue;
      return line.slice(index + 1).replace(/^"|"$/g, "");
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function resetDb(db: PrismaClient) {
  await db.voidRecord.deleteMany();
  await db.bonusLedger.deleteMany();
  await db.paymentBon.deleteMany();
  await db.payment.deleteMany();
  await db.bonItem.deleteMany();
  await db.bon.deleteMany();
  await db.bonusThresholdHistory.deleteMany();
  await db.customerDiscountTier.deleteMany();
  await db.customer.deleteMany();
  await db.product.deleteMany();
  await db.authorizationRecord.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
}

export async function createUser(db: PrismaClient) {
  return db.user.create({
    data: {
      username: "owner",
      passwordHash: await bcrypt.hash("secret", 12),
      ownerPinHash: await bcrypt.hash("123456", 12)
    }
  });
}

export async function createFixture(ctx: TestContext, bonusThreshold = 100000) {
  const user = await createUser(ctx.db);
  const customer = await ctx.customers.createCustomer({
    name: "Toko Sinar",
    bonusThreshold,
    discountTiers: [
      { productType: "LM", sequence: 1, percentBps: 1000 },
      { productType: "LM", sequence: 2, percentBps: 500 },
      { productType: "BR", sequence: 1, percentBps: 2000 }
    ]
  });
  const lm = await ctx.products.createProduct({ name: "Logam Mulia", type: "LM", costPrice: 80000, basePrice: 100000 });
  const br = await ctx.products.createProduct({ name: "Barang Retail", type: "BR", costPrice: 30000, basePrice: 50000 });
  const loss = await ctx.products.createProduct({ name: "Loss", type: "BR", costPrice: 100000, basePrice: 50000 });
  return { user, customer, lm, br, loss };
}
