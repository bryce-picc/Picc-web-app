import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import { prisma } from '@/lib/db/prisma';

const profileSchema = z.object({
  favorite: z.boolean(),
  frequencyDays: z.number().int().min(1).max(365).nullable(),
  lastSeenAt: z.string().datetime().nullable(),
  instagramUrl: z.string().trim().url().max(500).nullable(),
  linkedinUrl: z.string().trim().url().max(500).nullable(),
  archived: z.boolean(),
});

function normalizeContactId(value: string) {
  const normalized = value.replace(/-/g, '').trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) throw new Error('Invalid contact ID');
  return normalized;
}

export async function GET(_request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await guard();
  if ('error' in ctx) return ctx.error;
  try {
    const { contactId } = await params;
    const notionContactPageId = normalizeContactId(contactId);
    const profile = await prisma.crmContactProfile.findUnique({
      where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId } },
      include: {
        reminders: { orderBy: { dueAt: 'asc' } },
        activities: { orderBy: { occurredAt: 'desc' }, take: 100 },
      },
    });
    return NextResponse.json({
      profile: profile ?? {
        notionContactPageId,
        favorite: false,
        frequencyDays: null,
        lastSeenAt: null,
        instagramUrl: null,
        linkedinUrl: null,
        archivedAt: null,
        mergedIntoPageId: null,
        reminders: [],
        activities: [],
      },
    });
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to load contact profile', statusByMessage: { 'Invalid contact ID': 400 } });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP', 'BRAND_AMBASSADOR']);
  if ('error' in ctx) return ctx.error;
  try {
    const { contactId } = await params;
    const notionContactPageId = normalizeContactId(contactId);
    const payload = await parseJsonBody(request, profileSchema);
    const profile = await prisma.crmContactProfile.upsert({
      where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId } },
      create: {
        orgId: ctx.orgId,
        notionContactPageId,
        favorite: payload.favorite,
        frequencyDays: payload.frequencyDays,
        lastSeenAt: payload.lastSeenAt ? new Date(payload.lastSeenAt) : null,
        instagramUrl: payload.instagramUrl,
        linkedinUrl: payload.linkedinUrl,
        archivedAt: payload.archived ? new Date() : null,
      },
      update: {
        favorite: payload.favorite,
        frequencyDays: payload.frequencyDays,
        lastSeenAt: payload.lastSeenAt ? new Date(payload.lastSeenAt) : null,
        instagramUrl: payload.instagramUrl,
        linkedinUrl: payload.linkedinUrl,
        archivedAt: payload.archived ? new Date() : null,
      },
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to save contact profile', zodMessage: 'Invalid contact profile', statusByMessage: { 'Invalid contact ID': 400 } });
  }
}
