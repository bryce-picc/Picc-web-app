import { expect, test } from '@playwright/test';

const store = {
  id: 'store-1',
  notionPageId: 'account-page-1',
  name: 'Harbor House',
  status: 'Customer',
  statusKey: 'customer',
  statusColor: '#1f9d55',
  statusColorName: 'green',
  pinKind: 'customer',
  repNames: ['Mina Torres'],
  repEmails: ['mina@piccplatform.com'],
  lat: 40.7128,
  lng: -74.006,
  locationLabel: 'New York, NY',
  locationAddress: '88 Test Street, New York, NY',
  locationSource: 'notion-place',
  locationPrecision: 'exact',
  isApproximate: false,
  lastEditedTime: '2026-08-14T14:00:00.000Z',
  city: 'New York',
  state: 'NY',
  daysOverdue: 6,
  phoneNumber: '+12125550115',
  email: 'orders@harbor.example',
  referralSource: null,
  isPreferredPartner: true,
  followUpDate: null,
  followUpNeeded: true,
  followUpReason: null,
  notes: null,
  lastCheckIn: null,
};

function storesResponse() {
  return {
    stores: [store],
    filters: {
      statuses: [{ value: 'Customer', count: 1 }],
      reps: [{ value: 'Mina Torres', count: 1 }],
      pppStatuses: [],
      headsetConnectionStatuses: [],
      preferredPartners: [{ value: 'preferred', count: 1 }],
      referralSources: [],
      locationAvailability: [],
      vendorDayStatuses: [],
    },
    meta: {
      dataSource: 'notion-live-cache',
      lastEditedMax: store.lastEditedTime,
      recordsRead: 1,
      unresolvedLocationCount: 0,
      geocodedThisRequest: 0,
      syncedAt: '2026-08-14T14:10:00.000Z',
      stale: false,
      syncing: false,
      syncError: null,
    },
  };
}

function storeDetailResponse() {
  return {
    store,
    contacts: [
      {
        id: 'contact-page-1',
        name: 'Mara Vega',
        roleTitle: 'Buyer',
        email: 'mara@harbor.example',
        phone: '+1 (347) 555-0198',
        status: 'ACTIVE',
        linkedWork: 'Primary contact',
      },
    ],
    checkIns: [],
    vendorDays: { total: 0, upcomingCount: 0, recent: [] },
    crm: {
      contact: null,
      contactEmail: null,
      contactPhone: null,
      primaryContactName: 'Mara Vega',
      primaryContactBuyer: 'Mara Vega',
      primaryContactEmail: 'mara@harbor.example',
      primaryContactPhone: '+1 (347) 555-0198',
      rep: 'Mina Torres',
      accountManager: null,
      piccCreditStatus: null,
      accountStatus: 'Customer',
      lastOrderAmount: null,
      lastContacted: null,
      lastDeliveryDate: null,
      lastSampleOrderDate: null,
      lastOrderDate: null,
      referralSource: null,
      customerSince: null,
      pennyBundlePromoStatus: null,
      pppStatus: null,
      headsetConnectionStatus: null,
      productTracking: null,
      displayTracking: null,
    },
    analytics: { matchedAccountId: null, matchedBy: 'account', monthly: [], recentOrders: [], orders: [] },
    history: { accountUpdates: [] },
  };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/territory/stores?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(storesResponse()) });
  });
  await page.route('**/api/territory/stores/store-1', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(storeDetailResponse()) });
  });
});

test('accounts stay dense, keep the alphabet rail clear, and create a follow-up', async ({ page }) => {
  let followUpPayload: unknown;
  await page.route('**/api/territory/check-in', async (route) => {
    followUpPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, syncWarning: null }) });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/accounts');

  const accountCard = page.getByRole('button', { name: /Harbor House.*Customer.*Mina Torres/s });
  await expect(accountCard).toBeVisible();
  await expect(accountCard).not.toContainText('88 Test Street');
  await expect(accountCard).toContainText('6 days');
  await expect(accountCard).toContainText('Pay days avg.');
  await expect(accountCard).toContainText('Nabis rank');

  const rail = page.getByRole('navigation', { name: 'Jump to account letter' });
  const [cardBox, railBox] = await Promise.all([accountCard.boundingBox(), rail.boundingBox()]);
  expect(cardBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(railBox!.x);
  if (process.env.PICC_EVIDENCE_DIR) {
    await page.screenshot({ path: `${process.env.PICC_EVIDENCE_DIR}/accounts-mobile-contact-foundation.png`, fullPage: true });
  }

  await page.getByRole('button', { name: 'New follow-up' }).click();
  await page.getByPlaceholder('Search account or rep').fill('Harbor');
  await page.getByRole('button', { name: /Harbor House.*Mina Torres/s }).click();
  await page.getByRole('button', { name: 'Tomorrow' }).click();
  await page.getByPlaceholder('What needs to happen next?').fill('Review the next order');
  await page.getByRole('button', { name: 'Set follow-up' }).click();

  await expect(page.getByText('Follow-up set')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New follow-up' })).toBeHidden();
  expect(followUpPayload).toMatchObject({
    store: { id: 'store-1', notionPageId: 'account-page-1', name: 'Harbor House' },
    followUpNeeded: true,
    followUpReason: 'Review the next order',
  });
});

