/*
  Warnings:

  - You are about to drop the `modsec_custom_rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('email', 'telegram');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('critical', 'warning', 'info');

-- CreateEnum
CREATE TYPE "AclType" AS ENUM ('whitelist', 'blacklist');

-- CreateEnum
CREATE TYPE "AclField" AS ENUM ('ip', 'geoip', 'user_agent', 'url', 'method', 'header');

-- CreateEnum
CREATE TYPE "AclOperator" AS ENUM ('equals', 'contains', 'regex');

-- CreateEnum
CREATE TYPE "AclAction" AS ENUM ('allow', 'deny', 'challenge');

-- DropForeignKey
ALTER TABLE "modsec_custom_rules" DROP CONSTRAINT "modsec_custom_rules_domainId_fkey";

-- DropTable
DROP TABLE "modsec_custom_rules";

-- CreateTable
CREATE TABLE "modsec_rules" (
    "id" TEXT NOT NULL,
    "domainId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ruleContent" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modsec_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NotificationChannelType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "checkInterval" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rule_channels" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rule_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acl_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AclType" NOT NULL,
    "conditionField" "AclField" NOT NULL,
    "conditionOperator" "AclOperator" NOT NULL,
    "conditionValue" TEXT NOT NULL,
    "action" "AclAction" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acl_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "throughput" DOUBLE PRECISION NOT NULL,
    "errorRate" DOUBLE PRECISION NOT NULL,
    "requestCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modsec_rules_domainId_idx" ON "modsec_rules"("domainId");

-- CreateIndex
CREATE INDEX "modsec_rules_category_idx" ON "modsec_rules"("category");

-- CreateIndex
CREATE INDEX "alert_rule_channels_ruleId_idx" ON "alert_rule_channels"("ruleId");

-- CreateIndex
CREATE INDEX "alert_rule_channels_channelId_idx" ON "alert_rule_channels"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "alert_rule_channels_ruleId_channelId_key" ON "alert_rule_channels"("ruleId", "channelId");

-- CreateIndex
CREATE INDEX "performance_metrics_domain_timestamp_idx" ON "performance_metrics"("domain", "timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_timestamp_idx" ON "performance_metrics"("timestamp");

-- AddForeignKey
ALTER TABLE "modsec_rules" ADD CONSTRAINT "modsec_rules_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule_channels" ADD CONSTRAINT "alert_rule_channels_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule_channels" ADD CONSTRAINT "alert_rule_channels_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "notification_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
