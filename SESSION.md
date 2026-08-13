# Session: Issue 159 Subway Visibility

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/159
- Branch: `codex/159-subway-visibility`

## Scope

- Replace the faint native Google transit layer with a custom MTA subway overlay.
- Match the supplied Apple Maps reference with thicker route-colored strokes, dark contrast casing, and readable route badges.
- Move the subway toggle directly below the Filters control.
- Preserve the device-local preference and all existing territory-map interactions.

## Out of scope

- Replacing Google Maps as the base map.
- Copying Apple map tiles, proprietary typography, POI data, or trade dress.
- Live arrival times, service alerts, trip planning, or schedule ingestion.
- Database, schema, authentication, authorization, environment, or production-data changes.
- Any change to `/Users/brycejohnson/Code/map-app`.

## Constraints

- Keep Google Maps as the only map provider.
- Use public official MTA route geometry and document its source/version.
- Keep subway labels legible without blocking dispensary pins or map gestures.
- Use failing tests before behavior edits.
- Run `npm run verify` and `npm run test:e2e` before completion.
- Capture desktop and mobile browser evidence.

## Ownership and overlap

- Planned owned paths: `components/mobile/territory-map-overlay-controls.tsx`, `components/territory/google-territory-map.tsx`, `lib/territory/subway-*`, `public/data/subway-*`, focused tests, this session file, and the issue-159 spec/plan.
- Open PRs #144, #135, and #82 were checked. PRs #135 and #82 do not overlap. PR #144 is a stale broad monorepo migration that conflicts with the repository's current canonical architecture and declares no path ownership.

## Validation plan

- RED unit coverage for route styling, route grouping/offset behavior, zoom-based badge visibility, and invalid geometry.
- RED Playwright coverage for Filters -> Subway control order, persistence, mobile reachability, and coexistence with route visualization.
- Static checks, complete unit suite, production build, and complete E2E suite.
- Browser screenshots at desktop and 390x844 mobile viewports.

## Validation evidence

- Official source: MTA NYCT Subway static GTFS feed `20260807-H-rockaways-extension-removed`, published by MTA New York City Transit.
- Generated asset: 327,700 bytes, 28 services, 98 route paths, and 475 parent stations. The raw 43 MB GTFS archive is not committed.
- RED unit proof: `lib/territory/subway-overlay.test.ts` failed because the overlay module did not exist; `lib/territory/subway-lines.test.ts` then failed because the custom loader/controller exports did not exist.
- RED browser proof: the control-order test failed with Subway at y=169.75 above Filters ending at y=306.88.
- Focused overlay tests: 13 passed.
- Focused subway Playwright suite: 4 passed after moving Subway below Filters.
- `npm run verify`: passed lint, typecheck, 28 Vitest files with 133 tests, Prisma validation, and the Next.js production build.
- `npm run test:e2e`: 19 Playwright tests passed.
- Real Google Maps visual verification used mocked territory responses and the existing local browser Maps configuration; no production record was created or changed.
- Desktop screenshot: `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ff8d5-e100-7570-ad57-fb48755260e4/picc-subway-bold-desktop.png`.
- Mobile screenshot: `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ff8d5-e100-7570-ad57-fb48755260e4/picc-subway-bold-mobile.png`.

## Browser verdict

The map shows thick official-colored routes with dark casing and readable service badges at both desktop and 390x844. The right toolbar order is Search, Territory Layers, Filters, Subway. Account-map gestures remain available, and unit/browser coverage proves toggle cleanup, persistence, and route-visualization coexistence.

The only browser console errors during visual capture were expected local database requests before interception and the unavailable local audit endpoint; the Google Maps scripts and `/data/nyc-subway-overlay.v1.json` returned HTTP 200.
