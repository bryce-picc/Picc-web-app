import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderDailyBriefingEmail, sendDailyBriefingEmail } from '@/lib/server/daily-briefing-email';

const priorKey = process.env.SENDGRID_API_KEY;
const priorFrom = process.env.DAILY_DEBRIEF_FROM_EMAIL;
afterEach(() => {
  process.env.SENDGRID_API_KEY = priorKey;
  process.env.DAILY_DEBRIEF_FROM_EMAIL = priorFrom;
});

describe('daily briefing email', () => {
  it('renders the requested sections without an LLM', () => {
    const item = { id: 'store-1', name: 'Harbor & House', repEmails: ['rep@picc.co'], followUpNeeded: true, followUpDate: '2026-08-14', followUpReason: 'Confirm order', statusKey: 'lead - hot', pppStatus: 'Onboarding', lastSampleDate: '2026-08-12' };
    const rendered = renderDailyBriefingEmail({ followUps: [item], pppOnboarding: [item], warmLeads: [item] }, '2026-08-14', 'https://piccnewyork.org');
    expect(rendered.subject).toContain('1 follow-ups due');
    expect(rendered.html).toContain('Follow-ups due today or overdue');
    expect(rendered.html).toContain('Open PPP onboarding');
    expect(rendered.html).toContain('Warm leads to close');
    expect(rendered.html).toContain('Harbor &amp; House');
  });

  it('sends through the configured transactional email boundary', async () => {
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.DAILY_DEBRIEF_FROM_EMAIL = 'briefing@picc.co';
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 202 })) as unknown as typeof fetch;
    await sendDailyBriefingEmail({ to: 'rep@picc.co', subject: 'Daily', html: '<p>Hello</p>' }, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.sendgrid.com/v3/mail/send', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(body.personalizations[0].to[0].email).toBe('rep@picc.co');
  });
});
