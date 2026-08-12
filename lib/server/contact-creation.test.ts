import { describe, expect, it, vi } from 'vitest';
import {
  createVerifiedContact,
  retryVerifiedContactLink,
  type ContactCreationAdapter,
  type ContactRecord,
  type CreateContactInput,
} from '@/lib/server/contact-creation';

function contact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    id: 'contact-page',
    name: 'Maya Chen',
    position: 'Buyer',
    email: 'maya@example.com',
    phone: '212-555-0187',
    ...overrides,
  };
}

function input(overrides: Partial<CreateContactInput> = {}): CreateContactInput {
  return {
    accountPageId: 'account-page',
    name: 'Maya Chen',
    position: 'Buyer',
    email: 'maya@example.com',
    phone: '212-555-0187',
    ...overrides,
  };
}

function fakeAdapter(options: {
  existing?: ContactRecord | null;
  verify?: boolean;
  ensureError?: Error;
} = {}) {
  const created = contact();
  const adapter = {
    requireAccount: vi.fn().mockResolvedValue(undefined),
    findContact: vi.fn().mockResolvedValue(options.existing ?? null),
    getContact: vi.fn().mockResolvedValue(created),
    createContact: vi.fn().mockResolvedValue(created),
    ensureAccountContact: options.ensureError
      ? vi.fn().mockRejectedValue(options.ensureError)
      : vi.fn().mockResolvedValue(undefined),
    verifyBothSides: vi.fn().mockResolvedValue(options.verify ?? true),
    refreshContacts: vi.fn().mockResolvedValue(undefined),
  } satisfies ContactCreationAdapter;

  return adapter;
}

describe('verified contact creation', () => {
  it('returns an existing verified contact for the same normalized name and account', async () => {
    const existing = contact({ name: 'Maya  Chen' });
    const adapter = fakeAdapter({ existing });

    const result = await createVerifiedContact(input({ name: '  MAYA chen  ' }), adapter);

    expect(result).toEqual({
      status: 'existing_verified',
      contact: existing,
      accountPageId: 'account-page',
    });
    expect(adapter.findContact).toHaveBeenCalledWith('account-page', 'maya chen');
    expect(adapter.createContact).not.toHaveBeenCalled();
    expect(adapter.ensureAccountContact).toHaveBeenCalledWith('account-page', 'contact-page');
    expect(adapter.refreshContacts).toHaveBeenCalledTimes(1);
  });

  it('creates and verifies a contact when the account has no normalized-name match', async () => {
    const adapter = fakeAdapter({ existing: null });

    const result = await createVerifiedContact(input(), adapter);

    expect(result.status).toBe('created_verified');
    expect(adapter.requireAccount).toHaveBeenCalledWith('account-page');
    expect(adapter.createContact).toHaveBeenCalledWith(input());
    expect(adapter.ensureAccountContact).toHaveBeenCalledWith('account-page', 'contact-page');
    expect(adapter.verifyBothSides).toHaveBeenCalledWith('account-page', 'contact-page');
    expect(adapter.refreshContacts).toHaveBeenCalledTimes(1);
  });

  it('allows the same normalized name at a different account', async () => {
    const adapter = fakeAdapter({ existing: null });

    const result = await createVerifiedContact(input({ accountPageId: 'second-account' }), adapter);

    expect(result.status).toBe('created_verified');
    expect(adapter.findContact).toHaveBeenCalledWith('second-account', 'maya chen');
    expect(adapter.createContact).toHaveBeenCalledTimes(1);
  });

  it('returns partial_relation when a created contact cannot be verified', async () => {
    const adapter = fakeAdapter({ existing: null, verify: false });

    const result = await createVerifiedContact(input(), adapter);

    expect(result).toEqual({
      status: 'partial_relation',
      contact: contact(),
      accountPageId: 'account-page',
      retry: {
        accountPageId: 'account-page',
        contactPageId: 'contact-page',
      },
    });
    expect(adapter.refreshContacts).not.toHaveBeenCalled();
  });

  it('returns partial_relation when relation append fails after contact creation', async () => {
    const adapter = fakeAdapter({ existing: null, ensureError: new Error('temporary integration failure') });

    const result = await createVerifiedContact(input(), adapter);

    expect(result.status).toBe('partial_relation');
    expect(adapter.createContact).toHaveBeenCalledTimes(1);
    expect(adapter.refreshContacts).not.toHaveBeenCalled();
  });

  it('retries relationship repair without creating another contact', async () => {
    const adapter = fakeAdapter({ verify: true });

    const result = await retryVerifiedContactLink(
      { accountPageId: 'account-page', contactPageId: 'contact-page' },
      adapter,
    );

    expect(result.status).toBe('existing_verified');
    expect(adapter.requireAccount).toHaveBeenCalledWith('account-page');
    expect(adapter.getContact).toHaveBeenCalledWith('contact-page');
    expect(adapter.createContact).not.toHaveBeenCalled();
    expect(adapter.ensureAccountContact).toHaveBeenCalledTimes(1);
    expect(adapter.refreshContacts).toHaveBeenCalledTimes(1);
  });
});
