import { IntegrationSyncStatus } from '@prisma/client';
import { protectToken, revealToken } from '@/lib/gmail/gmail-domain';
import { prisma } from '@/lib/db/prisma';
import { refreshGmailAccessToken, type GmailTokenResponse } from '@/lib/server/gmail-provider';

export class GmailNotConnectedError extends Error {
  constructor() {
    super('Connect Gmail in Settings to load mailbox activity.');
  }
}

export function tokenExpiry(tokens: Pick<GmailTokenResponse, 'expires_in'>) {
  return new Date(Date.now() + Math.max(tokens.expires_in - 60, 60) * 1000);
}

export async function getGmailAccess(orgId: string, clerkUserId: string) {
  const connection = await prisma.gmailConnection.findUnique({
    where: { orgId_clerkUserId: { orgId, clerkUserId } },
  });
  if (!connection || !connection.encryptedRefreshToken) throw new GmailNotConnectedError();

  if (connection.encryptedAccessToken && connection.accessTokenExpiresAt && connection.accessTokenExpiresAt > new Date()) {
    return { accessToken: revealToken(connection.encryptedAccessToken), connection };
  }

  try {
    const refreshed = await refreshGmailAccessToken(revealToken(connection.encryptedRefreshToken));
    const updated = await prisma.gmailConnection.update({
      where: { id: connection.id },
      data: {
        encryptedAccessToken: protectToken(refreshed.access_token),
        accessTokenExpiresAt: tokenExpiry(refreshed),
        grantedScope: refreshed.scope || connection.grantedScope,
        status: IntegrationSyncStatus.SUCCESS,
        lastError: null,
      },
    });
    return { accessToken: refreshed.access_token, connection: updated };
  } catch (error) {
    await prisma.gmailConnection.update({
      where: { id: connection.id },
      data: { status: IntegrationSyncStatus.ERROR, lastError: error instanceof Error ? error.message.slice(0, 500) : 'Token refresh failed' },
    }).catch(() => undefined);
    throw error;
  }
}
