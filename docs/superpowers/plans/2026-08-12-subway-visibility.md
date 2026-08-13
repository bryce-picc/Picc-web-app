# Subway Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the faint native Google transit layer with a thick, Apple Maps-like MTA subway overlay and place its toggle directly beneath Filters.

**Architecture:** Generate one versioned, browser-ready static asset from the official MTA NYCT Subway GTFS feed. Keep deterministic parsing, styling, zoom decluttering, and SVG badge creation in a focused domain module; keep Google Maps lifecycle work in a thin overlay component that owns polylines, badge markers, zoom listeners, loading, and cleanup.

**Tech Stack:** Next.js 15, React 19, TypeScript, Google Maps JavaScript API through `@vis.gl/react-google-maps`, Tailwind CSS 4, Vitest, Playwright, Node.js 20+.

## Global Constraints

- Google Maps remains the only base-map provider.
- Use the official MTA NYCT Subway GTFS feed at `http://web.mta.info/developers/data/nyct/subway/google_transit.zip`, listed by the MTA-owned New York Open Data catalog.
- Runtime code performs no MTA network request and requires no secret.
- Main route strokes are 5 CSS pixels through zoom 10, 7 pixels at zoom 11-12, and 8 pixels from zoom 13 upward.
- Casing is 4 CSS pixels wider than the colored stroke.
- Badges are 20 CSS pixels through zoom 12 and 22 pixels from zoom 13 upward.
- Subway rendering remains below PICC account pins and the blue driving-route overlay.
- Existing device preference key `picc:territory:subway-lines` remains unchanged.
- No database, schema, authentication, authorization, environment, or production-data changes.

---

### Task 1: Generate a normalized official MTA overlay asset

**Files:**
- Create: `scripts/generate-subway-overlay.mjs`
- Create: `public/data/nyc-subway-overlay.v1.json`
- Create: `lib/territory/subway-overlay.ts`
- Test: `lib/territory/subway-overlay.test.ts`

**Interfaces:**
- Produces `SubwayOverlayData`, `SubwayRoutePath`, `SubwayStation`, `parseSubwayOverlayData(input)`, `subwayStrokeStyle(zoom)`, `visibleSubwayStations(stations, zoom)`, `offsetSubwayPath(path, laneOffsetMeters)`, and `subwayBadgeSvg(station, size)`.
- `SubwayOverlayData` contains `source`, `generatedAt`, `routes`, and `stations`; each route has official `id`, `label`, `color`, `textColor`, `laneOffsetMeters`, and simplified `paths`.

- [x] **Step 1: Write failing domain tests**

Add tests that assert:

```ts
expect(subwayStrokeStyle(9)).toEqual({ strokeWeight: 5, casingWeight: 9, badgeSize: 20 });
expect(subwayStrokeStyle(12)).toEqual({ strokeWeight: 7, casingWeight: 11, badgeSize: 20 });
expect(subwayStrokeStyle(14)).toEqual({ strokeWeight: 8, casingWeight: 12, badgeSize: 22 });
expect(visibleSubwayStations(stations, 9).every((station) => station.routes.length >= 5)).toBe(true);
expect(visibleSubwayStations(stations, 12).every((station) => station.routes.length >= 2)).toBe(true);
expect(parseSubwayOverlayData({ routes: 'bad' })).toBeNull();
expect(subwayBadgeSvg(interchange, 22)).toContain('A');
expect(subwayBadgeSvg(interchange, 22)).toContain('#0062CF');
```

Also verify `offsetSubwayPath` preserves the point count, returns finite coordinates, and leaves the input unchanged for a zero-meter offset.

- [x] **Step 2: Run the focused test to prove RED**

Run: `npm test -- lib/territory/subway-overlay.test.ts`

Expected: FAIL because `@/lib/territory/subway-overlay` does not exist.

- [x] **Step 3: Implement the typed overlay domain module**

Implement strict runtime validation for finite NYC-area coordinates, hex colors, non-empty route IDs, and non-empty path arrays. Define exact zoom styling, station thresholds (`5+` routes through zoom 9, `3+` at zoom 10-11, `2+` at zoom 12-13, all at zoom 14+), a small equirectangular perpendicular offset in meters, XML-safe badge text, and a composite inline SVG strip with one official-colored badge per service.

- [x] **Step 4: Implement the reproducible GTFS generator**

Create a Node script that accepts an extracted GTFS directory and output path:

```bash
node scripts/generate-subway-overlay.mjs /tmp/picc-mta-gtfs public/data/nyc-subway-overlay.v1.json
```

It must parse quoted CSV safely, map `trip_id -> route_id/shape_id`, aggregate child stops to `parent_station`, calculate station service sets from `stop_times.txt`, select the longest shape for each unique route terminal pair, simplify paths with a 6-meter Douglas-Peucker tolerance, assign stable lane offsets by official route-color family, and include feed publisher/version metadata from `feed_info.txt`.

- [x] **Step 5: Generate and validate the asset**

Extract the already downloaded official archive into `/tmp/picc-mta-gtfs`, run the generator, then verify:

```bash
node -e "const d=require('./public/data/nyc-subway-overlay.v1.json'); if(!d.routes.length||!d.stations.length) process.exit(1); console.log({routes:d.routes.length,stations:d.stations.length,source:d.source})"
```

Expected: non-zero routes and stations, official MTA source metadata, and a public asset small enough for a lazy browser fetch.

- [x] **Step 6: Run focused tests and commit**

