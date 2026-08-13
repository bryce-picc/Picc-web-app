# Subway Lines Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible territory-map control that shows Google transit routes and stations and remembers the choice on the current device.

**Architecture:** Keep preference parsing and Google overlay lifecycle in a focused, testable territory utility. `TerritoryMobile` owns the UI state, passes it through `TerritoryMapMobile` to `GoogleTerritoryMap`, and renders the toggle through `TerritoryMapOverlayControls`. A map child attaches one native `google.maps.TransitLayer` while enabled and detaches it on disable or unmount.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, `@vis.gl/react-google-maps`, Google Maps JavaScript API, Tailwind CSS v4, Lucide React, Vitest, Playwright.

## Global Constraints

- Keep Google Maps as the only supported map provider.
- Default subway lines to off on first use.
- Persist only on the current browser/device with `localStorage`; add no backend or database state.
- Preserve account pins, route geometry, territory boundaries, markers, lasso, search, filters, camera state, and map gestures.
- Use the existing 40px right-side toolbar control treatment and PICC-red `#cd3814` active state.
- Use exact accessible copy: `Show subway lines` when off and `Hide subway lines` when on.
- Do not add custom MTA geometry, schedules, service alerts, route-planning changes, schema changes, auth changes, or production-data writes.
- Do not change `/Users/brycejohnson/Code/map-app`.
- Use RED tests before non-test behavior edits.

## File Structure

- Create `lib/territory/subway-lines.ts`: storage key, safe preference I/O, transit-layer factory, and attach/cleanup adapter.
- Create `lib/territory/subway-lines.test.ts`: deterministic storage and Google overlay lifecycle tests.
- Modify `components/territory/google-territory-map.tsx`: typed `TransitLayer` access and a small `SubwayLayer` map child.
- Modify `components/mobile/territory-map-mobile.tsx`: pass subway visibility and unavailable callback through the mobile map boundary.
- Modify `components/mobile/territory-map-overlay-controls.tsx`: train-icon toggle with state-specific styling and accessible semantics.
- Modify `components/mobile/territory-mobile.tsx`: load, toggle, persist, and recover subway preference.
- Create `tests/e2e/territory-subway-lines.spec.ts`: browser-visible toggle, persistence, route compatibility, and responsive checks.
- Update `SESSION.md`: record final validation and proof without changing scope.

---

### Task 1: Safe preference and transit-layer adapters

**Files:**
- Create: `lib/territory/subway-lines.test.ts`
- Create: `lib/territory/subway-lines.ts`

**Interfaces:**
- Produces: `SUBWAY_LINES_STORAGE_KEY: 'picc:territory:subway-lines'`
- Produces: `loadSubwayLinesPreference(storage: StorageReader | null | undefined): boolean`
- Produces: `persistSubwayLinesPreference(storage: StorageWriter | null | undefined, enabled: boolean): boolean`
- Produces: `createTransitLayer(mapsApi: TransitMapsApi | null | undefined): TransitLayerHandle | null`
- Produces: `attachTransitLayer(layer: TransitLayerHandle, map: unknown): () => void`

- [ ] **Step 1: Write failing preference and lifecycle tests**

Create `lib/territory/subway-lines.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  SUBWAY_LINES_STORAGE_KEY,
  attachTransitLayer,
  createTransitLayer,
  loadSubwayLinesPreference,
  persistSubwayLinesPreference,
} from '@/lib/territory/subway-lines';

describe('subway lines preference', () => {
  it('defaults to off for missing, malformed, or inaccessible storage', () => {
    expect(loadSubwayLinesPreference(null)).toBe(false);
    expect(loadSubwayLinesPreference({ getItem: () => null })).toBe(false);
    expect(loadSubwayLinesPreference({ getItem: () => 'yes' })).toBe(false);
    expect(loadSubwayLinesPreference({ getItem: () => { throw new Error('blocked'); } })).toBe(false);
  });

  it('loads and persists exact boolean values', () => {
    expect(loadSubwayLinesPreference({ getItem: () => 'true' })).toBe(true);
    expect(loadSubwayLinesPreference({ getItem: () => 'false' })).toBe(false);

    const setItem = vi.fn();
    expect(persistSubwayLinesPreference({ setItem }, true)).toBe(true);
    expect(setItem).toHaveBeenCalledWith(SUBWAY_LINES_STORAGE_KEY, 'true');
  });

  it('reports a failed write without throwing', () => {
    expect(persistSubwayLinesPreference({ setItem: () => { throw new Error('quota'); } }, true)).toBe(false);
  });
});

describe('Google transit layer adapter', () => {
  it('returns null when the optional Google API is unavailable', () => {
    expect(createTransitLayer(null)).toBeNull();
    expect(createTransitLayer({})).toBeNull();
  });

  it('attaches once and detaches during cleanup', () => {
    const setMap = vi.fn();
    class TransitLayer {
      setMap = setMap;
    }
    const layer = createTransitLayer({ TransitLayer });
    expect(layer).not.toBeNull();

    const map = { id: 'territory-map' };
    const cleanup = attachTransitLayer(layer!, map);
    expect(setMap).toHaveBeenCalledWith(map);
    cleanup();
    expect(setMap).toHaveBeenLastCalledWith(null);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- lib/territory/subway-lines.test.ts`

