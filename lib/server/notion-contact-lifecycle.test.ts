import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeNotionContacts, trashNotionContact } from '@/lib/server/notion-contact-lifecycle';

function response(payload: unknown) {
  return Promise.resolve(Response.json(payload));
}

describe('Notion contact lifecycle', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NOTION_API_KEY: 'test-key', NOTION_CONTACTS_DATABASE_ID: 'contacts-db' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('moves a deleted contact to Notion trash', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/databases/contacts-db')) return response({ data_sources: [{ id: 'contacts-source' }] });
      if (init?.method === 'PATCH') return response({ id: 'source', in_trash: true });
      return response({ id: 'source', in_trash: false, parent: { type: 'data_source_id', data_source_id: 'contacts-source' }, properties: {} });
    });
    vi.stubGlobal('fetch', fetchMock);

    await trashNotionContact('source');

    const patchCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/pages/source') && init?.method === 'PATCH');
    expect(patchCall).toBeDefined();
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({ in_trash: true });
  });

  it('moves missing details and account relationships to the kept contact before trashing the duplicate', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/databases/contacts-db')) return response({ data_sources: [{ id: 'contacts-source' }] });
      if (url.endsWith('/pages/source') && !init?.method) return response({
        id: 'source', in_trash: false, parent: { type: 'data_source_id', data_source_id: 'contacts-source' },
        properties: { Dispensary: { relation: [{ id: 'account-a' }] }, Email: { email: 'source@example.com' }, 'Phone Number': { phone_number: '+12125550100' }, 'Contact Position': { rich_text: [{ text: { content: 'Buyer' } }] } },
      });
      if (url.endsWith('/pages/target') && !init?.method) return response({
        id: 'target', in_trash: false, parent: { type: 'data_source_id', data_source_id: 'contacts-source' },
        properties: { Dispensary: { relation: [{ id: 'account-b' }] }, Email: { email: null }, 'Phone Number': { phone_number: '+12125550200' }, 'Contact Position': { rich_text: [] } },
      });
      if (url.endsWith('/pages/account-a') && !init?.method) return response({ id: 'account-a', properties: { 'Associated Contacts': { relation: [{ id: 'source' }, { id: 'other' }] } } });
      if (url.endsWith('/pages/account-b') && !init?.method) return response({ id: 'account-b', properties: { 'Associated Contacts': { relation: [{ id: 'target' }] } } });
      return response({ id: String(url).split('/').at(-1) });
    });
    vi.stubGlobal('fetch', fetchMock);

    await mergeNotionContacts('source', 'target');

    const targetPatchCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/pages/target') && init?.method === 'PATCH');
    const targetPatch = JSON.parse(String(targetPatchCall?.[1]?.body));
    expect(targetPatch.properties).toMatchObject({
      Dispensary: { relation: [{ id: 'account-b' }, { id: 'account-a' }] },
      Email: { email: 'source@example.com' },
      'Contact Position': { rich_text: [{ text: { content: 'Buyer' } }] },
    });
    expect(targetPatch.properties['Phone Number']).toBeUndefined();
    const accountPatchCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/pages/account-a') && init?.method === 'PATCH');
    const accountPatch = JSON.parse(String(accountPatchCall?.[1]?.body));
    expect(accountPatch.properties['Associated Contacts'].relation).toEqual([{ id: 'other' }, { id: 'target' }]);
    const sourceTrashCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/pages/source') && init?.method === 'PATCH');
    expect(JSON.parse(String(sourceTrashCall?.[1]?.body))).toEqual({ in_trash: true });
  });

  it('refuses to mutate a page outside the configured contacts database', async () => {
    const fetchMock = vi.fn((url: string) => url.endsWith('/databases/contacts-db')
      ? response({ data_sources: [{ id: 'contacts-source' }] })
      : response({ id: 'source', parent: { type: 'data_source_id', data_source_id: 'another-source' }, properties: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(trashNotionContact('source')).rejects.toThrow('Contact not found');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
