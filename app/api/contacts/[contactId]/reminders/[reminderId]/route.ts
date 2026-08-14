import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import { prisma } from '@/lib/db/prisma';

const updateSchema = z.object({ status: z.enum(['DONE', 'CANCELLED']) });

function normalizeContactId(value: string) {
  const normalized = value.replace(/-/g, '').trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) throw new Error('Invalid contact ID');
  return normalized;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ contactId: string; reminderId: string }> }) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP', 'BRAND_AMBASSADOR']);
  if ('error' in ctx) return ctx.error;
  try {
    const { contactId, reminderId } = await params;
    const notionContactPageId = normalizeContactId(contactId);
    const payload = await parseJsonBody(request, updateSchema);
    const result = await prisma.crmContactReminder.updateMany({
      where: { id: reminderId, orgId: ctx.orgId, profile: { notionContactPageId } },
      data: { status: payload.status },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    return NextResponse.json({ reminder: { id: reminderId, status: payload.status } });
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to update reminder', zodMessage: 'Invalid reminder update', statusByMessage: { 'Invalid contact ID': 400 } });
  }
}