Expected: FAIL because `@/lib/territory/subway-lines` does not exist.

- [ ] **Step 3: Implement the minimal utility**

Create `lib/territory/subway-lines.ts`:

```ts
export const SUBWAY_LINES_STORAGE_KEY = 'picc:territory:subway-lines';

export type StorageReader = { getItem: (key: string) => string | null };
export type StorageWriter = { setItem: (key: string, value: string) => void };

export type TransitLayerHandle = {
  setMap: (map: unknown | null) => void;
};

export type TransitMapsApi = {
  TransitLayer?: new () => TransitLayerHandle;
};

export function loadSubwayLinesPreference(storage: StorageReader | null | undefined): boolean {
  try {
    return storage?.getItem(SUBWAY_LINES_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function persistSubwayLinesPreference(
  storage: StorageWriter | null | undefined,
  enabled: boolean,
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SUBWAY_LINES_STORAGE_KEY, String(enabled));
    return true;
  } catch {
    return false;
  }
}

export function createTransitLayer(mapsApi: TransitMapsApi | null | undefined): TransitLayerHandle | null {
  return mapsApi?.TransitLayer ? new mapsApi.TransitLayer() : null;
}

export function attachTransitLayer(layer: TransitLayerHandle, map: unknown): () => void {
  layer.setMap(map);
  return () => layer.setMap(null);
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- lib/territory/subway-lines.test.ts`

Expected: PASS with 5 tests.

- [ ] **Step 5: Commit the adapter slice**

```bash
git add lib/territory/subway-lines.ts lib/territory/subway-lines.test.ts
git commit -m "feat: add subway layer preference adapter"
```

---

### Task 2: Complete browser-visible subway toggle

**Files:**
- Create: `tests/e2e/territory-subway-lines.spec.ts`
- Modify: `components/mobile/territory-map-overlay-controls.tsx:3-44,283-321`
- Modify: `components/mobile/territory-mobile.tsx:3-26,88-176,709-806`
- Modify: `components/mobile/territory-map-mobile.tsx:9-96`
- Modify: `components/territory/google-territory-map.tsx:15-91,139-175,604-725`

**Interfaces:**
- Consumes: `loadSubwayLinesPreference(window.localStorage): boolean`
- Consumes: `persistSubwayLinesPreference(window.localStorage, enabled): boolean`
- Adds control props: `showSubwayLines: boolean`, `onToggleSubwayLines: () => void`
- Produces state for the map boundary: `showSubwayLines: boolean`, `onSubwayLinesUnavailable: () => void`
- Consumes: `createTransitLayer(mapsApi)` and `attachTransitLayer(layer, map)` from Task 1.
- Adds map props: `showSubwayLines?: boolean`, `onSubwayLinesUnavailable?: () => void`.

- [ ] **Step 1: Write the failing Playwright behavior test**

Create `tests/e2e/territory-subway-lines.spec.ts` with deterministic route interception:

