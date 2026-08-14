import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateContactInput } from '@/lib/server/contact-creation';
import { createNotionContactCreationAdapter } from '@/lib/server/notion-contact-creation';

const originalEnv = process.env;

function jsonResponse(payload: unknown, status = 200, headers?: HeadersInit) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
    }),
  );
}

function createInput(): CreateContactInput {
  return {
    accountPageId: '11111111-1111-4111-8111-111111111111',
    name: 'Maya Chen',
    position: 'Buyer',
    email: 'maya@example.com',
    phone: '212-555-0187',
  };
}

function contactPage(id: string, accountId = createInput().accountPageId) {
  return {
    object: 'page',
    id,
    in_trash: false,
    parent: { type: 'data_source_id', data_source_id: 'contacts-source' },
    properties: {
      'Contact Name': { type: 'title', title: [{ plain_text: 'Maya Chen' }] },
      'Contact Position': { type: 'rich_text', rich_text: [{ plain_text: 'Buyer' }] },
      Email: { type: 'email', email: 'maya@example.com' },
      'Phone Number': { type: 'phone_number', phone_number: '212-555-0187' },
      Dispensary: { type: 'relation', relation: [{ id: accountId }] },
    },
  };
}

describe('Notion contact creation adapter', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NOTION_API_KEY: 'test-notion-key',
      NOTION_CONTACTS_DATABASE_ID: 'contacts-db',
      NOTION_MASTER_LIST_DATABASE_ID: 'accounts-db',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('resolves the contacts data source and paginates account-scoped contacts', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ data_sources: [{ id: 'contacts-source' }] }))
      .mockImplementationOnce(() =>
        jsonResponse({
          results: [contactPage('nonmatching-contact', 'different-account')],
          has_more: true,
          next_cursor: 'opaque-next-cursor',
        }),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          results: [contactPage('matching-contact')],
          has_more: false,
          next_cursor: null,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    const result = await adapter.findContact(createInput().accountPageId, 'maya chen');

    expect(result?.id).toBe('matching-contact');
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://api.notion.com/v1/databases/contacts-db',
      'https://api.notion.com/v1/data_sources/contacts-source/query',
      'https://api.notion.com/v1/data_sources/contacts-source/query',
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      start_cursor: 'opaque-next-cursor',
    });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      'Notion-Version': '2026-03-11',
    });
  });

  it('creates a page beneath the resolved contacts data source with supported fields', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ data_sources: [{ id: 'contacts-source' }] }))
      .mockImplementationOnce(() => jsonResponse(contactPage('created-contact')));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    const result = await adapter.createContact(createInput());

    expect(result.id).toBe('created-contact');
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body.parent).toEqual({ type: 'data_source_id', data_source_id: 'contacts-source' });
    expect(Object.keys(body.properties).sort()).toEqual(
      [
        'Contact Name',
        'Contact Position',
        'Dispensary',
        'Email',
        'Phone Number',
        'Where Contact Info Came From',
      ].sort(),
    );
  });

  it('appends the new contact without removing existing account contacts', async () => {
    const accountId = createInput().accountPageId;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        jsonResponse({
          id: accountId,
          in_trash: false,
          properties: {
            'Associated Contacts': {
              type: 'relation',
              relation: [{ id: 'contact-a' }, { id: 'contact-b' }],
            },
          },
        }),
      )
      .mockImplementationOnce(() => jsonResponse({ id: accountId }));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    await adapter.ensureAccountContact(accountId, 'contact-c');

    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body.properties['Associated Contacts'].relation).toEqual([
      { id: 'contact-a' },
      { id: 'contact-b' },
      { id: 'contact-c' },
    ]);
  });

  it('does not patch an account that already contains the contact', async () => {
    const accountId = createInput().accountPageId;
    const fetchMock = vi.fn().mockImplementationOnce(() =>
      jsonResponse({
        id: accountId,
        in_trash: false,
        properties: {
          'Associated Contacts': { type: 'relation', relation: [{ id: 'contact-c' }] },
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    await adapter.ensureAccountContact(accountId, 'contact-c');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads occupied CRM role slots and resolves the current contact names', async () => {
    const accountId = createInput().accountPageId;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({
        id: accountId,
        properties: {
          'Primary Contact': { type: 'relation', relation: [{ id: 'existing-contact' }] },
          'Billing Contact': { type: 'relation', relation: [] },
        },
      }))
      .mockImplementationOnce(() => jsonResponse(contactPage('existing-contact')));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    await expect(adapter.getRoleAssignments?.(accountId, ['PRIMARY_CONTACT', 'BILLING_CONTACT'])).resolves.toEqual({
      PRIMARY_CONTACT: [{ id: 'existing-contact', name: 'Maya Chen' }],
      BILLING_CONTACT: [],
    });
  });

  it('replaces only the explicitly selected CRM role slots', async () => {
    const accountId = createInput().accountPageId;
    const fetchMock = vi.fn().mockImplementationOnce(() => jsonResponse({ id: accountId }));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    await adapter.assignRoles?.(accountId, 'new-contact', ['PRIMARY_CONTACT', 'PPP_2']);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.properties).toEqual({
      'Primary Contact': { relation: [{ id: 'new-contact' }] },
      'PPP #2': { relation: [{ id: 'new-contact' }] },
    });
  });

  it('requires both contact and account pages to contain the relationship', async () => {
    const accountId = createInput().accountPageId;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(contactPage('contact-page', accountId)))
      .mockImplementationOnce(() =>
        jsonResponse({
          id: accountId,
          properties: {
            'Associated Contacts': { type: 'relation', relation: [] },
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    await expect(adapter.verifyBothSides(accountId, 'contact-page')).resolves.toBe(false);
  });

  it('rejects an account outside the configured master data source', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ data_sources: [{ id: 'accounts-source' }] }))
      .mockImplementationOnce(() =>
        jsonResponse({
          id: createInput().accountPageId,
          in_trash: false,
          parent: { type: 'data_source_id', data_source_id: 'different-source' },
          properties: {},
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    await expect(adapter.requireAccount(createInput().accountPageId)).rejects.toThrow(
      'Contact account not found',
    );
  });

  it('retries rate-limited requests using Retry-After without exposing payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        jsonResponse({ code: 'rate_limited', message: 'slow down' }, 429, { 'retry-after': '0' }),
      )
      .mockImplementationOnce(() => jsonResponse({ data_sources: [{ id: 'accounts-source' }] }))
      .mockImplementationOnce(() =>
        jsonResponse({
          id: createInput().accountPageId,
          in_trash: false,
          parent: { type: 'data_source_id', data_source_id: 'accounts-source' },
          properties: {},
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createNotionContactCreationAdapter();

    await expect(adapter.requireAccount(createInput().accountPageId)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
