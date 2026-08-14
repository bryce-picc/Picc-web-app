import { expect, test, type Page } from '@playwright/test';

type Decision = 'KEEP_CURRENT_OWNER' | 'TRANSFER_TO_INCOMING';

function conflict(id: string, incomingAccountName: string, currentOwnerAccountName: string) {
  const now = '2026-08-14T14:30:00.000Z';
  return {
    id,
    createdAt: now,
    metadata: {
      status: 'OPEN' as 'OPEN' | 'RESOLVED',
      occurrenceCount: 2,
      firstDetectedAt: now,
      lastDetectedAt: now,
      incomingAccountName,
      currentOwnerAccountName,
      reason: 'page_owned_by_another_account',
      sourceIdentifiers: { licensedLocationId: `location-${id}`, nabisRetailerId: `retailer-${id}`, licenseNumber: `license-${id}` },
      email: { status: 'FAILED' as const, error: 'Transactional email is not configured.', attemptedAt: now },
      resolution: undefined as { decision: Decision; resolvedAt: string } | undefined,
    },
  };
}

async function mockReviewApi(page: Page) {
  const state = {
    conflicts: [
      conflict('cm123456789012345678901234', 'Incoming Retailer One', 'Current CRM Owner One'),
      conflict('cm223456789012345678901234', 'Incoming Retailer Two', 'Current CRM Owner Two'),
    ],
    preference: { email: 'bryce@piccplatform.com', emailEnabled: true, inAppEnabled: true },
    emailProviderReady: false,
  };

  await page.route('**/api/settings/nabis-identity-conflicts', async (route) => {
    const request = route.request();
    const payload = request.method() === 'GET' ? null : request.postDataJSON();
    if (request.method() === 'PATCH') {
      state.preference = { email: payload.email, emailEnabled: payload.emailEnabled, inAppEnabled: payload.inAppEnabled };
    }
    if (request.method() === 'POST' && payload.action === 'resolve') {
      const item = state.conflicts.find((entry) => entry.id === payload.notificationId);
      if (item) {
        item.metadata.status = 'RESOLVED';
        item.metadata.resolution = { decision: payload.decision, resolvedAt: '2026-08-14T14:35:00.000Z' };
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state) });
  });

  return state;
}

test('configures alerts and resolves both Nabis identity decisions', async ({ page }) => {
  await mockReviewApi(page);
  await page.goto('/settings');
  await page.getByRole('heading', { name: 'Nabis identity review' }).scrollIntoViewIfNeeded();
  await expect(page.getByText('2 open', { exact: true })).toBeVisible();

  await page.getByLabel('Review email').fill('alerts@piccplatform.com');
  await page.getByText('Email', { exact: true }).click();
  await page.getByText('Email', { exact: true }).click();
  await page.getByRole('button', { name: 'Save alerts' }).click();
  await expect(page.getByText('Nabis conflict alerts saved.')).toBeVisible();

  const transfer = page.getByRole('article').filter({ hasText: 'Incoming Retailer One' });
  await transfer.getByRole('button', { name: 'Transfer to Nabis account' }).click();
  await expect(transfer.getByText('Transfer the CRM page to Incoming Retailer One?')).toBeVisible();
  await transfer.getByRole('button', { name: 'Cancel' }).click();
  await transfer.getByRole('button', { name: 'Transfer to Nabis account' }).click();
  await transfer.getByRole('button', { name: 'Confirm decision' }).click();
  await expect(page.getByText('1 open', { exact: true })).toBeVisible();

  const keep = page.getByRole('article').filter({ hasText: 'Incoming Retailer Two' });
  await keep.getByRole('button', { name: 'Keep current owner' }).click();
  await keep.getByRole('button', { name: 'Confirm decision' }).click();
  await expect(page.getByText('No unresolved Nabis identity conflicts.')).toBeVisible();
});

test('keeps the Nabis review panel usable at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReviewApi(page);
  await page.goto('/settings');
  const panel = page.locator('#nabis-identity-review');
  await panel.scrollIntoViewIfNeeded();
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const buttonHeights = await panel.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(Math.min(...buttonHeights)).toBeGreaterThanOrEqual(44);
});
