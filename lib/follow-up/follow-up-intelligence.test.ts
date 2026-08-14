import { describe, expect, it } from 'vitest';
import { buildDailyBriefing, buildResurfacedContacts, defaultFollowUpDate, isBriefingDeliveryWindow } from '@/lib/follow-up/follow-up-intelligence';

describe('follow-up intelligence', () => {
  it('uses the action-specific default follow-up interval', () => {
    const preferences = { defaultEmailDays: 7, defaultTextDays: 3, defaultCallDays: 1 };
    expect(defaultFollowUpDate('email', preferences, new Date('2026-08-14T14:00:00Z'))).toBe('2026-08-21');
    expect(defaultFollowUpDate('text', preferences, new Date('2026-08-14T14:00:00Z'))).toBe('2026-08-17');
    expect(defaultFollowUpDate('call', preferences, new Date('2026-08-14T14:00:00Z'))).toBe('2026-08-15');
  });

  it('only opens the daily delivery window at the configured local hour', () => {
    expect(isBriefingDeliveryWindow(new Date('2026-08-14T12:15:00Z'), 'America/New_York', '08:00')).toBe(true);
    expect(isBriefingDeliveryWindow(new Date('2026-08-14T11:15:00Z'), 'America/New_York', '08:00')).toBe(false);
  });

  it('resurfaces quiet contacts with transparent reasons and next actions', () => {
    const results = buildResurfacedContacts([{ id: 'c1', name: 'Mara', accountName: 'Harbor', email: 'mara@example.com', phone: '+12125550111', favorite: true, frequencyDays: 14, firstMetAt: '2026-05-01T12:00:00Z', lastMetAt: '2026-07-01T12:00:00Z', reminderNote: null, reminderDueAt: null }], new Date('2026-08-14T12:00:00Z'));
    expect(results[0]).toMatchObject({ id: 'c1', whySurfaced: expect.stringContaining('14-day'), suggestedTitle: 'Reconnect with Mara' });
  });

  it('builds the three requested briefing sections and ranks warm leads by sample recency', () => {
    const result = buildDailyBriefing([
      { id: 'due', name: 'Due Store', repEmails: ['rep@picc.co'], followUpNeeded: true, followUpDate: '2026-08-14', followUpReason: 'Confirm order', statusKey: 'customer', pppStatus: null, lastSampleDate: null },
      { id: 'ppp', name: 'PPP Store', repEmails: ['rep@picc.co'], followUpNeeded: false, followUpDate: null, followUpReason: null, statusKey: 'customer', pppStatus: 'Onboarding', lastSampleDate: null },
      { id: 'warm-old', name: 'Warm Old', repEmails: ['rep@picc.co'], followUpNeeded: false, followUpDate: null, followUpReason: null, statusKey: 'lead - hot', pppStatus: null, lastSampleDate: '2026-07-01' },
      { id: 'warm-new', name: 'Warm New', repEmails: ['rep@picc.co'], followUpNeeded: false, followUpDate: null, followUpReason: null, statusKey: 'lead - hot', pppStatus: null, lastSampleDate: '2026-08-10' },
    ], 'rep@picc.co', '2026-08-14');
    expect(result.followUps.map((item) => item.name)).toEqual(['Due Store']);
    expect(result.pppOnboarding.map((item) => item.name)).toEqual(['PPP Store']);
    expect(result.warmLeads.map((item) => item.name)).toEqual(['Warm New', 'Warm Old']);
  });
});
