# Phase 1 Backend Audit

Audit date: 2026-06-18

## Baseline Validation

| Check | Result |
| --- | --- |
| `npm.cmd install` | Passed |
| `npm.cmd run db:generate` | Passed with Prisma 7 deprecation warning for package.json prisma config |
| `npm.cmd run build` | Passed |
| `npm.cmd run db:migrate` | Passed on empty SQLite database |
| `npm.cmd run db:seed` | Passed with env-provided credentials |
| `npm.cmd test` | Passed, 14 tests |

## Gap Analysis

| Requirement | Current implementation | Status | Required fix | Files to change |
| --- | --- | --- | --- | --- |
| Integer Rupiah | Money fields use `Int`; no float math found | Sesuai | Keep centralized validation | `src/domain/*` |
| Rp100 rounding | Central `roundToNearestHundred` exists | Sesuai | Add explicit edge tests after split | `tests/calculation.test.ts` |
| Cascading discount | Sequence-based discount is implemented and snapshot stored as JSON | Sesuai | Add separated tests for LM/BR different discounts | `tests/calculation.test.ts`, `tests/bon.test.ts` |
| Customer/Product soft delete | Implemented; transactions query only active customer/product | Sesuai | Add tests for deleted customer/product rejection | `tests/bon.test.ts` |
| Bon number uniqueness | Unique DB constraint and random suffix; no row-count dependency | Sebagian sesuai | Add retry-on-unique-collision path and concurrency simulation | `src/services/transactionService.ts`, `tests/concurrency.test.ts` |
| Bon PIUTANG edit/delete | Implemented through service transaction | Sesuai | Add tests for LUNAS delete and VOID edit rejection | `tests/bon.test.ts` |
| Bon LUNAS lock | Service rejects edit/delete for non-PIUTANG | Sebagian sesuai | Add conditional status updates for settlement/cancel/void to reduce race window | `src/services/settlementService.ts`, `src/services/voidService.ts` |
| Cash basis | Reporting currently reads `Bon.status = LUNAS`; payment dates not filterable | Sebagian sesuai | Reporting must use payment links/payment date for realized filters | `src/services/reportingService.ts` |
| Ongkir | Included in total/payment, excluded from LM/BR/profit | Sesuai | Add reporting total shipping metric | `src/services/reportingService.ts` |
| Regular profit | Formula is correct for regular items | Sesuai | Preserve negative profit | `src/domain/calculationEngine.ts` |
| Bonus item profit | Current engine calculates `0 - cost` and marks negative profit | Tidak sesuai | Bonus profit impact must be 0; bonus cost separate metric only | `src/domain/calculationEngine.ts`, tests |
| Bonus availability | Current ledger is Rupiah balance and subtracts bonus cost | Tidak sesuai | Implement unit-based entitlement: floor(total settled omzet / threshold) - used units; store threshold snapshot | `prisma/schema.prisma`, migration, `src/services/bonusService.ts` |
| Bonus usage | Current usage can consume Rupiah balance, not bonus units | Tidak sesuai | Validate requested bonus item count <= available units; ledger `amount` becomes unit delta | `src/services/transactionService.ts`, `src/services/bonusService.ts` |
| Bonus threshold history | Existing history stores old/new/user/reason | Sesuai | Store threshold snapshot on USED ledger | schema/migration |
| Settlement one/multiple | Supports explicit `bonIds` in one transaction | Sebagian sesuai | Add monthly settlement helper by customer/month/year and conditional status update | `src/services/settlementService.ts` |
| Payment cancellation | Requires PIN/reason and does not delete Payment | Sebagian sesuai | Reverse earned bonus units, not Rupiah; prevent cancel if Bon already VOID | `src/services/settlementService.ts` |
| Void | Requires PIN/reason and stores VoidRecord | Sebagian sesuai | Reverse earned/used bonus units, prevent double void via status/record, preserve payment history | `src/services/voidService.ts` |
| Reporting required summaries | Only overall/byCustomer/negative list; no filters or LM/BR detail | Tidak sesuai | Add filters, customer summary, LM summary, BR summary, overall metrics | `src/services/reportingService.ts` |
| Constraints | Unique/indexes present; no check constraints for quantities/prices | Sebagian sesuai | Add SQLite CHECK constraints in migration and schema documentation | migration |
| Race conditions | Transactions exist, but updateMany status guards are incomplete | Sebagian sesuai | Add conditional updates and test simulations | services/tests |
| Authentication/PIN | Password/PIN hashed, session token hash stored, reason required | Sesuai | Keep centralized auth | `src/services/authService.ts` |
| Automated tests | One large test file; missing many domain tests | Tidak sesuai | Split tests by domain and expand coverage | `tests/*.test.ts` |
| Documentation | Documents old bonus behavior that conflicts with client | Tidak sesuai | Rewrite bonus/reporting/cash-basis sections | `BACKEND.md` |

## Implementation Plan

1. Update schema and migration for bonus unit ledger fields: `thresholdSnapshot`, `reversalOfId`, and CHECK constraints.
2. Fix calculation engine so bonus item has Rp0 subtotal, Rp0 revenue, Rp0 profit impact, and separate `bonusCost`.
3. Rework BonusService around unit entitlement and usage, not Rupiah balance.
4. Rework Bon create/edit/delete to validate bonus unit availability and reverse unit usage on edit/delete.
5. Rework settlement/cancel/void to use conditional status updates and reverse bonus unit ledger correctly.
6. Expand reporting with cash-basis payment-date filters, LM/BR/customer/overall summaries, bonus metrics, shipping totals, and negative-profit filters.
7. Split tests by domain and add required edge/concurrency simulations.
8. Update `BACKEND.md` to match final implementation.

## Final Hardening Addendum

| Requirement | Final action | Status |
| --- | --- | --- |
| PostgreSQL final database | Prisma datasource changed to PostgreSQL; SQLite runner removed | Implemented |
| Official migration | Replaced custom runner with Prisma Migrate scripts and PostgreSQL baseline | Implemented |
| Migration drift | Chose clean reset strategy because only generated SQLite dev/test DBs existed | Implemented |
| BIGINT money | Prisma money fields changed to `BigInt`; service conversion helpers added | Implemented |
| ESLint | Added real ESLint config and separated `build`, `typecheck`, `lint` | Implemented |
| Payment allocation | Added allocation snapshot columns and active/historical payment reporting | Implemented |
| Partial Void | Void reverses only affected PaymentBon allocation; cancellation after partial Void is rejected | Implemented |
| Bonus source of truth | Ledger balance is authoritative; threshold formula only creates new EARNED rows | Implemented |
| Threshold semantics | Added effective period and carryover revenue fields; new threshold applies prospectively | Implemented with documented ambiguity |
| Dependency security | Upgraded Vitest; final audit reports 0 vulnerabilities | Implemented |
| PostgreSQL test execution | Tests now require `TEST_DATABASE_URL`; environment lacks PostgreSQL/psql/docker | Blocked by environment |
