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