```ts
import { expect, test, type Page } from '@playwright/test';

const preferenceKey = 'picc:territory:subway-lines';

async function mockTerritory(page: Page) {
  await page.route('**/api/territory/stores**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      stores: [
        { id: 'one', notionPageId: 'one', name: 'Downtown One', status: 'Lead - Hot', statusKey: 'lead-hot', statusColor: 'red', pinKind: 'lead', repNames: [], repEmails: [], lat: 40.7128, lng: -74.006, locationLabel: 'New York', locationAddress: 'New York, NY', locationSource: 'google-address-cache', locationPrecision: 'address', isApproximate: false, lastEditedTime: '2026-08-12T00:00:00.000Z', city: 'New York', state: 'NY', referralSource: null },
        { id: 'two', notionPageId: 'two', name: 'Brooklyn Two', status: 'Lead - Hot', statusKey: 'lead-hot', statusColor: 'red', pinKind: 'lead', repNames: [], repEmails: [], lat: 40.6943, lng: -73.9918, locationLabel: 'Brooklyn', locationAddress: 'Brooklyn, NY', locationSource: 'google-address-cache', locationPrecision: 'address', isApproximate: false, lastEditedTime: '2026-08-12T00:00:00.000Z', city: 'Brooklyn', state: 'NY', referralSource: null },
      ],
      filters: { statuses: [], reps: [], pppStatuses: [], headsetConnectionStatuses: [], preferredPartners: [], referralSources: [], locationAvailability: [], vendorDayStatuses: [] },
      meta: { dataSource: 'notion-live-cache', lastEditedMax: null, recordsRead: 2, unresolvedLocationCount: 0, geocodedThisRequest: 0, syncedAt: null, stale: false, syncing: false, syncError: null },
    }),
  }));
  await page.route('**/api/territory/boundaries', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ boundaries: [] }) }));
  await page.route('**/api/territory/markers', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ markers: [] }) }));
  await page.route('**/api/territory/saved-routes', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ routes: [] }) }));
}

test.beforeEach(async ({ page }) => {
  await mockTerritory(page);
  await page.addInitScript((key) => localStorage.removeItem(key), preferenceKey);
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
  await page.addInitScript(() => localStorage.setItem('picc_route_plan_v1', JSON.stringify({ selectedStopIds: ['one', 'two'], orderedStopIds: ['one', 'two'], savedRoutes: [], optimizedRoute: null, updatedAt: new Date().toISOString() })));
  await page.goto('/territory');
  await page.getByRole('button', { name: 'Show subway lines' }).click();
  await page.getByRole('button', { name: 'Visualize Route' }).click();
  await expect(page.getByRole('button', { name: 'Hide subway lines' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Hide Route' })).toBeVisible();
});
```

- [ ] **Step 2: Run the new browser test and confirm RED**

Run: `npx playwright test tests/e2e/territory-subway-lines.spec.ts --project=chromium`

Expected: FAIL because the `Show subway lines` control does not exist.

- [ ] **Step 3: Add the train-icon control**

In `components/mobile/territory-map-overlay-controls.tsx`:

- Import `TrainFront` from `lucide-react`.
- Add required props `showSubwayLines` and `onToggleSubwayLines`.
- Insert the button directly after Search with:

```tsx
<button
  type="button"
  aria-label={showSubwayLines ? 'Hide subway lines' : 'Show subway lines'}
  title={showSubwayLines ? 'Hide subway lines' : 'Show subway lines'}
  aria-pressed={showSubwayLines}
  className={cn(
    'picc-soft-transition grid h-10 w-10 place-items-center rounded-lg bg-white/90 shadow hover:bg-white active:scale-[0.94]',
    showSubwayLines ? 'ring-2 ring-[#cd3814]' : '',
  )}
  onClick={onToggleSubwayLines}
>
  <TrainFront className={cn('h-5 w-5', showSubwayLines ? 'text-[#cd3814]' : 'text-[#7f828a]')} />
</button>
```

- [ ] **Step 4: Own and persist state in `TerritoryMobile`**

In `components/mobile/territory-mobile.tsx`:

- Import `useCallback` plus the preference functions.
- Add `const [showSubwayLines, setShowSubwayLines] = useState(false);`.
- Load once after mount without writing a false value first:

```tsx
useEffect(() => {
  setShowSubwayLines(loadSubwayLinesPreference(window.localStorage));
}, []);
```

- Add explicit user and fallback handlers:

```tsx
const toggleSubwayLines = useCallback(() => {
  setShowSubwayLines((current) => {
    const next = !current;
    persistSubwayLinesPreference(window.localStorage, next);
    return next;
  });
}, []);

const handleSubwayLinesUnavailable = useCallback(() => {
  setShowSubwayLines(false);
  persistSubwayLinesPreference(window.localStorage, false);
  toast.error('Subway lines are unavailable in Google Maps right now.');
}, []);
```

- Pass `showSubwayLines` and `onSubwayLinesUnavailable={handleSubwayLinesUnavailable}` to `TerritoryMapMobile`.
- Pass `showSubwayLines` and `onToggleSubwayLines={toggleSubwayLines}` to `TerritoryMapOverlayControls`.

- [ ] **Step 5: Pass the state through `TerritoryMapMobile`**

Add both props to `TerritoryMapMobileProps`, destructure them with `showSubwayLines = false`, and forward them to `GoogleTerritoryMap`:

```tsx
showSubwayLines={showSubwayLines}
onSubwayLinesUnavailable={onSubwayLinesUnavailable}
```

- [ ] **Step 6: Extend the Google API boundary and implement the map child**

In `components/territory/google-territory-map.tsx`:

