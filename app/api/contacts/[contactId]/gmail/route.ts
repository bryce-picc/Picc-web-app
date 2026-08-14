import { IntegrationSyncStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/api-guard';
import { normalizeMailboxEmail } from '@/lib/gmail/gmail-domain';
import { prisma } from '@/lib/db/prisma';
import { getGmailAccess, GmailNotConnectedError } from '@/lib/server/gmail-connection';
import { gmailConfigurationStatus, listGmailMessages } from '@/lib/server/gmail-provider';
import { loadAccountContactRuntime } from '@/lib/server/account-contact-runtime';

function normalizeId(value: string) {
  const normalized = value.replace(/-/g, '').trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) throw new Error('Invalid contact ID');
  return normalized;
}

async function context(contactId: string, orgId: string, userId: string) {
  const normalizedId = normalizeId(contactId);
  const [runtime, connection] = await Promise.all([
    loadAccountContactRuntime(),
    prisma.gmailConnection.findUnique({
      where: { orgId_clerkUserId: { orgId, clerkUserId: userId } },
      select: { mailboxEmail: true, status: true, lastSyncedAt: true, lastError: true },
    }),
  ]);
  const contact = runtime.contacts.find((candidate) => normalizeId(candidate.id) === normalizedId);
  if (!contact) throw new Error('Contact not found');
  const profile = await prisma.crmContactProfile.upsert({
    where: { orgId_notionContactPageId: { orgId, notionContactPageId: normalizedId } },
    create: { orgId, notionContactPageId: normalizedId },
    update: {},
  });
  return { contact, connection, profile };
}

async function activities(profileId: string, orgId: string, userId: string) {
  return prisma.crmContactActivity.findMany({
    where: { orgId, profileId, actorClerkUserId: userId, providerMessageId: { not: null } },
    orderBy: { occurredAt: 'desc' },
    take: 30,
    select: { id: true, summary: true, occurredAt: true, externalUrl: true },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  try {
    const { contactId } = await params;
    const value = await context(contactId, ctx.orgId, ctx.userId);
    return NextResponse.json({
      configuration: gmailConfigurationStatus(),
      connection: value.connection,
      activities: await activities(value.profile.id, ctx.orgId, ctx.userId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gmail activity could not be loaded';
    return NextResponse.json({ error: message }, { status: message === 'Contact not found' ? 404 : 400 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  try {
    const { contactId } = await params;
    const value = await context(contactId, ctx.orgId, ctx.userId);
    const email = normalizeMailboxEmail(value.contact.email);
    if (!email) return NextResponse.json({ error: 'This contact does not have a valid email address.' }, { status: 422 });
    const { accessToken, connection } = await getGmailAccess(ctx.orgId, ctx.userId);
    const messages = await listGmailMessages(accessToken, `{from:${email} to:${email}} newer_than:2y`, 30);
    for (const message of messages) {
      const fromContact = normalizeMailboxEmail(message.from) === email;
      const externalUrl = message.externalUrl.replace('/mail/u/0/', `/mail/u/${encodeURIComponent(connection.mailboxEmail)}/`);
      await prisma.crmContactActivity.upsert({
        where: { orgId_actorClerkUserId_providerMessageId: { orgId: ctx.orgId, actorClerkUserId: ctx.userId, providerMessageId: message.id } },
        create: {
          orgId: ctx.orgId,
          profileId: value.profile.id,
          actorClerkUserId: ctx.userId,
          providerMessageId: message.id,
          kind: 'gmail_message',
          channel: 'EMAIL',
          summary: `Email ${fromContact ? 'from' : 'to'} ${value.contact.name}: ${message.subject}`,
          occurredAt: new Date(message.occurredAt),
          externalUrl,
        },
        update: {
          profileId: value.profile.id,
          summary: `Email ${fromContact ? 'from' : 'to'} ${value.contact.name}: ${message.subject}`,
          occurredAt: new Date(message.occurredAt),
          externalUrl,
        },
      });
    }
    await Promise.all([
      prisma.gmailConnection.update({ where: { id: connection.id }, data: { status: IntegrationSyncStatus.SUCCESS, lastSyncedAt: new Date(), lastError: null } }),
      messages[0] ? prisma.crmContactProfile.update({ where: { id: value.profile.id }, data: { lastSeenAt: new Date(messages[0].occurredAt) } }) : Promise.resolve(),
    ]);
    return NextResponse.json({ activities: await activities(value.profile.id, ctx.orgId, ctx.userId), syncedCount: messages.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gmail activity could not be refreshed';
    return NextResponse.json({ error: message }, { status: error instanceof GmailNotConnectedError ? 409 : 502 });
  }
}
