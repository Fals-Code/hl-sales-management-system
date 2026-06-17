# Phase 2 API

Backend API menggunakan Fastify, TypeScript, Zod, cookie session, Prisma, dan PostgreSQL.

## Commands

- `npm run dev` menjalankan API dengan reload.
- `npm start` menjalankan API via `tsx`.
- `npm run test:api` menjalankan test API.
- `npm run check` menjalankan build, typecheck, ESLint, dan seluruh test.

## Environment

Tambahan konfigurasi tersedia di `.env.example`: `API_PORT`, `FRONTEND_ORIGIN`, `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SECURE`, dan `SESSION_MAX_AGE`.

## Docs

- `GET /docs`
- `GET /docs/json`

## Endpoint Ringkas

- Auth: `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/me`, `/api/v1/auth/verify-owner-pin`
- Customers: `/api/v1/customers`
- Products: `/api/v1/products`
- Bons: `/api/v1/bons`, `/api/v1/bons/preview`, `/api/v1/bons/validate-number`, `/api/v1/bons/:id/void`
- Settlements: `/api/v1/settlements`, `/api/v1/settlements/monthly`, `/api/v1/payments`, `/api/v1/payments/:id/cancel`
- Bonus: `/api/v1/customers/:id/bonus`, `/api/v1/customers/:id/bonus-history`, `/api/v1/bonus-bons`, `/api/v1/bonus-costs`
- Reports: `/api/v1/reports/customers`, `/api/v1/reports/lm`, `/api/v1/reports/br`, `/api/v1/reports/overall`, `/api/v1/reports/negative-profit`
- PDF: `/api/v1/pdf/transactions`, `/api/v1/pdf/receivables`, `/api/v1/pdf/customers/:id`, `/api/v1/pdf/overall`, `/api/v1/pdf/bonus-log`

Semua endpoint `/api/v1/*` membutuhkan cookie session kecuali login. Response API selalu menggunakan envelope `{ success, data, meta }` atau `{ success, error }`.
