# Session: Issue 161 Territory Save Clearance

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/161
- Draft PR: pending initial branch publication
- Branch: `codex/161-territory-save-clearance`

## Scope

- Keep the territory boundary editor fully above the fixed bottom navigation.
- Keep the editor body independently scrollable when its point list exceeds the available height.
- Keep the `Save Boundary` footer visible, keyboard reachable, and clickable at short desktop and mobile viewports.
- Add focused regression coverage for the reported overlap.

## Out of scope

- Boundary persistence, API, database, schema, authentication, authorization, or production-data changes.
- Map-provider, map-control, or primary-navigation redesign.
- Changes to `/Users/brycejohnson/Code/map-app`.

## Constraints

- Reuse the existing `--picc-bottom-nav-clearance` design token.
- Preserve the current Google Maps boundary editing workflow and fixed primary navigation.
- Use a failing browser behavior test before implementation.
- Run `npm run verify` and `npm run test:e2e` before completion.
- Capture desktop and mobile user-visible evidence.

## Ownership and overlap

- Owned paths: `components/mobile/territory-boundary-sheet.tsx`, focused territory editor tests, `SESSION.md`, and UI evidence.
- Open PRs #160, #144, #135, and #82 were checked.
- PR #160 owns subway/map-overlay paths but does not own the boundary sheet.
- PRs #135 and #82 do not overlap.
- PR #144 is a stale broad monorepo migration that conflicts with the canonical architecture and declares no owned paths.

## Validation plan

- RED: reproduce the footer/navigation intersection with a populated editor at the reported short viewport.
- GREEN: verify the save footer stays above the primary navigation while the editor body scrolls.
- Exercise the save control with mouse and keyboard.
- Check mobile portrait, mobile landscape, short desktop, and standard desktop viewport fit.
- Run `npm run verify` and the complete Playwright suite.

## Remaining verification boundary

Implementation and deployment evidence pending.
