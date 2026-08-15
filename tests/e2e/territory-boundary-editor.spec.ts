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
  await page.getByRole('button', { name: 'Delete' }).last().focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Finish Shape' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Clear' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  await save.press('Enter');
  await expect(page.getByText('Territory boundary updated')).toBeVisible();
});

test('keeps Finish Shape and Clear reachable while the mobile point list scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPopulatedBoundaryEditor(page);

  const scrollBody = page.getByTestId('territory-boundary-editor-scroll');
  const finish = page.getByRole('button', { name: 'Finish Shape' });
  const clear = page.getByRole('button', { name: 'Clear' });
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  const initialFinishBox = await finish.boundingBox();
  const initialClearBox = await clear.boundingBox();

  expect(initialFinishBox).not.toBeNull();
  expect(initialClearBox).not.toBeNull();
  await scrollBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(finish).toBeVisible();
  await expect(clear).toBeVisible();
  const [scrolledFinishBox, scrolledClearBox, navigationBox] = await Promise.all([
    finish.boundingBox(),
    clear.boundingBox(),
    navigation.boundingBox(),
  ]);
  expect(scrolledFinishBox).not.toBeNull();
  expect(scrolledClearBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(scrolledFinishBox!.y).toBe(initialFinishBox!.y);
  expect(scrolledClearBox!.y).toBe(initialClearBox!.y);
  expect(scrolledFinishBox!.y + scrolledFinishBox!.height).toBeLessThanOrEqual(navigationBox!.y);
  expect(scrolledClearBox!.y + scrolledClearBox!.height).toBeLessThanOrEqual(navigationBox!.y);

  await finish.click();
  await clear.click();
  await expect(page.getByText('0 points captured')).toBeVisible();
});

test('keeps map tap drawing active in the minimized territory drawing bar', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPopulatedBoundaryEditor(page);

  const name = page.getByLabel('Name');
  const description = page.getByLabel('Description');
  const scrollBody = page.getByTestId('territory-boundary-editor-scroll');
  const minimize = page.getByRole('button', { name: 'Minimize territory editor' });
  await expect(name).toHaveValue('Queens East');
  await expect(description).toHaveValue('Reported short-viewport regression fixture');
  await page.getByRole('button', { name: 'Add Points by Click' }).click();
  await scrollBody.evaluate((element) => {
    element.scrollTop = 200;
  });
  const scrollTopBeforeMinimize = await scrollBody.evaluate((element) => element.scrollTop);
  expect(scrollTopBeforeMinimize).toBeGreaterThan(0);
  await minimize.click();

  await expect(scrollBody).toBeHidden();
  await expect(page.getByRole('button', { name: 'Save Boundary' })).toBeHidden();
  const compactBar = page.getByTestId('territory-boundary-editor-minimized');
  const compactStatus = page.getByRole('status');
  const expand = page.getByRole('button', { name: 'Expand territory editor' });
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(compactStatus).toContainText('Drawing');
  await expect(compactStatus).toContainText('8 points');
  await expect(expand).toBeFocused();
  const [compactBox, navigationBox] = await Promise.all([compactBar.boundingBox(), navigation.boundingBox()]);
  expect(compactBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(compactBox!.height).toBeLessThan(72);
  expect(compactBox!.y + compactBox!.height).toBeLessThanOrEqual(navigationBox!.y);

  const map = page.locator('.gm-style').first();
  await expect(map).toBeVisible();
  await map.click({ position: { x: 120, y: 280 } });
  await expect(compactStatus).toContainText('9 points');
  await page.screenshot({ path: testInfo.outputPath('territory-minimized-mobile.png') });
  await page.getByRole('button', { name: 'Undo point' }).click();
  await expect(compactStatus).toContainText('8 points');

  await expand.click();
  await expect(minimize).toBeFocused();
  await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBe(scrollTopBeforeMinimize);
  await expect(name).toHaveValue('Queens East');
  await expect(description).toHaveValue('Reported short-viewport regression fixture');
  await expect(page.getByRole('button', { name: 'Stop Adding Points' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finish Shape' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Boundary' })).toBeVisible();
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
    if (viewport.name === 'mobile landscape') {
      const scrollBody = page.getByTestId('territory-boundary-editor-scroll');
      const save = page.getByRole('button', { name: 'Save Boundary' });
      const footerYBeforeScroll = (await save.boundingBox())!.y;
      expect(await scrollBody.evaluate((element) => element.clientHeight)).toBeGreaterThanOrEqual(44);
      await scrollBody.evaluate((element) => {
        element.scrollTop = 100;
      });
      expect(await scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      expect((await save.boundingBox())!.y).toBe(footerYBeforeScroll);
    }
    if (viewport.name === 'mobile portrait' || viewport.name === 'reported desktop') {
      await page.screenshot({ path: testInfo.outputPath(`${viewport.name.replaceAll(' ', '-')}.png`) });
    }
  });
}
