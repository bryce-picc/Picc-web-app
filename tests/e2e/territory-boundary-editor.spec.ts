import { expect, test, type Page } from '@playwright/test';

const coordinates: [number, number][] = [
  [-73.96628, 40.73636],
  [-73.93075, 40.73362],
  [-73.94946, 40.71606],
  [-73.95813, 40.70728],
  [-73.97503, 40.71203],
  [-73.98284, 40.72392],
  [-73.97931, 40.73148],
  [-73.97144, 40.73821],
];

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
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        boundaries: [
          {
            id: 'queens-east',
            name: 'Queens East',
            description: 'Reported short-viewport regression fixture',
            color: '#1746ff',
            borderWidth: 2,
            isVisibleByDefault: true,
            coordinates,
            createdAt: '2026-08-12T00:00:00.000Z',
            updatedAt: '2026-08-12T00:00:00.000Z',
          },
        ],
      }),
    }),
  );
  await page.route('**/api/territory/markers', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ markers: [] }) }),
  );
  await page.route('**/api/territory/saved-routes', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ routes: [] }) }),
  );
}

async function openPopulatedBoundaryEditor(page: Page) {
  await mockTerritory(page);
  await page.goto('/territory');
  await page.getByRole('button', { name: 'Open territory layers' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
}

async function expectSaveAboveNavigation(page: Page) {
  const save = page.getByRole('button', { name: 'Save Boundary' });
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(save).toBeVisible();

  const [saveBox, navigationBox] = await Promise.all([save.boundingBox(), navigation.boundingBox()]);
  expect(saveBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(navigationBox!.y);
}

test('keeps Save Boundary above the fixed primary navigation at a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await openPopulatedBoundaryEditor(page);
  await expectSaveAboveNavigation(page);

  const scrollBody = page.getByTestId('territory-boundary-editor-scroll');
  const scrollMetrics = await scrollBody.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);

  await page.route('**/api/territory/boundaries/queens-east', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        boundary: {
          id: 'queens-east',
          name: 'Queens East',
          description: 'Reported short-viewport regression fixture',
          color: '#1746ff',
          borderWidth: 2,
          isVisibleByDefault: true,
          coordinates,
          createdAt: '2026-08-12T00:00:00.000Z',
          updatedAt: '2026-08-12T00:05:00.000Z',
        },
      }),
    }),
  );
  const save = page.getByRole('button', { name: 'Save Boundary' });
  await save.focus();
  await expect(save).toBeFocused();
  await save.press('Enter');
  await expect(page.getByText('Territory boundary updated')).toBeVisible();
});

for (const viewport of [
  { name: 'mobile portrait', width: 390, height: 844 },
  { name: 'mobile landscape', width: 844, height: 390 },
  { name: 'reported desktop', width: 1800, height: 1280 },
]) {
  test(`keeps the boundary save action reachable at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openPopulatedBoundaryEditor(page);
    await expectSaveAboveNavigation(page);
    if (viewport.name === 'mobile portrait' || viewport.name === 'reported desktop') {
      await page.screenshot({ path: testInfo.outputPath(`${viewport.name.replaceAll(' ', '-')}.png`) });
    }
  });
}