Run: `npm test -- lib/territory/subway-overlay.test.ts`

Expected: PASS.

Commit: `feat: add normalized MTA subway overlay data`

---

### Task 2: Render bold subway lines and route badges on Google Maps

**Files:**
- Modify: `lib/territory/subway-lines.ts`
- Modify: `lib/territory/subway-lines.test.ts`
- Modify: `components/territory/google-territory-map.tsx`
- Test: `lib/territory/subway-lines.test.ts`

**Interfaces:**
- Consumes `parseSubwayOverlayData`, `subwayStrokeStyle`, `visibleSubwayStations`, `offsetSubwayPath`, and `subwayBadgeSvg` from Task 1.
- Produces `loadSubwayOverlay(fetcher)`, `createSubwayOverlayController(mapsApi, map, data)`, `controller.updateZoom(zoom)`, and `controller.destroy()`.

- [x] **Step 1: Replace native-layer tests with failing custom-controller tests**

Use fakes for `Polyline`, `Marker`, `Size`, and `Point`. Assert that the controller creates two polylines per route path (dark casing followed by official route color), uses z-indexes below the driving route, creates non-clickable badge markers, updates weights and badge visibility on zoom change, and calls `setMap(null)` for every created object during cleanup.

Add loader tests for HTTP failure, invalid JSON, and successful parsing.

- [x] **Step 2: Run the focused tests to prove RED**

Run: `npm test -- lib/territory/subway-lines.test.ts`

Expected: FAIL because the custom loader/controller exports do not exist.

- [x] **Step 3: Implement the custom overlay controller**

Keep the existing storage helpers unchanged. Remove the `TransitLayer` factory/attachment API. Add a cached fetch of `/data/nyc-subway-overlay.v1.json`, create casing and colored `google.maps.Polyline` objects with round visual treatment, create composite SVG `google.maps.Marker` badges, update styling and visibility from the current zoom, and make `destroy()` idempotent.

- [x] **Step 4: Wire the controller into the map lifecycle**

Replace `SubwayLayer` with `BoldSubwayOverlay`. When enabled, lazy-load the static asset, build one controller, apply the current zoom, and subscribe to `zoom_changed`. On disable/unmount, remove the listener and destroy the controller. On any load/render failure, clean up and call `onSubwayLinesUnavailable` so the existing state reset and toast remain authoritative.

Set the driving `RouteLine` polyline `zIndex` above the subway casing and color strokes.

- [x] **Step 5: Run focused tests and commit**

Run: `npm test -- lib/territory/subway-overlay.test.ts lib/territory/subway-lines.test.ts`

Expected: PASS.

Commit: `feat: render bold MTA subway overlay`

---

### Task 3: Put Subway directly under Filters and lock browser behavior

**Files:**
- Modify: `components/mobile/territory-map-overlay-controls.tsx`
- Modify: `tests/e2e/territory-subway-lines.spec.ts`

**Interfaces:**
- Preserves `showSubwayLines` and `onToggleSubwayLines`; only control order changes.
- Browser contract is Search -> Territory Layers -> Filters -> Subway.

- [x] **Step 1: Add a failing control-order assertion**

Use locator bounding boxes to assert that `Open filters` is above `Show subway lines` and that their horizontal centers match. Retain the existing toggle state, reload persistence, mobile reachability, and route-visualization coexistence tests.

- [x] **Step 2: Run the focused Playwright test to prove RED**

Run: `npx playwright test tests/e2e/territory-subway-lines.spec.ts`

Expected: FAIL because Subway currently appears above Territory Layers and Filters.

- [x] **Step 3: Move the Subway control**

Render the existing Subway button immediately after Filters in the right-side control stack. Do not change its icon, accessible action label, `aria-pressed`, or active ring.

- [x] **Step 4: Run focused browser tests and commit**

Run: `npx playwright test tests/e2e/territory-subway-lines.spec.ts`

Expected: PASS.

Commit: `fix: place subway control below filters`

---

### Task 4: Full validation, visual proof, and delivery

**Files:**
- Modify: `SESSION.md`
- Modify: `docs/superpowers/plans/2026-08-12-subway-visibility.md`

**Interfaces:**
- Produces the final validation record and deployment evidence for PR #160.

- [x] **Step 1: Run full repository validation**

Run: `npm run verify`

Expected: lint, typecheck, Vitest, Prisma validation, and production build all pass.

- [x] **Step 2: Run the complete browser suite**

Run: `npm run test:e2e`

Expected: all Playwright tests pass.

- [x] **Step 3: Verify the real map visually**

Launch the worktree app with a configured Google Maps key, enable Subway at desktop and 390x844 mobile widths, and verify line thickness, casing, official colors, readable badges, Filters -> Subway placement, account-pin readability, gestures, route-overlay coexistence, disable cleanup, and reload persistence. Save desktop and mobile screenshots to the task visualization directory.

- [x] **Step 4: Self-review and update evidence**

Review `git diff origin/main...HEAD`, run `git diff --check`, confirm no generated secret or raw 43 MB GTFS archive is committed, record asset byte size and source version in `SESSION.md`, and mark completed plan checkboxes.

- [ ] **Step 5: Finish the draft PR**

Push commits, update PR #160 with validation commands, screenshots, exact data source, non-goals, and remaining risk. Request review, wait for green CI/Vercel, merge through the fast lane, verify the production deployment for the merge commit, and comment on the PR with deployed URL and proof.
