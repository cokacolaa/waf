-- CreateTable
CREATE TABLE "alert_history" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_history_severity_idx" ON "alert_history"("severity");

-- CreateIndex
CREATE INDEX "alert_history_acknowledged_idx" ON "alert_history"("acknowledged");

-- CreateIndex
CREATE INDEX "alert_history_timestamp_idx" ON "alert_history"("timestamp");
