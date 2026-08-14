import { describe, expect, it } from 'vitest';
import { buildContactActionHref } from '@/lib/contacts/contact-actions';

describe('buildContactActionHref', () => {
  it('opens email in a new Gmail compose with the contact and account context', () => {
    expect(
      buildContactActionHref({
        kind: 'email',
        email: ' buyer@example.com ',
        phone: '',
        accountName: 'Harbor House',
      }),
    ).toBe(
      'https://mail.google.com/mail/?view=cm&fs=1&to=buyer%40example.com&su=PICC%20follow-up%3A%20Harbor%20House',
    );
  });

  it('normalizes phone links for text and call without inventing a number', () => {
    const input = { email: '', phone: '+1 (347) 555-0198', accountName: 'Harbor House' };

    expect(buildContactActionHref({ ...input, kind: 'text' })).toBe('sms:+13475550198');
    expect(buildContactActionHref({ ...input, kind: 'call' })).toBe('tel:+13475550198');
    expect(buildContactActionHref({ ...input, kind: 'call', phone: '—' })).toBeNull();
  });
});
