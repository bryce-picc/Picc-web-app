import 'server-only';

export type TransactionalEmailResult = {
  status: 'SENT' | 'FAILED' | 'UNAVAILABLE';
  providerMessageId: string | null;
  error: string | null;
};

export function transactionalEmailReady() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.PICC_ALERTS_FROM_EMAIL?.trim());
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<TransactionalEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PICC_ALERTS_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return {
      status: 'UNAVAILABLE',
      providerMessageId: null,
      error: 'Transactional email is not configured.',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    if (!response.ok) {
      return {
        status: 'FAILED',
        providerMessageId: null,
        error: `Transactional email delivery failed (${response.status}).`,
      };
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: unknown };
    return {
      status: 'SENT',
      providerMessageId: typeof payload.id === 'string' ? payload.id : null,
      error: null,
    };
  } catch {
    return {
      status: 'FAILED',
      providerMessageId: null,
      error: 'Transactional email delivery failed.',
    };
  }
}
