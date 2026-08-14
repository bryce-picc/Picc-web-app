import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import { validateContactMerge } from '@/lib/contacts/contact-profile';
import { prisma } from '@/lib/db/prisma';
import { mergeNotionContacts, trashNotionContact } from '@/lib/server/notion-contact-lifecycle';
import { refreshLiveNotionContactsCache } from '@/lib/server/notion-live-crm';

const lifecycleSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('archive') }),
  z.object({ action: z.literal('unarchive') }),
  z.object({ action: z.literal('delete') }),
  z.object({ action: z.literal('merge'), sourceId: z.string(), targetId: z.string() }),
]);

function normalizeContactId(value: string) {
  const normalized = value.replace(/-/g, '').trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) throw new Error('Invalid contact ID');
  return normalized;
}

export async function POST(request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  try {
    const { contactId } = await params;
    const sourceId = normalizeContactId(contactId);
    const payload = await parseJsonBody(request, lifecycleSchema);

    if (payload.action === 'archive' || payload.action === 'unarchive') {
      const archivedAt = payload.action === 'archive' ? new Date() : null;
      await prisma.crmContactProfile.upsert({
        where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId: sourceId } },
        create: { orgId: ctx.orgId, notionContactPageId: sourceId, archivedAt },
        update: { archivedAt },
      });
      return NextResponse.json({ ok: true, redirectTo: payload.action === 'archive' ? '/contacts?archived=1' : '/contacts' });
    }

    if (ctx.role === 'SALES_REP') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payload.action === 'delete') {
      await trashNotionContact(sourceId);
      await prisma.crmContactProfile.upsert({
        where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId: sourceId } },
        create: { orgId: ctx.orgId, notionContactPageId: sourceId, archivedAt: new Date() },
        update: { archivedAt: new Date() },
      });
      await refreshLiveNotionContactsCache().catch(() => undefined);
      return NextResponse.json({ ok: true, redirectTo: '/contacts' });
    }

    const merge = validateContactMerge({ sourceId, targetId: normalizeContactId(payload.targetId) });
    await mergeNotionContacts(merge.sourceId, merge.targetId);
    const [sourceProfile, targetProfile] = await Promise.all([
      prisma.crmContactProfile.upsert({
        where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId: merge.sourceId } },
        create: { orgId: ctx.orgId, notionContactPageId: merge.sourceId },
        update: {},
      }),
      prisma.crmContactProfile.upsert({
        where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId: merge.targetId } },
        create: { orgId: ctx.orgId, notionContactPageId: merge.targetId },
        update: {},
      }),
    ]);
    await prisma.$transaction([
      prisma.crmContactReminder.updateMany({ where: { orgId: ctx.orgId, profileId: sourceProfile.id }, data: { profileId: targetProfile.id } }),
      prisma.crmContactActivity.updateMany({ where: { orgId: ctx.orgId, profileId: sourceProfile.id }, data: { profileId: targetProfile.id } }),
      prisma.crmContactProfile.update({ where: { id: sourceProfile.id }, data: { archivedAt: new Date(), mergedIntoPageId: merge.targetId } }),
    ]);
    await refreshLiveNotionContactsCache().catch(() => undefined);
    return NextResponse.json({ ok: true, redirectTo: `/contacts/${merge.targetId}` });
  } catch (error) {
    return routeErrorResponse(error, {
      fallbackMessage: 'Contact maintenance action failed',
      zodMessage: 'Invalid contact action',
      statusByMessage: {
        'Invalid contact ID': 400,
        'Choose a different contact to merge into.': 400,
        'Contact not found': 404,
      },
    });
  }
}
