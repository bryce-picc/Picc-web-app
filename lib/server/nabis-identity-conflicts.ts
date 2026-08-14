import 'server-only';

import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export type NabisIdentityReviewReason =
  | 'nabis_retailer_id_conflict'
  | 'license_conflict'
  | 'name_location_conflict'
  | 'page_owned_by_another_account';

export type NabisIdentityConflictStatus = 'OPEN' | 'RESOLVED';

export type NabisIdentityConflictEmail = {
  status: 'PENDING' | 'SENT' | 'FAILED' | 'UNAVAILABLE';
  providerMessageId?: string | null;
  error?: string | null;
  attemptedAt?: string | null;
};

export type NabisIdentityConflictMetadata = {
  schemaVersion: 1;
  kind: 'nabis_identity_conflict';
  conflictKey: string;
  status: NabisIdentityConflictStatus;
  occurrenceCount: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  incomingAccountId: string;
  incomingAccountName: string;
  candidatePageId: string;
  currentOwnerAccountId: string | null;
  currentOwnerAccountName: string | null;
  reason: NabisIdentityReviewReason;
  sourceIdentifiers: {
    licensedLocationId: string | null;
    nabisRetailerId: string | null;
    licenseNumber: string | null;
  };
  email: NabisIdentityConflictEmail;
  resolution?: {
    decision: 'KEEP_CURRENT_OWNER' | 'TRANSFER_TO_INCOMING';
    resolvedAt: string;
    resolvedByClerkUserId: string;
    resolvedByEmail: string | null;
  };
};

export type IdentityConflictNotification = {
  id: string;
  orgId: string;
  recipientKey: string;
  title: string;
  body: string;
  createdAt: string;
  metadata: NabisIdentityConflictMetadata;
};

export type NabisIdentityConflictInput = {
  orgId: string;
  recipientKey: string;
  incomingAccountId: string;
  incomingAccountName: string;
  candidatePageId: string;
  currentOwnerAccountId: string | null;
  currentOwnerAccountName: string | null;
  reason: NabisIdentityReviewReason;
  sourceIdentifiers: NabisIdentityConflictMetadata['sourceIdentifiers'];
};

type IdentityConflictNotificationDraft = Omit<IdentityConflictNotification, 'id'>;

type IdentityConflictRepository = {
  findOpenByKey: (conflictKey: string) => Promise<IdentityConflictNotification | null>;
  create: (notification: IdentityConflictNotificationDraft) => Promise<IdentityConflictNotification>;
  update: (id: string, notification: IdentityConflictNotificationDraft) => Promise<IdentityConflictNotification>;
  onOpened?: (notification: IdentityConflictNotification) => Promise<void>;
  now?: () => Date;
};

type PrismaNotificationRow = {
  id: string;
  orgId: string;
  userClerkId: string;
  title: string;
  body: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
};

export function assessNabisIdentityLink(input: {
  reviewRequired: boolean;
  incomingAccountId: string;
  ownerAccountId: string | null;
}): 'LINK' | 'REVIEW' {
  if (input.reviewRequired) {
    return 'REVIEW';
  }

  if (input.ownerAccountId && input.ownerAccountId !== input.incomingAccountId) {
    return 'REVIEW';
  }

  return 'LINK';
}

function normalizedKeyPart(value: string) {
  return value.trim().toLowerCase().replaceAll('-', '');
}

export function createNabisIdentityConflictKey(input: {
  orgId: string;
  incomingAccountId: string;
  candidatePageId: string;
  reason: NabisIdentityReviewReason;
}) {
  const payload = [input.orgId, input.incomingAccountId, input.candidatePageId, input.reason]
    .map(normalizedKeyPart)
    .join(':');
  return `nabis-identity:${createHash('sha256').update(payload).digest('hex')}`;
}

