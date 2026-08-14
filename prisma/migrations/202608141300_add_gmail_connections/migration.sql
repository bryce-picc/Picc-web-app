ALTER TABLE "CrmContactActivity"
ADD COLUMN "actorClerkUserId" TEXT,
ADD COLUMN "providerMessageId" TEXT;

CREATE UNIQUE INDEX "CrmContactActivity_orgId_actorClerkUserId_providerMessageId_key"
ON "CrmContactActivity"("orgId", "actorClerkUserId", "providerMessageId");

CREATE TABLE "GmailConnection" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "clerkUserId" TEXT NOT NULL,
  "mailboxEmail" TEXT NOT NULL,
  "encryptedAccessToken" TEXT,
  "encryptedRefreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "grantedScope" TEXT NOT NULL,
  "status" "IntegrationSyncStatus" NOT NULL DEFAULT 'IDLE',
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GmailConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GmailConnection_orgId_clerkUserId_key" ON "GmailConnection"("orgId", "clerkUserId");
CREATE INDEX "GmailConnection_orgId_mailboxEmail_idx" ON "GmailConnection"("orgId", "mailboxEmail");
ALTER TABLE "GmailConnection" ADD CONSTRAINT "GmailConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "OrganizationWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
