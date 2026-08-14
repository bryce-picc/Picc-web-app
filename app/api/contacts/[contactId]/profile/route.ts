import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import { prisma } from '@/lib/db/prisma';

const profileSchema = z.object({
  favorite: z.boolean().optional(),
  frequencyDays: z.number().int().min(1).max(365).nullable().optional(),
  lastSeenAt: z.string().datetime().nullable().optional(),
  instagramUrl: z.string().trim().url().max(500).nullable().optional(),
  linkedinUrl: z.string().trim().url().max(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Choose at least one contact profile field');

function profileData(payload: z.infer<typeof profileSchema>) {
  return {
    ...(payload.favorite === undefined ? {} : { favorite: payload.favorite }),
    ...(payload.frequencyDays === undefined ? {} : { frequencyDays: payload.frequencyDays }),
    ...(payload.lastSeenAt === undefined ? {} : { lastSeenAt: payload.lastSeenAt ? new Date(payload.lastSeenAt) : null }),
    ...(payload.instagramUrl === undefined ? {} : { instagramUrl: payload.instagramUrl }),
    ...(payload.linkedinUrl === undefined ? {} : { linkedinUrl: payload.linkedinUrl }),
  };
}

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
        activities: { where: { providerMessageId: null }, orderBy: { occurredAt: 'desc' }, take: 100 },
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
    const data = profileData(payload);
    const profile = await prisma.crmContactProfile.upsert({
      where: { orgId_notionContactPageId: { orgId: ctx.orgId, notionContactPageId } },
      create: {
        orgId: ctx.orgId,
        notionContactPageId,
        ...data,
      },
      update: data,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to save contact profile', zodMessage: 'Invalid contact profile', statusByMessage: { 'Invalid contact ID': 400 } });
  }
}
