import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contactId = '22222222222242228222222222222222';

function request(action: string) {
  return new Request(`http://localhost/api/contacts/${contactId}/lifecycle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

describe('contact lifecycle route permissions', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it('allows a rep to archive but rejects destructive contact maintenance', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'profile' });
    const trashNotionContact = vi.fn();
    vi.doMock('@/lib/auth/api-guard', () => ({
      guard: vi.fn().mockResolvedValue({ orgId: 'org', userId: 'rep', role: 'SALES_REP' }),
    }));
    vi.doMock('@/lib/db/prisma', () => ({
      prisma: { crmContactProfile: { upsert }, crmContactReminder: {}, crmContactActivity: {} },
    }));
    vi.doMock('@/lib/server/notion-contact-lifecycle', () => ({
      mergeNotionContacts: vi.fn(),
      trashNotionContact,
    }));
    vi.doMock('@/lib/server/notion-live-crm', () => ({ refreshLiveNotionContactsCache: vi.fn() }));
    const { POST } = await import('@/app/api/contacts/[contactId]/lifecycle/route');

    const archived = await POST(request('archive'), { params: Promise.resolve({ contactId }) });
    const deleted = await POST(request('delete'), { params: Promise.resolve({ contactId }) });

    expect(archived?.status).toBe(200);
    expect(deleted?.status).toBe(403);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(trashNotionContact).not.toHaveBeenCalled();
  });
});
