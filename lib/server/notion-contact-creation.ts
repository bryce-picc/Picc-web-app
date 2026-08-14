import 'server-only';

import type {
  ContactCreationAdapter,
  ContactRecord,
  CreateContactInput,
} from '@/lib/server/contact-creation';
import { normalizeContactName } from '@/lib/server/contact-creation';
import { CONTACT_ROLE_OPTIONS, type ContactRole } from '@/lib/contacts/contact-profile';
import { refreshLiveNotionContactsCache } from '@/lib/server/notion-live-crm';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';
const MAX_ATTEMPTS = 3;

type NotionPage = {
  id: string;
  in_trash?: boolean;
  parent?: { type?: string; data_source_id?: string };
  properties?: Record<string, unknown>;
};

type RelationProperty = {
  type?: string;
  relation?: Array<{ id?: string }>;
};

type TextProperty = {
  type?: string;
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  email?: string | null;
  phone_number?: string | null;
};

function requiredEnv(name: 'NOTION_API_KEY' | 'NOTION_CONTACTS_DATABASE_ID' | 'NOTION_MASTER_LIST_DATABASE_ID') {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normalizeId(value: string | undefined) {
  return (value ?? '').replace(/-/g, '').toLowerCase();
}

function relationIds(property: unknown) {
  const relation = property as RelationProperty | undefined;
  return (relation?.relation ?? []).flatMap((item) => (item.id ? [item.id] : []));
}

function plainText(items: Array<{ plain_text?: string }> | undefined) {
  return (items ?? []).map((item) => item.plain_text ?? '').join('').trim();
}

function mapContact(page: NotionPage): ContactRecord {
  if (!page.id || page.in_trash) throw new Error('Contact not found');
  const properties = page.properties ?? {};
  const name = properties['Contact Name'] as TextProperty | undefined;
  const position = properties['Contact Position'] as TextProperty | undefined;
  const email = properties.Email as TextProperty | undefined;
  const phone = properties['Phone Number'] as TextProperty | undefined;

  return {
    id: page.id,
    name: plainText(name?.title),
    position: plainText(position?.rich_text),
    email: email?.email?.trim() || null,
    phone: phone?.phone_number?.trim() || null,
  };
}

async function delay(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function notionRequest<T>(path: string, init?: RequestInit, attempt = 1): Promise<T> {
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requiredEnv('NOTION_API_KEY')}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) ? Math.max(0, retryAfter * 1_000) : attempt * 500;
    await delay(waitMs);
    return notionRequest<T>(path, init, attempt + 1);
  }

  const payload = (await response.json().catch(() => ({}))) as T & { code?: string };
  if (!response.ok) {
    const code = typeof payload?.code === 'string' ? payload.code : 'unknown_error';
    throw new Error(`Notion request failed (${response.status}:${code})`);
  }
  return payload;
}

