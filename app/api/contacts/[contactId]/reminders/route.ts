import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import { prisma } from '@/lib/db/prisma';

const reminderSchema = z.object({
  dueAt: z.string().datetime(),
  note: z.string().trim().min(1).max(500),
});

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
    const payload = await parseJsonBody(request, reminderSchema);
    const profile = await prisma.crmContactProfile.upsert({
      where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId } },
      create: { orgId: ctx.orgId, notionContactPageId },
      update: {},
    });
    const reminder = await prisma.crmContactReminder.create({
      data: { orgId: ctx.orgId, profileId: profile.id, dueAt: new Date(payload.dueAt), note: payload.note },
    });
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to create reminder', zodMessage: 'Invalid reminder', statusByMessage: { 'Invalid contact ID': 400 } });
  }
}
