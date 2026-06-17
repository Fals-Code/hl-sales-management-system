# Phase 1 Backend Documentation

## Stack

- Runtime: Node.js 24.14.0
- Language: TypeScript 5.9.3
- Database final: PostgreSQL
- ORM/migration: Prisma CLI 6.19.3 and Prisma Client 6.19.3
- Test runner: Vitest 4.1.9
- Lint: ESLint 10.5.0 with `typescript-eslint`
- Password/PIN hashing: bcryptjs 2.4.3

No public API, controller, Swagger, UI, or frontend exists in Phase 1.

## Environment

`.env.example` defines:

- `DATABASE_URL`: PostgreSQL development database.
- `TEST_DATABASE_URL`: PostgreSQL test database. Automated integration/concurrency tests require this.
- `APP_USERNAME`
- `APP_PASSWORD`
- `OWNER_PIN`

Tests intentionally do not fall back to SQLite. If `TEST_DATABASE_URL` is missing, integration tests fail fast.

## Commands

```bash
npm install
npm run db:generate
npm run db:migrate:dev
npm run db:migrate:deploy
npm run db:seed
npm run build
npm run typecheck
npm run lint
npm test
npm run check
```

`npm run check` runs build, typecheck, ESLint, and tests.

## Migration Strategy

The previous SQLite migration runner has been removed. PostgreSQL is now the only database source of truth.

Because the repository only contained generated SQLite dev/test databases and no client transaction data, the migration history was reset to one clean PostgreSQL baseline:

- `prisma/migrations/20260618000000_phase1_postgresql_baseline/migration.sql`

The baseline includes final constraints, indexes, `BIGINT` money fields, payment allocation columns, bonus threshold fields, and audit fields. Migration is handled by official Prisma Migrate.

## Money And BigInt

All Rupiah columns use PostgreSQL `BIGINT` through Prisma `BigInt`.

The service layer uses:

- `toDbMoney()` before database writes;
- `toSafeMoneyNumber()` when calculation engine or reports need JavaScript number arithmetic.

The helper rejects values outside JavaScript safe integer range.

## Core Business Rules

Implemented rules:

- cascading discount by explicit sequence;
- centralized Rp100 rounding;
- item snapshots for product name/type/cost/base/discount/final price/quantity/subtotal;
- Bon starts as `PIUTANG`;
- Bon `LUNAS` and `VOID` cannot be edited through Bon edit/delete service;
- transaction loss requires Owner PIN and reason;
- Owner PIN/password are hashed;
- cash basis recognition happens on settlement;
- ongkir is included in invoice/payment, excluded from LM/BR omzet and product profit;
- item bonus has Rp0 price, Rp0 subtotal, Rp0 piutang, Rp0 omzet, and Rp0 HL profit impact;
- `bonusCost` is a separate promotion metric, not an HL profit reducer.

## Bonus Source Of Truth

Bonus balance is authoritative from `BonusLedger`:

```text
saldoUnitBonus = SUM(EARNED) + SUM(USED) + SUM(REVERSED) + SUM(ADJUSTMENT)
```

Conventions:

- `EARNED` positive unit count.
- `USED` negative unit count.
- `REVERSED` must reference one source ledger via `reversalOfId`.
- `ADJUSTMENT` is reserved for controlled authorized correction.

Threshold calculation only determines how many new `EARNED` rows should be inserted for the active threshold period. The available balance is not recomputed by adding formula output again.

## Threshold Changes

Threshold history stores:

- `oldValue`;
- `newValue`;
- `effectiveFrom`;
- `effectiveUntil`;
- `carryoverRevenue`;
- `changedById`;
- `reason`;
- `changedAt`.

Current decision:

- earned units remain final;
- used units remain final;
- old ledger rows are never rewritten;
- remaining progress is stored as `bonusCarryoverRevenue`;
- new threshold applies prospectively from the effective timestamp.

The exact client decision for whether carryover should be converted, split by period, or follow old threshold remains a business clarification risk. Current implementation uses the safest non-rewrite approach.

## Payment Allocation

`PaymentBon` stores allocation snapshots:

- `allocatedInvoiceAmount`;
- `allocatedProductRevenue`;
- `allocatedShipping`;
- `allocatedProfit`;
- `createdAt`;
- `reversedAt`.

Payment also stores:

- `historicalPaymentAmount`;
- `activePaymentAmount`.

Historical payment remains auditable. Active reporting excludes canceled allocations and voided Bon allocations.

## Partial Void Rule

If one Bon inside a multi-Bon Payment is voided:

- Payment remains historical.
- Other Bons remain `LUNAS`.
- Voided Bon becomes `VOID`.
- Allocation for the voided Bon gets `reversedAt`.
- `activePaymentAmount` is reduced by that Bon allocation only.
- Reporting excludes only the voided Bon allocation.
- Regular cancellation of a Payment that contains any `VOID` Bon is rejected.

## Settlement, Cancellation, Void

Settlement:

- supports one Bon or multiple Bons;
- supports monthly selection by customer/month/year;
- creates Payment and PaymentBon allocation rows;
- conditionally updates PIUTANG Bons to LUNAS;
- records earned bonus units for the active threshold period.

Cancellation:

- requires Owner PIN and reason;
- stores authorization;
- rejects already canceled payment;
- rejects Payment containing a VOID Bon;
- reverses active allocations and earned bonus rows.

Void:

- requires Owner PIN and reason;
- stores `VoidRecord`;
- reverses bonus usage on that Bon;
- reconciles earned units after active revenue changes;
- preserves payment history.

## Reporting

Reporting services separate:

- `historicalPaymentAmount`;
- `activePaymentAmount`;
- active product revenue;
- LM revenue;
- BR revenue;
- HL profit;
- shipping;
- bonus units used;
- bonusCost as promotion metric;
- void count;
- canceled payment count.

Cash-basis reports filter realized values by payment date. Piutang reports use Bon date.

## Testing

Tests require PostgreSQL via `TEST_DATABASE_URL`.

Test groups include:

- auth;
- customer;
- product;
- calculation;
- Bon;
- loss authorization;
- settlement;
- payment cancellation;
- void;
- bonus;
- reporting;
- payment allocation;
- migration;
- concurrency.

The current execution environment does not provide `psql`, Docker, or `TEST_DATABASE_URL`, so PostgreSQL integration tests cannot be executed here. Build, typecheck, lint, schema validation, Prisma Client generation, and audit were executed.

## Dependency Security Status

Final audit:

- `npm audit`: 0 vulnerabilities.
- `npm audit --omit=dev`: 0 vulnerabilities.

Vitest was upgraded to 4.1.9 to remove dev-only Vite/esbuild advisories.

## Remaining Risks

- PostgreSQL migration/test execution is blocked in this machine because no PostgreSQL server/client or Docker is available.
- Prisma still emits a deprecation warning for `package.json#prisma` seed configuration under Prisma 6; it does not block current execution but should be moved to Prisma config before Prisma 7.
- Real PostgreSQL concurrency behavior must be verified once `TEST_DATABASE_URL` is available.
