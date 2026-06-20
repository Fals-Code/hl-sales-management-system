ALTER TABLE "Product"
ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_stock_check" CHECK ("stock" >= 0);
