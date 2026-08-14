import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendTransactionalEmail } from '@/lib/server/transactional-email';

const originalEnv = process.env;

describe('transactional email adapter', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.PICC_ALERTS_FROM_EMAIL;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('reports unavailable without attempting delivery when transport is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sendTransactionalEmail({
        to: 'admin@piccplatform.com',
        subject: 'Review required',
        text: 'Open Settings to review.',
        html: '<p>Open Settings to review.</p>',
        idempotencyKey: 'conflict-1',
      }),
    ).resolves.toEqual({ status: 'UNAVAILABLE', providerMessageId: null, error: 'Transactional email is not configured.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends with a deterministic idempotency key and returns the provider id', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.PICC_ALERTS_FROM_EMAIL = 'PICC Alerts <alerts@piccplatform.com>';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sendTransactionalEmail({
        to: 'admin@piccplatform.com',
        subject: 'Review required',
        text: 'Open Settings to review.',
        html: '<p>Open Settings to review.</p>',
        idempotencyKey: 'conflict-1',
      }),
    ).resolves.toEqual({ status: 'SENT', providerMessageId: 'email-1', error: null });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
          'Idempotency-Key': 'conflict-1',
        }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      from: 'PICC Alerts <alerts@piccplatform.com>',
      to: ['admin@piccplatform.com'],
      subject: 'Review required',
    });
  });

  it('returns a sanitized failure without exposing provider response content', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.PICC_ALERTS_FROM_EMAIL = 'PICC Alerts <alerts@piccplatform.com>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('sensitive provider detail', { status: 422 })));

    await expect(
      sendTransactionalEmail({
        to: 'admin@piccplatform.com',
        subject: 'Review required',
        text: 'Open Settings to review.',
        html: '<p>Open Settings to review.</p>',
        idempotencyKey: 'conflict-1',
      }),
    ).resolves.toEqual({ status: 'FAILED', providerMessageId: null, error: 'Transactional email delivery failed (422).' });
  });
});
