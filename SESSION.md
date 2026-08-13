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
