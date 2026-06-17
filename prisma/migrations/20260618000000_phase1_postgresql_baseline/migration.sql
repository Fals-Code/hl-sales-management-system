CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "ownerPinHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "bonusThreshold" BIGINT NOT NULL DEFAULT 0 CHECK ("bonusThreshold" >= 0),
  "bonusCarryoverRevenue" BIGINT NOT NULL DEFAULT 0 CHECK ("bonusCarryoverRevenue" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

CREATE TABLE "CustomerDiscountTier" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productType" TEXT NOT NULL CHECK ("productType" IN ('LM','BR')),
  "sequence" INTEGER NOT NULL CHECK ("sequence" > 0),
  "percentBps" INTEGER NOT NULL CHECK ("percentBps" >= 0 AND "percentBps" <= 10000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("customerId","productType","sequence")
);
CREATE INDEX "CustomerDiscountTier_customerId_productType_idx" ON "CustomerDiscountTier"("customerId","productType");

CREATE TABLE "BonusThresholdHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "oldValue" BIGINT NOT NULL,
  "newValue" BIGINT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "carryoverRevenue" BIGINT NOT NULL DEFAULT 0 CHECK ("carryoverRevenue" >= 0),
  "reason" TEXT,
  "changedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BonusThresholdHistory_customerId_changedAt_idx" ON "BonusThresholdHistory"("customerId","changedAt");
CREATE INDEX "BonusThresholdHistory_customerId_effectiveFrom_idx" ON "BonusThresholdHistory"("customerId","effectiveFrom");

CREATE TABLE "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sku" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('LM','BR')),
  "costPrice" BIGINT NOT NULL CHECK ("costPrice" >= 0),
  "basePrice" BIGINT NOT NULL CHECK ("basePrice" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_type_idx" ON "Product"("type");
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

CREATE TABLE "Bon" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bonNumber" TEXT NOT NULL UNIQUE,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'PIUTANG' CHECK ("status" IN ('PIUTANG','LUNAS','VOID')),
  "bonDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "shippingCost" BIGINT NOT NULL DEFAULT 0 CHECK ("shippingCost" >= 0),
  "totalBeforeDiscount" BIGINT NOT NULL DEFAULT 0 CHECK ("totalBeforeDiscount" >= 0),
  "totalAfterDiscount" BIGINT NOT NULL DEFAULT 0 CHECK ("totalAfterDiscount" >= 0),
  "totalAmount" BIGINT NOT NULL DEFAULT 0 CHECK ("totalAmount" >= 0),
  "revenueLm" BIGINT NOT NULL DEFAULT 0 CHECK ("revenueLm" >= 0),
  "revenueBr" BIGINT NOT NULL DEFAULT 0 CHECK ("revenueBr" >= 0),
  "profitAmount" BIGINT NOT NULL DEFAULT 0,
  "bonusCost" BIGINT NOT NULL DEFAULT 0 CHECK ("bonusCost" >= 0),
  "hasNegativeProfit" BOOLEAN NOT NULL DEFAULT false,
  "negativeProfitAuthorizedById" TEXT,
  "negativeProfitReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Bon_customerId_status_idx" ON "Bon"("customerId","status");
CREATE INDEX "Bon_bonDate_idx" ON "Bon"("bonDate");
CREATE INDEX "Bon_settledAt_idx" ON "Bon"("settledAt");
CREATE INDEX "Bon_deletedAt_idx" ON "Bon"("deletedAt");

CREATE TABLE "BonItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bonId" TEXT NOT NULL REFERENCES "Bon"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('REGULER','BONUS')),
  "productNameSnapshot" TEXT NOT NULL,
  "productTypeSnapshot" TEXT NOT NULL CHECK ("productTypeSnapshot" IN ('LM','BR')),
  "costPriceSnapshot" BIGINT NOT NULL CHECK ("costPriceSnapshot" >= 0),
  "basePriceSnapshot" BIGINT NOT NULL CHECK ("basePriceSnapshot" >= 0),
  "discountSnapshotJson" TEXT NOT NULL,
  "priceAfterDiscount" BIGINT NOT NULL CHECK ("priceAfterDiscount" >= 0),
  "finalPrice" BIGINT NOT NULL CHECK ("finalPrice" >= 0),
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "subtotal" BIGINT NOT NULL CHECK ("subtotal" >= 0),
  "profitAmount" BIGINT NOT NULL,
  "isBonus" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BonItem_bonId_idx" ON "BonItem"("bonId");
