# Session: Issue 161 Territory Save Clearance

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/161
- Draft PR: https://github.com/brycejohnson1417/Picc-web-app/pull/162
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

## Validation evidence

- RED: at 1440x800, the primary navigation began at y=704 while `Save Boundary` ended at y=821.5.
- GREEN: the focused Playwright suite passed all four checks covering real internal scroll movement with a stationary footer, tab-order keyboard save, mobile portrait, mobile landscape with at least a 44px usable form body, short desktop, and the reported 1800x1280 viewport.
- `npm run verify`: passed lint, typecheck, 27 Vitest files with 126 tests, Prisma validation, and the Next.js production build.
- `npm run test:e2e`: 22 Playwright tests passed.
- Read-only review found the initial landscape test allowed a collapsed scroll body; the strengthened test failed at 0px, the height-aware inset was corrected, and the focused four-viewport suite passed again.
- Desktop screenshot: `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ff906-4d75-7e53-80d1-bceaf818dc46/territory-save-desktop.png`.
- Mobile screenshot: `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ff906-4d75-7e53-80d1-bceaf818dc46/territory-save-mobile.png`.

## Remaining verification boundary

The local UI uses intercepted read and save responses and does not mutate production data. Production proof remains pending merge and deployment.
