import { describe, expect, it } from 'vitest';
import {
  assessNabisIdentityLink,
  createNabisIdentityConflictKey,
  recordNabisIdentityConflict,
  type IdentityConflictNotification,
} from '@/lib/server/nabis-identity-conflicts';

describe('Nabis identity link assessment', () => {
  it('requires review when the CRM adapter reports an ambiguous match', () => {
    expect(
      assessNabisIdentityLink({
        reviewRequired: true,
        incomingAccountId: 'account-incoming',
        ownerAccountId: null,
      }),
    ).toBe('REVIEW');
  });

  it('requires review when another account owns the candidate page', () => {
    expect(
      assessNabisIdentityLink({
        reviewRequired: false,
        incomingAccountId: 'account-incoming',
        ownerAccountId: 'account-current-owner',
      }),
    ).toBe('REVIEW');
  });

  it('links exact unowned and same-owner pages', () => {
    expect(
      assessNabisIdentityLink({
        reviewRequired: false,
        incomingAccountId: 'account-incoming',
        ownerAccountId: null,
      }),
    ).toBe('LINK');
    expect(
      assessNabisIdentityLink({
        reviewRequired: false,
        incomingAccountId: 'account-incoming',
        ownerAccountId: 'account-incoming',
      }),
    ).toBe('LINK');
  });

  it('builds a stable conflict key from normalized identity evidence', () => {
    const first = createNabisIdentityConflictKey({
      orgId: 'ORG-1',
      incomingAccountId: 'ACCOUNT-1',
      candidatePageId: 'ABC-DEF',
      reason: 'license_conflict',
    });
    const second = createNabisIdentityConflictKey({
      orgId: ' org-1 ',
      incomingAccountId: 'account-1',
      candidatePageId: 'abcdef',
      reason: 'license_conflict',
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^nabis-identity:[a-f0-9]{64}$/);
  });
});

describe('Nabis identity conflict lifecycle', () => {
  function conflictInput() {
    return {
      orgId: 'org-1',
      recipientKey: 'user-1',
      incomingAccountId: 'account-incoming',
      incomingAccountName: 'Incoming Account',
      candidatePageId: 'page-1',
      currentOwnerAccountId: 'account-current',
      currentOwnerAccountName: 'Current Account',
      reason: 'license_conflict' as const,
      sourceIdentifiers: {
        licensedLocationId: 'location-1',
        nabisRetailerId: 'retailer-1',
        licenseNumber: 'license-1',
      },
    };
  }

  it('opens one notification and calls the opening hook once', async () => {
    const opened: IdentityConflictNotification[] = [];
    const created: IdentityConflictNotification[] = [];
    const result = await recordNabisIdentityConflict(conflictInput(), {
      findOpenByKey: async () => null,
      create: async (notification) => {
        const persisted = { ...notification, id: 'notification-1' };
        created.push(persisted);
        return persisted;
      },
      update: async () => {
        throw new Error('Unexpected update');
      },
      onOpened: async (notification) => {
        opened.push(notification);
      },
      now: () => new Date('2026-08-14T14:00:00.000Z'),
    });

    expect(result.created).toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0]?.metadata).toMatchObject({
      status: 'OPEN',
      occurrenceCount: 1,
      firstDetectedAt: '2026-08-14T14:00:00.000Z',
      lastDetectedAt: '2026-08-14T14:00:00.000Z',
    });
    expect(opened).toHaveLength(1);
  });

  it('updates the existing open item without calling the opening hook again', async () => {
    const key = createNabisIdentityConflictKey(conflictInput());
    const existing: IdentityConflictNotification = {
      id: 'notification-1',
      orgId: 'org-1',
      recipientKey: 'user-1',
      title: 'Nabis identity review required',
      body: 'Review Incoming Account and Current Account.',
      createdAt: '2026-08-14T13:00:00.000Z',
      metadata: {
        schemaVersion: 1,
        kind: 'nabis_identity_conflict',
        conflictKey: key,
        status: 'OPEN',
        occurrenceCount: 1,
        firstDetectedAt: '2026-08-14T13:00:00.000Z',
        lastDetectedAt: '2026-08-14T13:00:00.000Z',
        incomingAccountId: 'account-incoming',
        incomingAccountName: 'Incoming Account',
        candidatePageId: 'page-1',
        currentOwnerAccountId: 'account-current',
        currentOwnerAccountName: 'Current Account',
        reason: 'license_conflict',
        sourceIdentifiers: conflictInput().sourceIdentifiers,
        email: { status: 'PENDING' },
      },
    };
    let opened = 0;
    const updates: IdentityConflictNotification[] = [];

    const result = await recordNabisIdentityConflict(conflictInput(), {
      findOpenByKey: async () => existing,
      create: async () => {
        throw new Error('Unexpected create');
      },
      update: async (_id, notification) => {
        const updated = { ...existing, ...notification, id: existing.id };
        updates.push(updated);
        return updated;
      },
      onOpened: async () => {
        opened += 1;
      },
      now: () => new Date('2026-08-14T14:00:00.000Z'),
    });

    expect(result.created).toBe(false);
    expect(updates[0]?.metadata).toMatchObject({
      occurrenceCount: 2,
      firstDetectedAt: '2026-08-14T13:00:00.000Z',
      lastDetectedAt: '2026-08-14T14:00:00.000Z',
    });
    expect(opened).toBe(0);
  });
});
