import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contactId = '22222222222242228222222222222222';

function request(action: string, body: Record<string, unknown> = {}) {
  return new Request(`http://localhost/api/contacts/${contactId}/lifecycle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
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
    vi.doMock('@/lib/server/notion-live-crm', () => ({ refreshLiveNotionContactsCache: vi.fn().mockResolvedValue(undefined) }));
    const { POST } = await import('@/app/api/contacts/[contactId]/lifecycle/route');

    const archived = await POST(request('archive'), { params: Promise.resolve({ contactId }) });
    const deleted = await POST(request('delete'), { params: Promise.resolve({ contactId }) });

    expect(archived?.status).toBe(200);
    expect(deleted?.status).toBe(403);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(trashNotionContact).not.toHaveBeenCalled();
  });

  it('stages an idempotent local merge, preserves metadata, then finalizes after Notion succeeds', async () => {
    const sourceProfile = {
      id: 'source-profile', favorite: true, frequencyDays: 21,
      lastSeenAt: new Date('2026-08-14T18:00:00.000Z'), instagramUrl: 'https://instagram.com/source', linkedinUrl: null,
      mergedIntoPageId: null,
    };
    const targetProfile = {
      id: 'target-profile', favorite: false, frequencyDays: 30,
      lastSeenAt: new Date('2026-08-13T18:00:00.000Z'), instagramUrl: null, linkedinUrl: 'https://linkedin.com/in/target',
      mergedIntoPageId: null,
    };
    const update = vi.fn().mockResolvedValue({});
    const upsert = vi.fn()
      .mockResolvedValueOnce(sourceProfile)
      .mockResolvedValueOnce(targetProfile)
      .mockResolvedValueOnce({ ...sourceProfile, mergedIntoPageId: '33333333333343338333333333333333' })
      .mockResolvedValueOnce(targetProfile);
    const transaction = vi.fn().mockResolvedValue([]);
    const mergeNotionContacts = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@/lib/auth/api-guard', () => ({
      guard: vi.fn().mockResolvedValue({ orgId: 'org', userId: 'admin', role: 'ADMIN' }),
    }));
    vi.doMock('@/lib/db/prisma', () => ({
      prisma: {
        crmContactProfile: { upsert, update },
        crmContactReminder: { updateMany: vi.fn().mockReturnValue({ operation: 'reminders' }) },
        crmContactActivity: { updateMany: vi.fn().mockReturnValue({ operation: 'activities' }) },
        $transaction: transaction,
      },
    }));
    vi.doMock('@/lib/server/notion-contact-lifecycle', () => ({ mergeNotionContacts, trashNotionContact: vi.fn() }));
    vi.doMock('@/lib/server/notion-live-crm', () => ({ refreshLiveNotionContactsCache: vi.fn().mockResolvedValue(undefined) }));
    const { POST } = await import('@/app/api/contacts/[contactId]/lifecycle/route');
    const targetId = '33333333333343338333333333333333';

    const response = await POST(request('merge', { sourceId: contactId, targetId }), { params: Promise.resolve({ contactId }) });

    expect(response?.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'target-profile' },
      data: expect.objectContaining({ favorite: true, frequencyDays: 30, instagramUrl: 'https://instagram.com/source', archivedAt: null }),
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'source-profile' },
      data: { mergedIntoPageId: targetId },
    }));
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(mergeNotionContacts).toHaveBeenCalledWith(contactId, targetId, { allowAlreadyTrashed: false });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'source-profile' },
      data: { archivedAt: expect.any(Date), mergedIntoPageId: targetId },
    }));

    const retry = await POST(request('merge', { sourceId: contactId, targetId }), { params: Promise.resolve({ contactId }) });
    expect(retry?.status).toBe(200);
    expect(mergeNotionContacts).toHaveBeenLastCalledWith(contactId, targetId, { allowAlreadyTrashed: true });
  });
});