- Import `attachTransitLayer`, `createTransitLayer`, and `TransitMapsApi`.
- Define `GoogleMapsApi` as the existing map types intersected with `TransitMapsApi`.
- Add optional props to `GoogleTerritoryMapProps`.
- Add the focused map child:

```tsx
function SubwayLayer({
  enabled,
  onUnavailable,
}: {
  enabled: boolean;
  onUnavailable?: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !map) return;
    const layer = createTransitLayer(getGoogleMapsApi());
    if (!layer) {
      onUnavailable?.();
      return;
    }
    return attachTransitLayer(layer, map);
  }, [enabled, map, onUnavailable]);

  return null;
}
```

- Render `<SubwayLayer enabled={showSubwayLines} onUnavailable={onSubwayLinesUnavailable} />` next to `RouteLine` inside `GoogleMap`.

- [ ] **Step 7: Run focused unit and browser tests**

Run: `npm test -- lib/territory/subway-lines.test.ts`

Expected: PASS.

Run: `npx playwright test tests/e2e/territory-subway-lines.spec.ts --project=chromium`

Expected: PASS for toggle, persistence, and route compatibility.

- [ ] **Step 8: Run lint and typecheck**

Run: `npm run lint -- --no-cache && npm run typecheck`

Expected: PASS with no missing prop or Google Maps type errors.

- [ ] **Step 9: Commit the complete interactive feature**

```bash
git add components/mobile/territory-mobile.tsx components/mobile/territory-map-mobile.tsx components/mobile/territory-map-overlay-controls.tsx components/territory/google-territory-map.tsx tests/e2e/territory-subway-lines.spec.ts
git commit -m "feat: add persistent subway lines toggle"
```

---

### Task 3: Responsive browser QA, visual evidence, and final verification

**Files:**
- Modify: `tests/e2e/territory-subway-lines.spec.ts`
- Modify: `SESSION.md`
- Evidence only: `/tmp/picc-subway-desktop.png`, `/tmp/picc-subway-mobile.png`

**Interfaces:**
- Verifies the complete feature without creating production data.

- [ ] **Step 1: Add viewport-fit assertions**

Append a test that runs at `{ width: 390, height: 844 }`, enables the control, and asserts its bounding box stays within the viewport and does not overlap the bottom navigation:

```ts
test('keeps the subway control reachable on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/territory');
  const toggle = page.getByRole('button', { name: 'Show subway lines' });
  await toggle.click();
  const box = await page.getByRole('button', { name: 'Hide subway lines' }).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThan(768);
});
```

- [ ] **Step 2: Write the QA inventory before browser signoff**

Record these checks in the working notes before running the browser:

- Default off and exact accessible copy.
- Toggle on/off and local preference value.
- Reload persistence.
- Native overlay adapter attachment and cleanup.
- Route visualization remains independently usable.
- Search, layers, and filters remain reachable.
- Desktop 1440x900 and mobile 390x844 layout fit.
- Exploratory: blocked local storage.
- Exploratory: missing `TransitLayer` API fallback.

- [ ] **Step 3: Run the complete automated validation**

Run: `npm run verify`

Expected: lint, typecheck, all Vitest files, Prisma validation, and production build PASS.

Run: `npm run test:e2e`

Expected: all Playwright smoke and subway tests PASS.

- [ ] **Step 4: Run headed desktop and mobile interaction passes**

Start the isolated server with `npm run dev:agent`. Use the available browser-testing workflow to exercise the QA inventory at 1440x900 and 390x844. Use intercepted/fake territory responses; do not create records or mutate production data.

Capture:

```txt
/tmp/picc-subway-desktop.png
/tmp/picc-subway-mobile.png
```

Each screenshot must show the map view, the active train control, and unobstructed surrounding controls. If a configured Google API key is available, center on NYC and capture visible transit routes; otherwise label the screenshots as local control-state proof and reserve transit rendering for authenticated production verification.

- [ ] **Step 5: Update session proof and run diff review**

Add the exact commands, pass counts, screenshot paths, and any remaining Google-rendering risk to `SESSION.md`.

Run:

```bash
git diff --check
git status --short
git diff --stat origin/main...HEAD
git diff origin/main...HEAD -- components lib/territory tests/e2e SESSION.md
```

Expected: no whitespace errors, no unrelated files, no secrets, no production data, and no Map-APP changes.

- [ ] **Step 6: Commit verification notes**

```bash
git add tests/e2e/territory-subway-lines.spec.ts SESSION.md
git commit -m "test: verify subway toggle browser behavior"
```

- [ ] **Step 7: Publish and update draft PR #158**

Push the branch. Update PR #158 with validation commands, screenshots, remaining risk, and changed-file scope. Do not mark it ready or merge until the required review and verification-before-completion checks pass.
