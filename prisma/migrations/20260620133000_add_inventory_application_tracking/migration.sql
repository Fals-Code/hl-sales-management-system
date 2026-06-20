ALTER TABLE "Bon"
ADD COLUMN "inventoryAppliedAt" TIMESTAMP(3);

CREATE INDEX "Bon_inventoryAppliedAt_idx"
ON "Bon"("inventoryAppliedAt");
