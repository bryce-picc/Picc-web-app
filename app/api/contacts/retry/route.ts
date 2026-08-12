import { NextResponse } from 'next/server';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import { guard } from '@/lib/auth/api-guard';
import { retryVerifiedContactLink } from '@/lib/server/contact-creation';
import { createNotionContactCreationAdapter } from '@/lib/server/notion-contact-creation';
import { notionContactRetrySchema } from '@/lib/validation/schemas';

export async function POST(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP', 'BRAND_AMBASSADOR']);
  if ('error' in ctx) return ctx.error;

  try {
    const payload = await parseJsonBody(req, notionContactRetrySchema);
    const result = await retryVerifiedContactLink(payload, createNotionContactCreationAdapter());
    return NextResponse.json(result, { status: result.status === 'partial_relation' ? 202 : 200 });
  } catch (error) {
    return routeErrorResponse(error, {
      fallbackMessage: 'Failed to verify contact relationship',
      zodMessage: 'Invalid contact retry payload',
      statusByMessage: {
        'Contact account not found': 404,
        'Contact not found': 404,
      },
    });
  }
}
