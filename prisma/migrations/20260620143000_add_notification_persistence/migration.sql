CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "targetUrl" TEXT,
  "entityType" TEXT,
  "entityId" TEXT NOT NULL DEFAULT 'global',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_userId_eventKey_entityId_key"
ON "Notification"("userId", "eventKey", "entityId");

CREATE INDEX "Notification_userId_createdAt_idx"
ON "Notification"("userId", "createdAt");

CREATE INDEX "Notification_userId_readAt_idx"
ON "Notification"("userId", "readAt");

CREATE INDEX "Notification_userId_dismissedAt_idx"
ON "Notification"("userId", "dismissedAt");

CREATE INDEX "Notification_expiresAt_idx"
ON "Notification"("expiresAt");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
