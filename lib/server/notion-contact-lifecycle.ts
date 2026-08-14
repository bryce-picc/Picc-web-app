import 'server-only';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';

type NotionPage = { id: string; in_trash?: boolean; parent?: { type?: string; data_source_id?: string }; properties?: Record<string, unknown> };

function requiredApiKey() {
  const value = process.env.NOTION_API_KEY?.trim();
  if (!value) throw new Error('NOTION_API_KEY is required');
  return value;
}

function requiredContactsDatabaseId() {
  const value = process.env.NOTION_CONTACTS_DATABASE_ID?.trim();
  if (!value) throw new Error('NOTION_CONTACTS_DATABASE_ID is required');
  return value;
}

async function notionRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requiredApiKey()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as T & { code?: string };
  if (!response.ok) throw new Error(`Notion request failed (${response.status}:${payload.code || 'unknown_error'})`);
  return payload;
}

function normalizeId(value: string) {
  return value.replace(/-/g, '').trim().toLowerCase();
}

async function loadVerifiedContactPage(contactPageId: string) {
  const [database, page] = await Promise.all([
    notionRequest<{ data_sources?: Array<{ id?: string }> }>(`/databases/${requiredContactsDatabaseId()}`),
    notionRequest<NotionPage>(`/pages/${contactPageId}`),
  ]);
  const sourceId = database.data_sources?.find((source) => source.id)?.id;
  if (
    !sourceId ||
    page.in_trash ||
    page.parent?.type !== 'data_source_id' ||
    normalizeId(page.parent.data_source_id ?? '') !== normalizeId(sourceId)
  ) {
    throw new Error('Contact not found');
  }
  return page;
}

function relationIds(value: unknown) {
  const relation = (value as { relation?: Array<{ id?: string }> } | undefined)?.relation;
  return (relation ?? []).flatMap((item) => item.id ? [item.id] : []);
}

function richText(value: unknown) {
  const property = value as { rich_text?: unknown[] } | undefined;
  return property?.rich_text?.length ? property.rich_text : null;
}

function scalar(value: unknown, key: 'email' | 'phone_number') {
  const result = (value as Record<string, unknown> | undefined)?.[key];
  return typeof result === 'string' && result.trim() ? result : null;
}

export async function trashNotionContact(contactPageId: string) {
  await loadVerifiedContactPage(contactPageId);
  await notionRequest(`/pages/${contactPageId}`, { method: 'PATCH', body: JSON.stringify({ in_trash: true }) });
}

export async function mergeNotionContacts(sourcePageId: string, targetPageId: string) {
  const [source, target] = await Promise.all([
    loadVerifiedContactPage(sourcePageId),
    loadVerifiedContactPage(targetPageId),
  ]);

  const sourceProps = source.properties ?? {};
  const targetProps = target.properties ?? {};
  const accountIds = [...new Map(
    [...relationIds(targetProps.Dispensary), ...relationIds(sourceProps.Dispensary)].map((id) => [normalizeId(id), id]),
  ).values()];
  const properties: Record<string, unknown> = { Dispensary: { relation: accountIds.map((id) => ({ id })) } };
  if (!scalar(targetProps.Email, 'email') && scalar(sourceProps.Email, 'email')) properties.Email = { email: scalar(sourceProps.Email, 'email') };
  if (!scalar(targetProps['Phone Number'], 'phone_number') && scalar(sourceProps['Phone Number'], 'phone_number')) properties['Phone Number'] = { phone_number: scalar(sourceProps['Phone Number'], 'phone_number') };
  if (!richText(targetProps['Contact Position']) && richText(sourceProps['Contact Position'])) properties['Contact Position'] = { rich_text: richText(sourceProps['Contact Position']) };

  await notionRequest(`/pages/${targetPageId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });

  for (const accountId of accountIds) {
    const account = await notionRequest<NotionPage>(`/pages/${accountId}`);
    const current = relationIds(account.properties?.['Associated Contacts']);
    const next = [...new Map(
      current
        .filter((id) => normalizeId(id) !== normalizeId(sourcePageId))
        .concat(targetPageId)
        .map((id) => [normalizeId(id), id]),
    ).values()];
    await notionRequest(`/pages/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: { 'Associated Contacts': { relation: next.map((id) => ({ id })) } } }),
    });
  }

  await trashNotionContact(sourcePageId);
}
