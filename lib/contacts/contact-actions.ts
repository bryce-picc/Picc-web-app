export type ContactActionKind = 'email' | 'text' | 'call';

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return !trimmed || trimmed === '—' ? null : trimmed;
}

export function normalizeContactPhone(value: string | null | undefined) {
  const phone = clean(value);
  if (!phone) return null;

  const normalized = phone.replace(/[^+\d]/g, '');
  return normalized.length > 0 ? normalized : null;
}

export function buildContactActionHref(input: {
  kind: ContactActionKind;
  email: string | null | undefined;
  phone: string | null | undefined;
  accountName: string;
}) {
  if (input.kind === 'email') {
    const email = clean(input.email);
    if (!email) return null;

    return [
      'https://mail.google.com/mail/?view=cm&fs=1',
      `to=${encodeURIComponent(email)}`,
      `su=${encodeURIComponent(`PICC follow-up: ${input.accountName}`)}`,
    ].join('&');
  }

  const phone = normalizeContactPhone(input.phone);
  if (!phone) return null;
  return `${input.kind === 'text' ? 'sms' : 'tel'}:${phone}`;
}
