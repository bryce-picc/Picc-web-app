import { describe, expect, it } from 'vitest';
import { buildNabisIdentityResolutionActions } from '@/lib/server/nabis-identity-conflict-admin';

describe('buildNabisIdentityResolutionActions', () => {
  const conflict = {
    incomingAccountId: 'incoming-account',
    currentOwnerAccountId: 'current-owner',
    candidatePageId: '01234567-89ab-cdef-0123-456789abcdef',
    sourceIdentifiers: {
      licensedLocationId: 'loc-1',
      nabisRetailerId: 'retailer-1',
      licenseNumber: 'ocm-123',
    },
  };

  it('keeps the existing owner and maps source identifiers to it', () => {
    expect(buildNabisIdentityResolutionActions(conflict, 'KEEP_CURRENT_OWNER')).toMatchObject({
      targetAccountId: 'current-owner',
      clearOwnerAccountId: null,
      linkCandidatePageToTarget: false,
    });
  });

  it('transfers the page and identifiers to the incoming account', () => {
    expect(buildNabisIdentityResolutionActions(conflict, 'TRANSFER_TO_INCOMING')).toMatchObject({
      targetAccountId: 'incoming-account',
      clearOwnerAccountId: 'current-owner',
      linkCandidatePageToTarget: true,
    });
  });

  it('rejects keeping an owner when no current owner exists', () => {
    expect(() =>
      buildNabisIdentityResolutionActions({ ...conflict, currentOwnerAccountId: null }, 'KEEP_CURRENT_OWNER'),
    ).toThrow('No current owner');
  });
});
