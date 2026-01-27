-- CreateEnum
CREATE TYPE "SlaveNodeStatus" AS ENUM ('online', 'offline', 'syncing', 'error');

-- CreateEnum
CREATE TYPE "SyncLogStatus" AS ENUM ('success', 'failed', 'partial', 'running');

-- CreateEnum
CREATE TYPE "SyncLogType" AS ENUM ('full_sync', 'incremental_sync', 'health_check');

-- CreateTable
CREATE TABLE "slave_nodes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 3001,
    "apiKey" TEXT NOT NULL,
    "status" "SlaveNodeStatus" NOT NULL DEFAULT 'offline',
    "lastSeen" TIMESTAMP(3),
    "version" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" INTEGER NOT NULL DEFAULT 60,
    "configHash" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "latency" INTEGER,
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "diskUsage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slave_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" "SyncLogType" NOT NULL,
    "status" "SyncLogStatus" NOT NULL DEFAULT 'running',
    "configHash" TEXT,
    "changesCount" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_versions" (
    "id" TEXT NOT NULL,
    "version" SERIAL NOT NULL,
    "configHash" TEXT NOT NULL,
    "configData" JSONB NOT NULL,
    "createdBy" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slave_nodes_name_key" ON "slave_nodes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "slave_nodes_apiKey_key" ON "slave_nodes"("apiKey");

-- CreateIndex
CREATE INDEX "slave_nodes_status_idx" ON "slave_nodes"("status");

-- CreateIndex
CREATE INDEX "slave_nodes_lastSeen_idx" ON "slave_nodes"("lastSeen");

-- CreateIndex
CREATE INDEX "sync_logs_nodeId_startedAt_idx" ON "sync_logs"("nodeId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "config_versions_configHash_key" ON "config_versions"("configHash");

-- CreateIndex
CREATE INDEX "config_versions_createdAt_idx" ON "config_versions"("createdAt");

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "slave_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
