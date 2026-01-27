-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('active', 'inactive', 'error');

-- CreateEnum
CREATE TYPE "UpstreamStatus" AS ENUM ('up', 'down', 'checking');

-- CreateEnum
CREATE TYPE "LoadBalancerAlgorithm" AS ENUM ('round_robin', 'least_conn', 'ip_hash');

-- CreateEnum
CREATE TYPE "SSLStatus" AS ENUM ('valid', 'expiring', 'expired');

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'inactive',
    "sslEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sslExpiry" TIMESTAMP(3),
    "modsecEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upstreams" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "maxFails" INTEGER NOT NULL DEFAULT 3,
    "failTimeout" INTEGER NOT NULL DEFAULT 10,
    "status" "UpstreamStatus" NOT NULL DEFAULT 'checking',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upstreams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_balancer_configs" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "algorithm" "LoadBalancerAlgorithm" NOT NULL DEFAULT 'round_robin',
    "healthCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "healthCheckInterval" INTEGER NOT NULL DEFAULT 30,
    "healthCheckTimeout" INTEGER NOT NULL DEFAULT 5,
    "healthCheckPath" TEXT NOT NULL DEFAULT '/',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_balancer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ssl_certificates" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "sans" TEXT[],
    "issuer" TEXT NOT NULL,
    "certificate" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "chain" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "status" "SSLStatus" NOT NULL DEFAULT 'valid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssl_certificates_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "nginx_configs" (
    "id" TEXT NOT NULL,
    "configType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nginx_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_status" (
    "id" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "step" TEXT,
    "message" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domains_name_key" ON "domains"("name");

-- CreateIndex
CREATE INDEX "domains_name_idx" ON "domains"("name");

-- CreateIndex
CREATE INDEX "domains_status_idx" ON "domains"("status");

-- CreateIndex
CREATE INDEX "upstreams_domainId_idx" ON "upstreams"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "load_balancer_configs_domainId_key" ON "load_balancer_configs"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "ssl_certificates_domainId_key" ON "ssl_certificates"("domainId");

-- CreateIndex
CREATE INDEX "ssl_certificates_domainId_idx" ON "ssl_certificates"("domainId");

-- CreateIndex
CREATE INDEX "ssl_certificates_validTo_idx" ON "ssl_certificates"("validTo");

-- CreateIndex
CREATE INDEX "modsec_rules_domainId_idx" ON "modsec_rules"("domainId");

-- CreateIndex
CREATE INDEX "modsec_rules_category_idx" ON "modsec_rules"("category");

-- CreateIndex
CREATE INDEX "nginx_configs_configType_idx" ON "nginx_configs"("configType");

-- CreateIndex
CREATE UNIQUE INDEX "installation_status_component_key" ON "installation_status"("component");

-- AddForeignKey
ALTER TABLE "upstreams" ADD CONSTRAINT "upstreams_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_balancer_configs" ADD CONSTRAINT "load_balancer_configs_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssl_certificates" ADD CONSTRAINT "ssl_certificates_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modsec_rules" ADD CONSTRAINT "modsec_rules_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
