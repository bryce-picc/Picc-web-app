# Session: Issue 157 Subway Toggle

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/157
- Draft PR: https://github.com/brycejohnson1417/Picc-web-app/pull/158
- Branch: `codex/157-subway-toggle`

## Scope

- Add a polished, accessible subway-lines toggle to the territory map toolbar.
- Render the native Google Maps transit layer without disturbing PICC overlays.
- Remember the setting on the current device.
- Verify the interaction at desktop and mobile viewports.

## Out of scope

- Custom MTA geometry, station, schedule, or service-alert ingestion.
- Route optimization or Google Directions changes.
- Database, schema, authentication, authorization, environment, or production-data changes.
- Any change to `/Users/brycejohnson/Code/map-app`.

## Constraints

- Keep Google Maps as the only map provider.
- Preserve existing account pins, route geometry, territory boundaries, markers, lasso, search, filters, and map gestures.
- Use a failing behavior test before implementation.
- Run `npm run verify` and browser tests before completion.
- Capture user-visible desktop and mobile evidence.

## Ownership and overlap

Owned paths are documented in PR #158. Active PRs #144, #135, and #82 were reviewed. PRs #135 and #82 do not overlap. PR #144 is a broad legacy monorepo migration that conflicts with the current canonical architecture and declares no path ownership.

## Validation evidence

- RED unit proof: `lib/territory/subway-lines.test.ts` initially failed because the subway utility did not exist.
- RED browser proof: the focused Playwright test initially failed because no `Show subway lines` control existed.
- `npm run verify`: passed lint, typecheck, 27 Vitest files with 126 tests, Prisma validation, and the Next.js production build.
- `npm run test:e2e`: 18 Playwright tests passed.
- Focused subway suite: toggle on/off, `aria-pressed`, device-local reload persistence, route visualization coexistence, and 390x844 mobile reachability passed.
- Independent review found and then verified the fix for blocked `localStorage` property access; no Critical or Important findings remain.
- Desktop control-state screenshot: `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ff8d5-e100-7570-ad57-fb48755260e4/picc-subway-desktop.png`.
- Mobile control-state screenshot: `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ff8d5-e100-7570-ad57-fb48755260e4/picc-subway-mobile.png`.

## Remaining verification boundary

The isolated local environment has no Google Maps API key, so screenshots prove the polished active control and responsive fit, while unit tests prove native `TransitLayer` attachment and cleanup. Actual subway geometry must be verified after deployment on the authenticated production map, where Google Maps configuration is present.
