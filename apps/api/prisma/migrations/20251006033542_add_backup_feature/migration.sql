-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('success', 'failed', 'running', 'pending');

-- CreateTable
CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "status" "BackupStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_files" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'success',
    "type" TEXT NOT NULL DEFAULT 'full',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backup_files_scheduleId_idx" ON "backup_files"("scheduleId");

-- CreateIndex
CREATE INDEX "backup_files_createdAt_idx" ON "backup_files"("createdAt");

-- AddForeignKey
ALTER TABLE "backup_files" ADD CONSTRAINT "backup_files_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "backup_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
