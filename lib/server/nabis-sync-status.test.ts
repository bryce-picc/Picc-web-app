import { describe, expect, it } from 'vitest';
import { IntegrationSyncStatus } from '@prisma/client';
import { resolveLastSuccessfulSyncAt } from '@/lib/server/nabis-sync-status';

describe('Nabis successful freshness timestamps', () => {
  it('uses the latest successful run instead of a failed checkpoint update', () => {
    expect(
      resolveLastSuccessfulSyncAt({
        checkpointStatus: IntegrationSyncStatus.ERROR,
        checkpointMetadata: { error: 'failed attempt' },
        checkpointUpdatedAt: new Date('2026-08-14T14:00:00.000Z'),
        latestSuccessfulRunFinishedAt: new Date('2026-08-07T05:06:03.022Z'),
      }),
    ).toBe('2026-08-07T05:06:03.022Z');
  });

  it('uses a successful checkpoint update when no explicit success timestamp exists', () => {
    expect(
      resolveLastSuccessfulSyncAt({
        checkpointStatus: IntegrationSyncStatus.SUCCESS,
        checkpointMetadata: {},
        checkpointUpdatedAt: new Date('2026-08-14T14:00:00.000Z'),
        latestSuccessfulRunFinishedAt: null,
      }),
    ).toBe('2026-08-14T14:00:00.000Z');
  });

  it('prefers the explicit successful timestamp preserved in checkpoint metadata', () => {
    expect(
      resolveLastSuccessfulSyncAt({
        checkpointStatus: IntegrationSyncStatus.ERROR,
        checkpointMetadata: { lastSuccessfulSyncAt: '2026-08-13T10:00:00.000Z' },
        checkpointUpdatedAt: new Date('2026-08-14T14:00:00.000Z'),
        latestSuccessfulRunFinishedAt: new Date('2026-08-12T10:00:00.000Z'),
      }),
    ).toBe('2026-08-13T10:00:00.000Z');
  });
});
