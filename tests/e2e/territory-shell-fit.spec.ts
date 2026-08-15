import { expect, test, type Page } from '@playwright/test';

async function mockTerritory(page: Page) {
  await page.route('**/api/territory/stores**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stores: [],
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
          recordsRead: 0,
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

test('keeps the complete territory shell below Safari browser chrome', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1226, height: 768 });
  await mockTerritory(page);
  await page.goto('/territory');

  const appHeader = page.getByText('PiCC New York', { exact: true }).locator('xpath=ancestor::header[1]');
  const mapTab = page.getByRole('button', { name: 'Map', exact: true });
  const listTab = page.getByRole('button', { name: 'List', exact: true });
  const map = page.locator('.gm-style').first();
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });

  await expect(appHeader).toBeVisible();
  await expect(mapTab).toBeVisible();
  await expect(listTab).toBeVisible();
  await expect(map).toBeVisible();
  await expect(navigation).toBeVisible();

  // Safari can pin a nested sticky header to the browser window rather than the
  // app's clipped viewport, placing it underneath the tab/favorites chrome.
  // The shell already owns scrolling in <main>, so its frame header must stay
  // in normal flow.
  await expect(appHeader).toHaveCSS('position', 'static');

  const [headerBox, mapTabBox, listTabBox, mapBox, navigationBox] = await Promise.all([
    appHeader.boundingBox(),
    mapTab.boundingBox(),
    listTab.boundingBox(),
    map.boundingBox(),
    navigation.boundingBox(),
  ]);

  for (const box of [headerBox, mapTabBox, listTabBox, mapBox, navigationBox]) {
    expect(box).not.toBeNull();
  }

  expect(headerBox!.y).toBeGreaterThanOrEqual(12);
  expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(mapTabBox!.y);
  expect(mapTabBox!.y).toBe(listTabBox!.y);
  expect(mapTabBox!.y + mapTabBox!.height).toBeLessThanOrEqual(mapBox!.y);
  expect(navigationBox!.y + navigationBox!.height).toBeLessThanOrEqual(768);
  expect(mapBox!.y).toBeLessThan(navigationBox!.y);
  expect(mapBox!.y + mapBox!.height).toBeGreaterThanOrEqual(navigationBox!.y);

  await page.screenshot({ path: testInfo.outputPath('territory-shell-safari-desktop.png') });
});

test('keeps the territory shell visible at a zoom-equivalent short desktop viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 981, height: 614 });
  await mockTerritory(page);
  await page.goto('/territory');

  const appHeader = page.getByText('PiCC New York', { exact: true }).locator('xpath=ancestor::header[1]');
  const mapTab = page.getByRole('button', { name: 'Map', exact: true });
  const listTab = page.getByRole('button', { name: 'List', exact: true });
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });

  await expect(appHeader).toBeVisible();
  await expect(mapTab).toBeVisible();
  await expect(listTab).toBeVisible();
  await expect(navigation).toBeVisible();
  await expect(appHeader).toHaveCSS('position', 'static');

  const [headerBox, mapTabBox, navigationBox] = await Promise.all([
    appHeader.boundingBox(),
    mapTab.boundingBox(),
    navigation.boundingBox(),
  ]);

  expect(headerBox).not.toBeNull();
  expect(mapTabBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(headerBox!.y).toBeGreaterThanOrEqual(12);
  expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(mapTabBox!.y);
  expect(navigationBox!.y + navigationBox!.height).toBeLessThanOrEqual(614);

  await page.screenshot({ path: testInfo.outputPath('territory-shell-safari-zoom-equivalent.png') });
});
