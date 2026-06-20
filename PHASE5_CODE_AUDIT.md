# Phase 5 Code and Data Audit

## Final Status

**PHASE 5 — CLOSED**

Closed on 20 June 2026 after the latest notification, PDF, data-hydration, and E2E fixes passed the repository verification gates.

Phase 5 is complete at the implementation and integration level. The frontend and backend are connected, authoritative data is persisted and reloaded, the main business flows are available through the application, and the latest CI plus browser E2E checks are green.

This status does not mean the application is already production-ready. UAT, production configuration, backup, deployment, monitoring, documentation, and handover remain Phase 6 work.

## Closure Evidence

Final verified commit before closure documentation:

- `05c562989380a6ac8e8bb78f65f3266ec52f32e6`
- Commit message: `test: wait for generated Bon numbers in E2E flow`

GitHub Actions results:

- `Verify POS and PDF` run **#61**: **SUCCESS**
- `E2E POS Flow` run **#50**: **SUCCESS**

The verification workflow passed:

- backend dependency installation;
- Prisma client generation;
- backend TypeScript build;
- complete backend test suite;
- sample Bon PDF generation;
- frontend dependency installation;
- frontend production build;
- frontend unit tests.

The E2E workflow passed the real API browser flow covering:

- login;
- customer create and edit;
- product create and edit;
- Bon creation;
- PDF download;
- reload persistence;
- Bon edit;
- settlement;
- payment cancellation;
- settlement retry;
- Void;
- Bonus Bon;
- soft-delete;
- reporting;
- report PDF download;
- logout and session return to login.

## Audit Matrix

| Area | Status | Evidence |
|---|---|---|
| Authentication | Passed | Login, cookie session, current user, logout, protected routes, and session expiry are integrated. |
| Customer | Passed | List, create, update, soft-delete, LM/BR discounts, threshold, and history use API data. |
| Product | Passed | List, create, update, soft-delete, prices, type, and stock use API/bootstrap data. |
| Transaction | Passed | Server preview, create, detail, Piutang edit, soft-delete, snapshots, and unique Bon numbers are integrated. |
| Settlement | Passed | Settlement, settlement date, payment cancellation, refresh, and Owner PIN authorization are integrated. |
| Bonus | Passed | Backend availability, Bonus Bon API, ledger, and remaining units are loaded through bootstrap. |
| Reporting | Passed | Period filters, cash-basis reporting, LM/BR scope, and PDF use backend endpoints. |
| Error lifecycle | Passed | Validation, duplicate, unauthorized, PIN, timeout, network, and server errors are handled. |
| Notification foundation | Passed | Center, toast, unread badge, filters, local persistence, deduplication, and condition events are available. |
| PDF output | Passed | Bon and report PDF regression tests pass, including one-page compact layout checks. |
| CI and E2E | Passed | Verify run #61 and E2E run #50 completed successfully. |

## Findings and Resolution

### F5-01 — Notification panel was not general

Before the fix, the topbar only counted Piutang Bons and bonus-eligible customers. It had no read/dismiss state, categories, deduplication, toast queue, or persistence.

Resolution: replaced with the general notification foundation defined in `frontend/GENERAL_NOTIFICATION_SYSTEM.md`.

Status: resolved.

### F5-02 — Frontend stock contract was implicit

Bootstrap returned stock, but the frontend DTO did not declare it explicitly.

Resolution: the API product contract now recognizes stock while retaining a safe compatibility fallback.

Status: resolved.

### F5-03 — Bon detail could fall back to demo catalog data

The previous calculator could resolve customers and products from mock data even when the Bon came from the API.

Resolution: Bon detail now uses hydrated customer and product data plus immutable transaction snapshots through `calculateStoredBon`.

Status: resolved.

### F5-04 — PDF report created extra pages

The footer position could overflow the printable area and create blank pages.

Resolution: footer placement was corrected and regression tests were added for report and Bon PDF page count.

Status: resolved.

### F5-05 — E2E read generated Bon number too early

The browser test read the Bon number field before the asynchronous generated value was available, producing an empty locator expectation even though the Bon was successfully created.

Resolution: the E2E helper now waits for a valid `BON-YYYYMMDD-NNN` or `BONUS-YYYYMMDD-NNN` value before continuing.

Status: resolved and verified by E2E run #50.

### F5-06 — Notification backend persistence is not implemented

A backend `Notification` table, read/dismiss endpoints, SSE, and external notification channels are still absent.

Status: accepted backlog, not a Phase 5 blocker. The current application is internal and single-user, so local persistence is sufficient for the Phase 5 scope. Backend persistence can be added in Phase 6 or after UAT if cross-browser or cross-device history is required.

## Notification Design in the Closed Phase 5 Scope

- notification source uses authoritative bootstrap state;
- low stock is five units or fewer;
- out of stock is zero units;
- overdue receivable starts at thirty days;
- bonus eligibility uses backend availability;
- negative profit uses transaction snapshots;
- Void, payment cancellation, session expiry, timeout, and network errors publish events;
- deduplication uses `eventKey + entityId`;
- read and dismiss state is stored locally;
- critical notifications must be read before dismissal;
- resolved conditions disappear automatically and can reappear if the condition returns.

## Phase 6 Entry Criteria

Phase 6 can start from this branch state. Required work remains:

- client UAT;
- visual and responsive testing on target devices;
- production environment and secret configuration;
- database backup and restore drill;
- deployment pipeline and release procedure;
- logging and monitoring;
- user guide and operational documentation;
- handover and final acceptance.
