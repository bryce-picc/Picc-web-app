import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function request(body: unknown) {
  return new Request('http://localhost/api/settings/follow-up-preferences', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

describe('follow-up preference routes', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it('persists defaults only for the signed-in user and tenant', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'preference-1' });
    vi.doMock('@/lib/auth/api-guard', () => ({ guard: vi.fn().mockResolvedValue({ orgId: 'org-1', userId: 'user-1', email: 'rep@picc.co' }) }));
    vi.doMock('@/lib/db/prisma', () => ({ prisma: { userFollowUpPreference: { upsert } } }));
    const { PATCH } = await import('@/app/api/settings/follow-up-preferences/route');
    const response = await PATCH(request({ defaultEmailDays: 7, defaultTextDays: 3, defaultCallDays: 1, resurfaceAfterDays: 30, dailyBriefingEnabled: true, dailyBriefingTime: '08:00', timezone: 'America/New_York', briefingRecipientEmail: 'rep@picc.co' }));
    expect(response?.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { orgId_clerkUserId: { orgId: 'org-1', clerkUserId: 'user-1' } } }));
  });

  it('rejects unauthenticated cron requests without processing deliveries', async () => {
    const processDailyBriefings = vi.fn();
    vi.doMock('@/lib/server/cron-auth', () => ({ isCronRequestAuthorized: vi.fn(() => false) }));
    vi.doMock('@/lib/server/daily-briefing', () => ({ processDailyBriefings }));
    const { GET } = await import('@/app/api/cron/daily-briefing/route');
    const response = await GET(new Request('http://localhost/api/cron/daily-briefing'));
    expect(response.status).toBe(401);
    expect(processDailyBriefings).not.toHaveBeenCalled();
  });
});