test('account details exposes direct actions and prompts for a follow-up after Gmail opens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/accounts');
  await page.getByRole('button', { name: /Harbor House.*Customer.*Mina Torres/s }).click();

  await expect(page.getByText('Associated Contacts')).toBeVisible();
  const email = page.getByRole('link', { name: 'Email Mara Vega' });
  const text = page.getByRole('link', { name: 'Text Mara Vega' });
  const call = page.getByRole('link', { name: 'Call Mara Vega' });
  await expect(email).toHaveAttribute('href', /https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=mara%40harbor\.example/);
  await expect(text).toHaveAttribute('href', 'sms:+13475550198');
  await expect(call).toHaveAttribute('href', 'tel:+13475550198');

  await page.evaluate(() => {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as Element | null;
        if (target?.closest('a[href^="https://mail.google.com/mail/"]')) event.preventDefault();
      },
      true,
    );
  });
  await email.click();

  await expect(page.getByRole('heading', { name: 'Set follow-up?' })).toBeVisible();
  await expect(page.getByText('Gmail opened for Mara Vega.')).toBeVisible();
  if (process.env.PICC_EVIDENCE_DIR) {
    await page.screenshot({ path: `${process.env.PICC_EVIDENCE_DIR}/account-contact-actions-follow-up.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByRole('heading', { name: 'Set follow-up?' })).toBeHidden();
});

test('add contact supports multiple CRM roles and requires explicit replacement of occupied slots', async ({ page }) => {
  const payloads: Array<Record<string, unknown>> = [];
  await page.route('**/api/contacts', async (route) => {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    payloads.push(payload);
    if (!payload.overwriteRoles) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'role_collision',
          contact: null,
          collisions: [{
            role: 'PRIMARY_CONTACT',
            label: 'Primary Contact',
            existingContacts: [{ id: 'existing-contact', name: 'Existing Buyer' }],
          }],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'created_verified',
        accountPageId: store.notionPageId,
        contact: { id: 'created-contact', name: 'Jordan Lee', position: 'Buyer', email: 'jordan@example.com', phone: null },
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/accounts');
  await page.getByRole('button', { name: 'Add contact' }).click();
  await page.getByRole('button', { name: /Harbor House.*New York, NY/s }).click();
  await page.getByLabel('Full name *').fill('Jordan Lee');
  await page.getByLabel('Role / position *').fill('Buyer');
  await page.getByLabel('Primary Contact').check();
  await page.getByLabel('Billing Contact').check();
  await page.getByRole('button', { name: 'Save contact' }).click();

  await expect(page.getByText('Primary Contact: Existing Buyer')).toBeVisible();
  await expect(page.getByText('Nothing has been overwritten yet.')).toBeVisible();
  await page.getByLabel('Billing Contact').uncheck();
  await expect(page.getByRole('button', { name: 'Replace and save' })).toBeHidden();
  await page.getByLabel('Billing Contact').check();
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(page.getByRole('button', { name: 'Replace and save' })).toBeVisible();
  await page.getByRole('button', { name: 'Replace and save' }).click();
  await expect(page.getByRole('dialog', { name: 'Add contact' }).getByText('Contact created and linked to the account in Notion.')).toBeVisible();
  expect(payloads).toHaveLength(3);
  expect(payloads[0]).toMatchObject({ roles: ['PRIMARY_CONTACT', 'BILLING_CONTACT'], overwriteRoles: false });
  expect(payloads[1]).toMatchObject({ roles: ['PRIMARY_CONTACT', 'BILLING_CONTACT'], overwriteRoles: false });
  expect(payloads[2]).toMatchObject({ roles: ['PRIMARY_CONTACT', 'BILLING_CONTACT'], overwriteRoles: true });
});