export function createNotionContactCreationAdapter(): ContactCreationAdapter {
  const dataSourceCache = new Map<string, Promise<string>>();

  function resolveDataSource(databaseId: string) {
    let pending = dataSourceCache.get(databaseId);
    if (!pending) {
      pending = notionRequest<{ data_sources?: Array<{ id?: string }> }>(`/databases/${databaseId}`).then(
        (database) => {
          const id = database.data_sources?.find((item) => item.id)?.id;
          if (!id) throw new Error('Notion data source is unavailable');
          return id;
        },
      );
      dataSourceCache.set(databaseId, pending);
    }
    return pending;
  }

  async function getAccount(accountPageId: string) {
    return notionRequest<NotionPage>(`/pages/${accountPageId}`);
  }

  const rolePropertyByValue = new Map(CONTACT_ROLE_OPTIONS.map((role) => [role.value, role.notionProperty]));

  return {
    async requireAccount(accountPageId) {
      const expectedSource = await resolveDataSource(requiredEnv('NOTION_MASTER_LIST_DATABASE_ID'));
      const page = await getAccount(accountPageId);
      if (
        page.in_trash ||
        page.parent?.type !== 'data_source_id' ||
        normalizeId(page.parent.data_source_id) !== normalizeId(expectedSource)
      ) {
        throw new Error('Contact account not found');
      }
    },

    async findContact(accountPageId, normalizedName) {
      const sourceId = await resolveDataSource(requiredEnv('NOTION_CONTACTS_DATABASE_ID'));
      let cursor: string | undefined;

      do {
        const response = await notionRequest<{
          results?: NotionPage[];
          has_more?: boolean;
          next_cursor?: string | null;
        }>(`/data_sources/${sourceId}/query`, {
          method: 'POST',
          body: JSON.stringify({
            page_size: 100,
            filter: { property: 'Dispensary', relation: { contains: accountPageId } },
            ...(cursor ? { start_cursor: cursor } : {}),
          }),
        });

        for (const page of response.results ?? []) {
          const accountIds = relationIds(page.properties?.Dispensary);
          const belongsToAccount = accountIds.some(
            (candidate) => normalizeId(candidate) === normalizeId(accountPageId),
          );
          if (!belongsToAccount) continue;
          const contact = mapContact(page);
          if (normalizeContactName(contact.name) === normalizedName) return contact;
        }

        cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
      } while (cursor);

      return null;
    },

    async getContact(contactPageId) {
      return mapContact(await notionRequest<NotionPage>(`/pages/${contactPageId}`));
    },

    async createContact(input: CreateContactInput) {
      const sourceId = await resolveDataSource(requiredEnv('NOTION_CONTACTS_DATABASE_ID'));
      const properties: Record<string, unknown> = {
        'Contact Name': { title: [{ text: { content: input.name } }] },
        'Contact Position': { rich_text: [{ text: { content: input.position } }] },
        Dispensary: { relation: [{ id: input.accountPageId }] },
        'Where Contact Info Came From': { multi_select: [{ name: 'CRM Contact' }] },
      };
      if (input.email) properties.Email = { email: input.email };
      if (input.phone) properties['Phone Number'] = { phone_number: input.phone };

      const page = await notionRequest<NotionPage>('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { type: 'data_source_id', data_source_id: sourceId },
          properties,
        }),
      });
      return mapContact(page);
    },

    async ensureAccountContact(accountPageId, contactPageId) {
      const account = await getAccount(accountPageId);
      const existing = relationIds(account.properties?.['Associated Contacts']);
      if (existing.some((id) => normalizeId(id) === normalizeId(contactPageId))) return;

      await notionRequest(`/pages/${accountPageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          properties: {
            'Associated Contacts': {
              relation: [...existing.map((id) => ({ id })), { id: contactPageId }],
            },
          },
        }),
      });
    },

    async getRoleAssignments(accountPageId, roles) {
      const account = await getAccount(accountPageId);
      const idsByRole = new Map<ContactRole, string[]>();
      const allIds = new Set<string>();
      for (const role of roles) {
        const propertyName = rolePropertyByValue.get(role);
        const ids = propertyName ? relationIds(account.properties?.[propertyName]) : [];
        idsByRole.set(role, ids);
        ids.forEach((id) => allIds.add(id));
      }

      const contacts = await Promise.all(
        [...allIds].map(async (id) => {
          const contact = mapContact(await notionRequest<NotionPage>(`/pages/${id}`));
          return [normalizeId(id), { id: contact.id, name: contact.name }] as const;
        }),
      );
      const contactById = new Map(contacts);

      return Object.fromEntries(
        [...idsByRole].map(([role, ids]) => [
          role,
          ids.flatMap((id) => {
            const contact = contactById.get(normalizeId(id));
            return contact ? [contact] : [];
          }),
        ]),
      );
    },

    async assignRoles(accountPageId, contactPageId, roles) {
      if (roles.length === 0) return;
      const properties = Object.fromEntries(
        roles.map((role) => {
          const propertyName = rolePropertyByValue.get(role);
          if (!propertyName) throw new Error('Unsupported contact role');
          return [propertyName, { relation: [{ id: contactPageId }] }];
        }),
      );
      await notionRequest(`/pages/${accountPageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      });
    },

    async verifyBothSides(accountPageId, contactPageId) {
      const [contact, account] = await Promise.all([
        notionRequest<NotionPage>(`/pages/${contactPageId}`),
        getAccount(accountPageId),
      ]);
      const contactHasAccount = relationIds(contact.properties?.Dispensary).some(
        (id) => normalizeId(id) === normalizeId(accountPageId),
      );
      const accountHasContact = relationIds(account.properties?.['Associated Contacts']).some(
        (id) => normalizeId(id) === normalizeId(contactPageId),
      );
      return contactHasAccount && accountHasContact;
    },

    async refreshContacts() {
      await refreshLiveNotionContactsCache();
    },
  };
}
