\pset pager off
\echo '=== HL DATABASE SUMMARY ==='
SELECT 'User' AS table_name, COUNT(*) AS row_count FROM "User"
UNION ALL SELECT 'Customer', COUNT(*) FROM "Customer"
UNION ALL SELECT 'CustomerDiscountTier', COUNT(*) FROM "CustomerDiscountTier"
UNION ALL SELECT 'Product', COUNT(*) FROM "Product"
UNION ALL SELECT 'Bon', COUNT(*) FROM "Bon"
UNION ALL SELECT 'BonItem', COUNT(*) FROM "BonItem"
UNION ALL SELECT 'Payment', COUNT(*) FROM "Payment"
UNION ALL SELECT 'PaymentBon', COUNT(*) FROM "PaymentBon"
UNION ALL SELECT 'BonusLedger', COUNT(*) FROM "BonusLedger"
UNION ALL SELECT 'AuthorizationRecord', COUNT(*) FROM "AuthorizationRecord"
UNION ALL SELECT 'VoidRecord', COUNT(*) FROM "VoidRecord"
ORDER BY table_name;

\echo ''
\echo '=== RECENT CUSTOMERS ==='
SELECT "code", "name", "phone", "bonusThreshold", "deletedAt", "createdAt"
FROM "Customer"
ORDER BY "createdAt" DESC
LIMIT 10;

\echo ''
\echo '=== RECENT PRODUCTS ==='
SELECT "sku", "name", "type", "costPrice", "basePrice", "deletedAt", "createdAt"
FROM "Product"
ORDER BY "createdAt" DESC
LIMIT 10;

\echo ''
\echo '=== RECENT BONS ==='
SELECT "bonNumber", "status", "bonDate", "settledAt", "totalAmount", "profitAmount", "deletedAt", "createdAt"
FROM "Bon"
ORDER BY "createdAt" DESC
LIMIT 15;

\echo ''
\echo '=== RECENT PAYMENTS ==='
SELECT "paymentNumber", "paidAt", "totalAmount", "activePaymentAmount", "canceledAt", "cancelReason", "createdAt"
FROM "Payment"
ORDER BY "createdAt" DESC
LIMIT 15;

\echo ''
\echo '=== RECENT BONUS LEDGER ==='
SELECT "mutationType", "amount", "balanceBefore", "balanceAfter", "reason", "createdAt"
FROM "BonusLedger"
ORDER BY "createdAt" DESC
LIMIT 15;

\echo ''
\echo '=== RECENT VOID RECORDS ==='
SELECT b."bonNumber", v."reason", v."previousStatus", v."previousTotal", v."voidedAt"
FROM "VoidRecord" v
JOIN "Bon" b ON b."id" = v."bonId"
ORDER BY v."voidedAt" DESC
LIMIT 10;
