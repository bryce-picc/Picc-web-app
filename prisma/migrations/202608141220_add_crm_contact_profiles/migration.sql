CREATE TABLE "CrmContactProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "notionContactPageId" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "frequencyDays" INTEGER,
    "lastSeenAt" TIMESTAMP(3),
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "archivedAt" TIMESTAMP(3),
    "mergedIntoPageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmContactProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmContactReminder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmContactReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmContactActivity" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" "Channel",
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmContactActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmContactProfile_orgId_notionContactPageId_key" ON "CrmContactProfile"("orgId", "notionContactPageId");
CREATE INDEX "CrmContactProfile_orgId_favorite_idx" ON "CrmContactProfile"("orgId", "favorite");
CREATE INDEX "CrmContactProfile_orgId_archivedAt_idx" ON "CrmContactProfile"("orgId", "archivedAt");
CREATE INDEX "CrmContactReminder_orgId_dueAt_status_idx" ON "CrmContactReminder"("orgId", "dueAt", "status");
CREATE INDEX "CrmContactReminder_profileId_status_idx" ON "CrmContactReminder"("profileId", "status");
CREATE INDEX "CrmContactActivity_orgId_occurredAt_idx" ON "CrmContactActivity"("orgId", "occurredAt");
CREATE INDEX "CrmContactActivity_profileId_occurredAt_idx" ON "CrmContactActivity"("profileId", "occurredAt");

ALTER TABLE "CrmContactProfile" ADD CONSTRAINT "CrmContactProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "OrganizationWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContactReminder" ADD CONSTRAINT "CrmContactReminder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "OrganizationWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContactReminder" ADD CONSTRAINT "CrmContactReminder_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CrmContactProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContactActivity" ADD CONSTRAINT "CrmContactActivity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "OrganizationWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContactActivity" ADD CONSTRAINT "CrmContactActivity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CrmContactProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
