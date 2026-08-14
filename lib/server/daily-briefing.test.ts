import { IntegrationSyncStatus } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('scheduled daily briefing delivery', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it('does not send a second briefing for the same user and local date', async () => {
    const loadTerritoryStores = vi.fn();
    const sendDailyBriefingEmail = vi.fn();
    vi.doMock('@/lib/db/prisma', () => ({
      prisma: {
        userFollowUpPreference: {
          findUnique: vi.fn().mockResolvedValue({
            dailyBriefingEnabled: true,
            dailyBriefingTime: '08:00',
            timezone: 'America/New_York',
            briefingRecipientEmail: 'rep@picc.co',
          }),
        },
        gmailConnection: {
          findUnique: vi.fn().mockResolvedValue({ mailboxEmail: 'rep@picc.co' }),
        },
        dailyBriefingDelivery: {
          findUnique: vi.fn().mockResolvedValue({ status: IntegrationSyncStatus.SUCCESS }),
        },
      },
    }));
    vi.doMock('@/lib/server/notion-territory', () => ({ loadTerritoryStores }));
    vi.doMock('@/lib/server/daily-briefing-email', () => ({ renderDailyBriefingEmail: vi.fn(), sendDailyBriefingEmail }));

    const { sendBriefingForUser } = await import('@/lib/server/daily-briefing');
    const result = await sendBriefingForUser({ orgId: 'org-1', clerkUserId: 'user-1', now: new Date('2026-08-14T12:15:00Z') });

    expect(result).toEqual({ status: 'already_sent' });
    expect(loadTerritoryStores).not.toHaveBeenCalled();
    expect(sendDailyBriefingEmail).not.toHaveBeenCalled();
  });
});
