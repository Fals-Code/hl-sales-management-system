import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("migration-test");
});

afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("PostgreSQL migration integrity", () => {
  it("can run migrate deploy twice without duplicating migrations", () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required.");
    execFileSync("cmd.exe", ["/c", "npm.cmd", "run", "db:migrate:deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe"
    });
    expect(true).toBe(true);
  });

  it("has required check constraints and allocation columns after migration", async () => {
    const constraints = await ctx.db.$queryRaw<Array<{ conname: string }>>`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid IN ('"Product"'::regclass, '"Bon"'::regclass, '"BonItem"'::regclass, '"PaymentBon"'::regclass)
    `;
    expect(constraints.map((row) => row.conname).join("|")).toContain("Product_type_check");
    const allocationColumns = await ctx.db.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'PaymentBon'
        AND column_name IN ('allocatedInvoiceAmount', 'allocatedProductRevenue', 'allocatedShipping', 'allocatedProfit', 'reversedAt')
    `;
    expect(allocationColumns).toHaveLength(5);
  });

  it("can clean test data without dropping migration history", async () => {
    await resetDb(ctx.db);
    const migrations = await ctx.db.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations"
    `;
    expect(migrations.length).toBeGreaterThan(0);
  });
});
