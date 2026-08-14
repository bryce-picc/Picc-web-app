import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import { prisma } from '@/lib/db/prisma';

const defaults = {
  defaultEmailDays: 7,
  defaultTextDays: 3,
  defaultCallDays: 1,
  resurfaceAfterDays: 30,
  dailyBriefingEnabled: false,
  dailyBriefingTime: '08:00',
  timezone: 'America/New_York',
  briefingRecipientEmail: null as string | null,
};

const schema = z.object({
  defaultEmailDays: z.number().int().min(1).max(90),
  defaultTextDays: z.number().int().min(1).max(90),
  defaultCallDays: z.number().int().min(1).max(90),
  resurfaceAfterDays: z.number().int().min(7).max(365),
  dailyBriefingEnabled: z.boolean(),
  dailyBriefingTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.enum(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']),
  briefingRecipientEmail: z.string().trim().email().nullable(),
});

export async function GET() {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  const preference = await prisma.userFollowUpPreference.findUnique({ where: { orgId_clerkUserId: { orgId: ctx.orgId, clerkUserId: ctx.userId } } });
  const gmail = await prisma.gmailConnection.findUnique({ where: { orgId_clerkUserId: { orgId: ctx.orgId, clerkUserId: ctx.userId } }, select: { mailboxEmail: true } });
  return NextResponse.json({ preference: preference ?? { ...defaults, briefingRecipientEmail: gmail?.mailboxEmail ?? ctx.email ?? null } });
}

export async function PATCH(request: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  try {
    const payload = await parseJsonBody(request, schema);
    const preference = await prisma.userFollowUpPreference.upsert({
      where: { orgId_clerkUserId: { orgId: ctx.orgId, clerkUserId: ctx.userId } },
      create: { orgId: ctx.orgId, clerkUserId: ctx.userId, ...payload },
      update: payload,
    });
    return NextResponse.json({ preference });
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Follow-up preferences could not be saved', zodMessage: 'Invalid follow-up preferences' });
  }
}