CREATE INDEX "BonItem_productTypeSnapshot_idx" ON "BonItem"("productTypeSnapshot");
CREATE INDEX "BonItem_isBonus_idx" ON "BonItem"("isBonus");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentNumber" TEXT NOT NULL UNIQUE,
  "customerId" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "totalAmount" BIGINT NOT NULL CHECK ("totalAmount" >= 0),
  "historicalPaymentAmount" BIGINT NOT NULL CHECK ("historicalPaymentAmount" >= 0),
  "activePaymentAmount" BIGINT NOT NULL CHECK ("activePaymentAmount" >= 0),
  "revenueLm" BIGINT NOT NULL DEFAULT 0 CHECK ("revenueLm" >= 0),
  "revenueBr" BIGINT NOT NULL DEFAULT 0 CHECK ("revenueBr" >= 0),
  "profitAmount" BIGINT NOT NULL DEFAULT 0,
  "bonusCost" BIGINT NOT NULL DEFAULT 0 CHECK ("bonusCost" >= 0),
  "canceledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "canceledById" TEXT,
  "cancelAuthorizationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Payment_customerId_paidAt_idx" ON "Payment"("customerId","paidAt");
CREATE INDEX "Payment_canceledAt_idx" ON "Payment"("canceledAt");

CREATE TABLE "PaymentBon" (
  "paymentId" TEXT NOT NULL REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "bonId" TEXT NOT NULL REFERENCES "Bon"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "amount" BIGINT NOT NULL CHECK ("amount" >= 0),
  "allocatedInvoiceAmount" BIGINT NOT NULL CHECK ("allocatedInvoiceAmount" >= 0),
  "allocatedProductRevenue" BIGINT NOT NULL CHECK ("allocatedProductRevenue" >= 0),
  "allocatedShipping" BIGINT NOT NULL CHECK ("allocatedShipping" >= 0),
  "allocatedProfit" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversedAt" TIMESTAMP(3),
  PRIMARY KEY ("paymentId","bonId")
);
CREATE INDEX "PaymentBon_bonId_idx" ON "PaymentBon"("bonId");
CREATE INDEX "PaymentBon_reversedAt_idx" ON "PaymentBon"("reversedAt");

CREATE TABLE "BonusLedger" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "mutationType" TEXT NOT NULL CHECK ("mutationType" IN ('EARNED','USED','REVERSED','ADJUSTMENT')),
  "amount" INTEGER NOT NULL,
  "balanceBefore" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "thresholdSnapshot" BIGINT,
  "revenueSnapshot" BIGINT,
  "reversalOfId" TEXT UNIQUE,
  "bonId" TEXT REFERENCES "Bon"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "paymentId" TEXT REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BonusLedger_customerId_createdAt_idx" ON "BonusLedger"("customerId","createdAt");
CREATE INDEX "BonusLedger_bonId_idx" ON "BonusLedger"("bonId");
CREATE INDEX "BonusLedger_paymentId_idx" ON "BonusLedger"("paymentId");
CREATE INDEX "BonusLedger_reversalOfId_idx" ON "BonusLedger"("reversalOfId");
CREATE UNIQUE INDEX "BonusLedger_one_earned_per_payment" ON "BonusLedger"("paymentId") WHERE "mutationType" = 'EARNED';

CREATE TABLE "AuthorizationRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reason" TEXT NOT NULL,
  "context" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuthorizationRecord_type_createdAt_idx" ON "AuthorizationRecord"("type","createdAt");
CREATE INDEX "AuthorizationRecord_userId_idx" ON "AuthorizationRecord"("userId");

CREATE TABLE "VoidRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bonId" TEXT NOT NULL UNIQUE REFERENCES "Bon"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reason" TEXT NOT NULL,
  "authorizedById" TEXT NOT NULL,
  "authorizationId" TEXT NOT NULL,
  "previousStatus" TEXT NOT NULL,
  "previousTotal" BIGINT NOT NULL,
  "previousRevenueLm" BIGINT NOT NULL,
  "previousRevenueBr" BIGINT NOT NULL,
  "previousProfit" BIGINT NOT NULL,
  "previousBonusCost" BIGINT NOT NULL,
  "reversalImpactJson" TEXT NOT NULL,
  "voidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "VoidRecord_voidedAt_idx" ON "VoidRecord"("voidedAt");
