CREATE TABLE "UserFollowUpPreference" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "clerkUserId" TEXT NOT NULL,
  "defaultEmailDays" INTEGER NOT NULL DEFAULT 7,
  "defaultTextDays" INTEGER NOT NULL DEFAULT 3,
  "defaultCallDays" INTEGER NOT NULL DEFAULT 1,
  "resurfaceAfterDays" INTEGER NOT NULL DEFAULT 30,
  "dailyBriefingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "dailyBriefingTime" TEXT NOT NULL DEFAULT '08:00',
  "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
  "briefingRecipientEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserFollowUpPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFollowUpPreference_orgId_clerkUserId_key" ON "UserFollowUpPreference"("orgId", "clerkUserId");
ALTER TABLE "UserFollowUpPreference" ADD CONSTRAINT "UserFollowUpPreference_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "OrganizationWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DailyBriefingDelivery" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "clerkUserId" TEXT NOT NULL,
  "localDate" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "status" "IntegrationSyncStatus" NOT NULL DEFAULT 'RUNNING',
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyBriefingDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyBriefingDelivery_orgId_clerkUserId_localDate_key" ON "DailyBriefingDelivery"("orgId", "clerkUserId", "localDate");
CREATE INDEX "DailyBriefingDelivery_orgId_localDate_status_idx" ON "DailyBriefingDelivery"("orgId", "localDate", "status");
ALTER TABLE "DailyBriefingDelivery" ADD CONSTRAINT "DailyBriefingDelivery_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "OrganizationWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
