import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/api-guard';
import { sendBriefingForUser } from '@/lib/server/daily-briefing';

export async function POST() {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  try {
    const result = await sendBriefingForUser({ orgId: ctx.orgId, clerkUserId: ctx.userId, force: true });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Preview could not be sent' }, { status: 502 });
  }
}
