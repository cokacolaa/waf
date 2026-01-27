/*
  Warnings:

  - You are about to drop the `modsec_rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "modsec_rules" DROP CONSTRAINT "modsec_rules_domainId_fkey";

-- DropTable
DROP TABLE "modsec_rules";

-- CreateTable
CREATE TABLE "modsec_crs_rules" (
    "id" TEXT NOT NULL,
    "domainId" TEXT,
    "ruleFile" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "paranoia" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modsec_crs_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modsec_custom_rules" (
    "id" TEXT NOT NULL,
    "domainId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ruleContent" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modsec_custom_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modsec_crs_rules_domainId_idx" ON "modsec_crs_rules"("domainId");

-- CreateIndex
CREATE INDEX "modsec_crs_rules_category_idx" ON "modsec_crs_rules"("category");

-- CreateIndex
CREATE UNIQUE INDEX "modsec_crs_rules_ruleFile_domainId_key" ON "modsec_crs_rules"("ruleFile", "domainId");

-- CreateIndex
CREATE INDEX "modsec_custom_rules_domainId_idx" ON "modsec_custom_rules"("domainId");

-- CreateIndex
CREATE INDEX "modsec_custom_rules_category_idx" ON "modsec_custom_rules"("category");

-- AddForeignKey
ALTER TABLE "modsec_crs_rules" ADD CONSTRAINT "modsec_crs_rules_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modsec_custom_rules" ADD CONSTRAINT "modsec_custom_rules_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
