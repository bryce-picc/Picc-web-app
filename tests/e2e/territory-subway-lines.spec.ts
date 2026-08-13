import { expect, test, type Page } from '@playwright/test';

const preferenceKey = 'picc:territory:subway-lines';

async function mockTerritory(page: Page) {
  await page.route('**/api/territory/stores**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stores: [
          {
            id: 'one',
            notionPageId: 'one',
            name: 'Downtown One',
            status: 'Lead - Hot',
            statusKey: 'lead-hot',
            statusColor: 'red',
            pinKind: 'lead',
            repNames: [],
            repEmails: [],
            lat: 40.7128,
            lng: -74.006,
            locationLabel: 'New York',
            locationAddress: 'New York, NY',
            locationSource: 'google-address-cache',
            locationPrecision: 'address',
            isApproximate: false,
            lastEditedTime: '2026-08-12T00:00:00.000Z',
            city: 'New York',
            state: 'NY',
            referralSource: null,
          },
          {
            id: 'two',
            notionPageId: 'two',
            name: 'Brooklyn Two',
            status: 'Lead - Hot',
            statusKey: 'lead-hot',
            statusColor: 'red',
            pinKind: 'lead',
            repNames: [],
            repEmails: [],
            lat: 40.6943,
            lng: -73.9918,
            locationLabel: 'Brooklyn',
            locationAddress: 'Brooklyn, NY',
            locationSource: 'google-address-cache',
            locationPrecision: 'address',
            isApproximate: false,
            lastEditedTime: '2026-08-12T00:00:00.000Z',
            city: 'Brooklyn',
            state: 'NY',
            referralSource: null,
          },
        ],
        filters: {
          statuses: [],
          reps: [],
          pppStatuses: [],
          headsetConnectionStatuses: [],
          preferredPartners: [],
          referralSources: [],
          locationAvailability: [],
          vendorDayStatuses: [],
        },
        meta: {
          dataSource: 'notion-live-cache',
          lastEditedMax: null,
          recordsRead: 2,
          unresolvedLocationCount: 0,
          geocodedThisRequest: 0,
          syncedAt: null,
          stale: false,
          syncing: false,
          syncError: null,
        },
      }),
    }),
  );
  await page.route('**/api/territory/boundaries', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ boundaries: [] }) }),
  );
  await page.route('**/api/territory/markers', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ markers: [] }) }),
  );
  await page.route('**/api/territory/saved-routes', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ routes: [] }) }),
  );
}

test.beforeEach(async ({ page }) => {
  await mockTerritory(page);
  await page.addInitScript((key) => {
    if (sessionStorage.getItem('picc-subway-test-ready')) return;
    localStorage.removeItem(key);
    sessionStorage.setItem('picc-subway-test-ready', 'true');
  }, preferenceKey);
});

test('toggles subway lines and remembers the device preference', async ({ page }) => {
  await page.goto('/territory');
  const toggle = page.getByRole('button', { name: 'Show subway lines' });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  const enabled = page.getByRole('button', { name: 'Hide subway lines' });
  await expect(enabled).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), preferenceKey)).toBe('true');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Hide subway lines' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Hide subway lines' }).click();
  await expect(page.getByRole('button', { name: 'Show subway lines' })).toHaveAttribute('aria-pressed', 'false');
});

test('keeps subway context enabled while route visualization changes', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'picc_route_plan_v1',
      JSON.stringify({
        selectedStopIds: ['one', 'two'],
        orderedStopIds: ['one', 'two'],
        savedRoutes: [],
        optimizedRoute: null,
        updatedAt: new Date().toISOString(),
      }),
    ),
  );
  await page.goto('/territory');
  await page.getByRole('button', { name: 'Show subway lines' }).click();
  await page.getByRole('button', { name: 'Visualize Route' }).click();
  await expect(page.getByRole('button', { name: 'Hide subway lines' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Hide Route' })).toBeVisible();
});

test('keeps the subway control reachable on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/territory');
  await page.getByRole('button', { name: 'Show subway lines' }).click();

  const toggle = page.getByRole('button', { name: 'Hide subway lines' });
  const box = await toggle.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThan(768);
  await expect(page.getByRole('button', { name: 'Search dispensaries on the map' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open territory layers' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open filters' })).toBeVisible();
});

test('places subway directly underneath filters', async ({ page }) => {
  await page.goto('/territory');
  const filtersBox = await page.getByRole('button', { name: 'Open filters' }).boundingBox();
  const subwayBox = await page.getByRole('button', { name: 'Show subway lines' }).boundingBox();
  expect(filtersBox).not.toBeNull();
  expect(subwayBox).not.toBeNull();
  expect(subwayBox!.y).toBeGreaterThan(filtersBox!.y + filtersBox!.height);
  expect(Math.abs(subwayBox!.x + subwayBox!.width / 2 - (filtersBox!.x + filtersBox!.width / 2))).toBeLessThan(1);
});
