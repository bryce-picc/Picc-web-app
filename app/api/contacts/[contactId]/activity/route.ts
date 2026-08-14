import { Channel } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import { prisma } from '@/lib/db/prisma';

const activitySchema = z.object({ action: z.enum(['email', 'text', 'call']) });
const actionMeta = {
  email: { channel: Channel.EMAIL, summary: 'Opened Gmail compose' },
  text: { channel: Channel.SMS, summary: 'Opened the messaging app' },
  call: { channel: Channel.PHONE_CALL, summary: 'Opened the phone app' },
} as const;

function normalizeContactId(value: string) {
  const normalized = value.replace(/-/g, '').trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) throw new Error('Invalid contact ID');
  return normalized;
}

export async function POST(request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP', 'BRAND_AMBASSADOR']);
  if ('error' in ctx) return ctx.error;
  try {
    const { contactId } = await params;
    const notionContactPageId = normalizeContactId(contactId);
    const payload = await parseJsonBody(request, activitySchema);
    const profile = await prisma.crmContactProfile.upsert({
      where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId } },
      create: { orgId: ctx.orgId, notionContactPageId, lastSeenAt: new Date() },
      update: { lastSeenAt: new Date() },
    });
    const activity = await prisma.crmContactActivity.create({
      data: {
        orgId: ctx.orgId,
        profileId: profile.id,
        kind: 'external_app_opened',
        channel: actionMeta[payload.action].channel,
        summary: actionMeta[payload.action].summary,
        occurredAt: new Date(),
      },
    });
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to log contact activity', zodMessage: 'Invalid activity', statusByMessage: { 'Invalid contact ID': 400 } });
  }
}
