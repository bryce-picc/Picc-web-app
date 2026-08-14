import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { parseJsonBody, routeErrorResponse } from '@/lib/api/route-errors';
import {
  getNabisIdentityReviewSettings,
  resolveNabisIdentityConflict,
  retryNabisIdentityConflictEmail,
  saveNabisIdentityReviewPreference,
} from '@/lib/server/nabis-identity-conflict-admin';

export const dynamic = 'force-dynamic';

const preferenceSchema = z.object({
  email: z.string().trim().email().max(320),
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
});

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('resolve'),
    notificationId: z.string().cuid(),
    decision: z.enum(['KEEP_CURRENT_OWNER', 'TRANSFER_TO_INCOMING']),
  }),
  z.object({
    action: z.literal('retry-email'),
    notificationId: z.string().cuid(),
  }),
]);

export async function GET() {
  const ctx = await guard(['ADMIN', 'OPS_TEAM']);
  if ('error' in ctx) return ctx.error;
  try {
    return NextResponse.json(await getNabisIdentityReviewSettings(ctx.orgId));
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to load Nabis identity reviews' });
  }
}

export async function PATCH(request: Request) {
  const ctx = await guard(['ADMIN']);
  if ('error' in ctx) return ctx.error;
  try {
    const payload = await parseJsonBody(request, preferenceSchema);
    await saveNabisIdentityReviewPreference({
      orgId: ctx.orgId,
      clerkUserId: ctx.userId,
      ...payload,
    });
    return NextResponse.json(await getNabisIdentityReviewSettings(ctx.orgId));
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to save Nabis review alerts' });
  }
}

export async function POST(request: Request) {
  const ctx = await guard(['ADMIN']);
  if ('error' in ctx) return ctx.error;
  try {
    const payload = await parseJsonBody(request, actionSchema);
    if (payload.action === 'retry-email') {
      await retryNabisIdentityConflictEmail(ctx.orgId, payload.notificationId);
    } else {
      await resolveNabisIdentityConflict({
        orgId: ctx.orgId,
        notificationId: payload.notificationId,
        decision: payload.decision,
        actor: { clerkUserId: ctx.userId, email: ctx.email ?? null },
      });
    }
    return NextResponse.json(await getNabisIdentityReviewSettings(ctx.orgId));
  } catch (error) {
    return routeErrorResponse(error, { fallbackMessage: 'Failed to update Nabis identity review' });
  }
}