export async function recordNabisIdentityConflict(input: NabisIdentityConflictInput, repository: IdentityConflictRepository) {
  const now = (repository.now ?? (() => new Date()))().toISOString();
  const conflictKey = createNabisIdentityConflictKey(input);
  const existing = await repository.findOpenByKey(conflictKey);

  if (existing) {
    const updated = await repository.update(existing.id, {
      ...existing,
      orgId: input.orgId,
      recipientKey: input.recipientKey,
      body: `Review ${input.incomingAccountName} and ${input.currentOwnerAccountName ?? 'the candidate CRM record'}.`,
      metadata: {
        ...existing.metadata,
        occurrenceCount: existing.metadata.occurrenceCount + 1,
        lastDetectedAt: now,
        incomingAccountName: input.incomingAccountName,
        currentOwnerAccountId: input.currentOwnerAccountId,
        currentOwnerAccountName: input.currentOwnerAccountName,
        sourceIdentifiers: input.sourceIdentifiers,
      },
    });
    return { notification: updated, created: false };
  }

  const notification = await repository.create({
    orgId: input.orgId,
    recipientKey: input.recipientKey,
    title: 'Nabis identity review required',
    body: `Review ${input.incomingAccountName} and ${input.currentOwnerAccountName ?? 'the candidate CRM record'}.`,
    createdAt: now,
    metadata: {
      schemaVersion: 1,
      kind: 'nabis_identity_conflict',
      conflictKey,
      status: 'OPEN',
      occurrenceCount: 1,
      firstDetectedAt: now,
      lastDetectedAt: now,
      incomingAccountId: input.incomingAccountId,
      incomingAccountName: input.incomingAccountName,
      candidatePageId: input.candidatePageId,
      currentOwnerAccountId: input.currentOwnerAccountId,
      currentOwnerAccountName: input.currentOwnerAccountName,
      reason: input.reason,
      sourceIdentifiers: input.sourceIdentifiers,
      email: { status: 'PENDING' },
    },
  });

  if (repository.onOpened) {
    try {
      await repository.onOpened(notification);
    } catch {
      // Opening a review item must not fail the sales sync when notification delivery fails.
    }
  }

  return { notification, created: true };
}

function parseConflictMetadata(value: Prisma.JsonValue): NabisIdentityConflictMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const metadata = value as Record<string, unknown>;
  if (
    metadata.kind !== 'nabis_identity_conflict' ||
    typeof metadata.conflictKey !== 'string' ||
    (metadata.status !== 'OPEN' && metadata.status !== 'RESOLVED')
  ) {
    return null;
  }
  return metadata as NabisIdentityConflictMetadata;
}

function fromPrismaNotification(row: PrismaNotificationRow): IdentityConflictNotification | null {
  const metadata = parseConflictMetadata(row.metadata);
  if (!metadata) return null;
  return {
    id: row.id,
    orgId: row.orgId,
    recipientKey: row.userClerkId,
    title: row.title,
    body: row.body ?? '',
    createdAt: row.createdAt.toISOString(),
    metadata,
  };
}

export async function listNabisIdentityConflicts(orgId: string) {
  const rows = await prisma.notification.findMany({
    where: {
      orgId,
      title: 'Nabis identity review required',
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return rows.map(fromPrismaNotification).filter((row): row is IdentityConflictNotification => Boolean(row));
}

export async function persistNabisIdentityConflict(
  input: NabisIdentityConflictInput,
  options?: { onOpened?: (notification: IdentityConflictNotification) => Promise<void> },
) {
  return recordNabisIdentityConflict(input, {
    findOpenByKey: async (conflictKey) => {
      const conflicts = await listNabisIdentityConflicts(input.orgId);
      return conflicts.find((conflict) => conflict.metadata.status === 'OPEN' && conflict.metadata.conflictKey === conflictKey) ?? null;
    },
    create: async (notification) => {
      const row = await prisma.notification.create({
        data: {
          orgId: notification.orgId,
          userClerkId: notification.recipientKey,
          title: notification.title,
          body: notification.body,
          metadata: notification.metadata as unknown as Prisma.InputJsonValue,
        },
      });
      const mapped = fromPrismaNotification(row);
      if (!mapped) throw new Error('Created identity conflict could not be read back.');
      return mapped;
    },
    update: async (id, notification) => {
      const row = await prisma.notification.update({
        where: { id },
        data: {
          userClerkId: notification.recipientKey,
          title: notification.title,
          body: notification.body,
          metadata: notification.metadata as unknown as Prisma.InputJsonValue,
        },
      });
      const mapped = fromPrismaNotification(row);
      if (!mapped) throw new Error('Updated identity conflict could not be read back.');
      return mapped;
    },
    onOpened: options?.onOpened,
  });
}
