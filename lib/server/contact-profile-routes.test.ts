import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contactId = '22222222222242228222222222222222';

function request(path: string, method: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function mocks() {
  const prisma = {
    crmContactProfile: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'profile-1', orgId: 'org', notionContactPageId: contactId }),
    },
    crmContactReminder: {
      create: vi.fn().mockResolvedValue({ id: 'reminder-1', status: 'OPEN' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    crmContactActivity: {
      create: vi.fn().mockResolvedValue({ id: 'activity-1' }),
    },
  };
  vi.doMock('@/lib/auth/api-guard', () => ({ guard: vi.fn().mockResolvedValue({ orgId: 'org', userId: 'user' }) }));
  vi.doMock('@/lib/db/prisma', () => ({ prisma }));
  return prisma;
}

describe('contact profile routes', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it('loads profile state only through the current tenant and Notion contact ID', async () => {
    const prisma = mocks();
    const { GET } = await import('@/app/api/contacts/[contactId]/profile/route');
    const response = await GET(request(`/api/contacts/${contactId}/profile`, 'GET'), { params: Promise.resolve({ contactId }) });

    expect(response?.status).toBe(200);
    expect(prisma.crmContactProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { orgId_notionContactPageId: { orgId: 'org', notionContactPageId: contactId } },
    }));
  });

  it('persists favorite, cadence, last seen, and supported social links in the tenant profile', async () => {
    const prisma = mocks();
    const { PATCH } = await import('@/app/api/contacts/[contactId]/profile/route');
    const response = await PATCH(request(`/api/contacts/${contactId}/profile`, 'PATCH', {
      favorite: true,
      frequencyDays: 30,
      lastSeenAt: '2026-08-14T16:00:00.000Z',
      instagramUrl: 'https://instagram.com/mara',
      linkedinUrl: 'https://linkedin.com/in/mara',
      archived: false,
    }), { params: Promise.resolve({ contactId }) });

    expect(response?.status).toBe(200);
    expect(prisma.crmContactProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { orgId_notionContactPageId: { orgId: 'org', notionContactPageId: contactId } },
      update: expect.objectContaining({ favorite: true, frequencyDays: 30 }),
    }));
  });

  it('updates only the supplied profile field so favorite changes cannot overwrite a newer interaction', async () => {
    const prisma = mocks();
    const { PATCH } = await import('@/app/api/contacts/[contactId]/profile/route');
    const response = await PATCH(request(`/api/contacts/${contactId}/profile`, 'PATCH', {
      favorite: true,
    }), { params: Promise.resolve({ contactId }) });

    expect(response?.status).toBe(200);
    expect(prisma.crmContactProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ favorite: true }),
      update: { favorite: true },
    }));
  });

  it('logs only the honest external-app launch and updates last seen', async () => {
    const prisma = mocks();
    const { POST } = await import('@/app/api/contacts/[contactId]/activity/route');
    const response = await POST(request(`/api/contacts/${contactId}/activity`, 'POST', { action: 'email' }), { params: Promise.resolve({ contactId }) });

    expect(response?.status).toBe(201);
    expect(prisma.crmContactActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ kind: 'external_app_opened', channel: 'EMAIL', summary: 'Opened Gmail compose' }),
    });
    expect(prisma.crmContactProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { lastSeenAt: expect.any(Date) } }));
  });

  it('updates a reminder only when the tenant and profile contact both match', async () => {
    const prisma = mocks();
    const { PATCH } = await import('@/app/api/contacts/[contactId]/reminders/[reminderId]/route');
    const response = await PATCH(request(`/api/contacts/${contactId}/reminders/reminder-1`, 'PATCH', { status: 'DONE' }), {
      params: Promise.resolve({ contactId, reminderId: 'reminder-1' }),
    });

    expect(response?.status).toBe(200);
    expect(prisma.crmContactReminder.updateMany).toHaveBeenCalledWith({
      where: { id: 'reminder-1', orgId: 'org', profile: { notionContactPageId: contactId } },
      data: { status: 'DONE' },
    });
  });
});
