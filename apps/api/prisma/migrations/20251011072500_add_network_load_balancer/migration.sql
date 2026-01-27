-- CreateEnum
CREATE TYPE "NLBStatus" AS ENUM ('active', 'inactive', 'error');

-- CreateEnum
CREATE TYPE "NLBProtocol" AS ENUM ('tcp', 'udp', 'tcp_udp');

-- CreateEnum
CREATE TYPE "NLBAlgorithm" AS ENUM ('round_robin', 'least_conn', 'ip_hash', 'hash');

-- CreateEnum
CREATE TYPE "NLBUpstreamStatus" AS ENUM ('up', 'down', 'checking');

-- CreateTable
CREATE TABLE "network_load_balancers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "port" INTEGER NOT NULL,
    "protocol" "NLBProtocol" NOT NULL DEFAULT 'tcp',
    "algorithm" "NLBAlgorithm" NOT NULL DEFAULT 'round_robin',
    "status" "NLBStatus" NOT NULL DEFAULT 'inactive',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "proxyTimeout" INTEGER NOT NULL DEFAULT 3,
    "proxyConnectTimeout" INTEGER NOT NULL DEFAULT 1,
    "proxyNextUpstream" BOOLEAN NOT NULL DEFAULT true,
    "proxyNextUpstreamTimeout" INTEGER NOT NULL DEFAULT 0,
    "proxyNextUpstreamTries" INTEGER NOT NULL DEFAULT 0,
    "healthCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "healthCheckInterval" INTEGER NOT NULL DEFAULT 10,
    "healthCheckTimeout" INTEGER NOT NULL DEFAULT 5,
    "healthCheckRises" INTEGER NOT NULL DEFAULT 2,
    "healthCheckFalls" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "network_load_balancers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nlb_upstreams" (
    "id" TEXT NOT NULL,
    "nlbId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "maxFails" INTEGER NOT NULL DEFAULT 3,
    "failTimeout" INTEGER NOT NULL DEFAULT 10,
    "maxConns" INTEGER NOT NULL DEFAULT 0,
    "backup" BOOLEAN NOT NULL DEFAULT false,
    "down" BOOLEAN NOT NULL DEFAULT false,
    "status" "NLBUpstreamStatus" NOT NULL DEFAULT 'checking',
    "lastCheck" TIMESTAMP(3),
    "lastError" TEXT,
    "responseTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nlb_upstreams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nlb_health_checks" (
    "id" TEXT NOT NULL,
    "nlbId" TEXT NOT NULL,
    "upstreamHost" TEXT NOT NULL,
    "upstreamPort" INTEGER NOT NULL,
    "status" "NLBUpstreamStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "error" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nlb_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "network_load_balancers_name_key" ON "network_load_balancers"("name");

-- CreateIndex
CREATE INDEX "network_load_balancers_status_idx" ON "network_load_balancers"("status");

-- CreateIndex
CREATE INDEX "network_load_balancers_port_idx" ON "network_load_balancers"("port");

-- CreateIndex
CREATE INDEX "nlb_upstreams_nlbId_idx" ON "nlb_upstreams"("nlbId");

-- CreateIndex
CREATE INDEX "nlb_upstreams_status_idx" ON "nlb_upstreams"("status");

-- CreateIndex
CREATE INDEX "nlb_health_checks_nlbId_checkedAt_idx" ON "nlb_health_checks"("nlbId", "checkedAt");

-- CreateIndex
CREATE INDEX "nlb_health_checks_upstreamHost_upstreamPort_idx" ON "nlb_health_checks"("upstreamHost", "upstreamPort");

-- AddForeignKey
ALTER TABLE "nlb_upstreams" ADD CONSTRAINT "nlb_upstreams_nlbId_fkey" FOREIGN KEY ("nlbId") REFERENCES "network_load_balancers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nlb_health_checks" ADD CONSTRAINT "nlb_health_checks_nlbId_fkey" FOREIGN KEY ("nlbId") REFERENCES "network_load_balancers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
