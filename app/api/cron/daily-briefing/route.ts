import { NextResponse } from 'next/server';
import { isCronRequestAuthorized } from '@/lib/server/cron-auth';
import { processDailyBriefings } from '@/lib/server/daily-briefing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const results = await processDailyBriefings();
  return NextResponse.json({ ok: results.every((result) => result.status !== 'error'), processed: results.length, results: results.map((result) => ({ status: result.status })) });
}
