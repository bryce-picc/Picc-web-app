import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';
import { gmailConfigurationStatus } from '@/lib/server/gmail-provider';

export async function GET() {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  const connection = await prisma.gmailConnection.findUnique({
    where: { orgId_clerkUserId: { orgId: ctx.orgId, clerkUserId: ctx.userId } },
    select: { mailboxEmail: true, status: true, lastSyncedAt: true, lastError: true, updatedAt: true },
  });
  return NextResponse.json({ configuration: gmailConfigurationStatus(), connection });
}

export async function DELETE() {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  await prisma.gmailConnection.deleteMany({ where: { orgId: ctx.orgId, clerkUserId: ctx.userId } });
  return NextResponse.json({ ok: true });
}
