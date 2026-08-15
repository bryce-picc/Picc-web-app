# Session: Issue 175 Safari Territory Header Clipping

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/175
- Branch: `codex/175-safari-territory-header`
- Draft PR: pending initial session commit

## Scope

- Keep the AppShell profile header and territory Map/List switch inside the visible viewport at the reported Safari-like desktop size.
- Preserve the map's remaining-height layout and fixed primary navigation.
- Add focused browser regression coverage and screenshot proof.

## Out of scope

- Google Maps provider, controls, routing, or territory-data behavior.
- API, persistence, schema, auth, environment, or production-data changes.
- Browser preference changes or a territory-toolbar redesign.
- Changes to `/Users/brycejohnson/Code/map-app`.

## Constraints and architecture check

- Surgical presentation fix against the existing `AppShell` and `TerritoryMobile` flex layout.
- No new state or service boundary.
- Keep the current mobile-first PWA shell and existing design-system spacing/control vocabulary.
- Preserve the unrelated untracked `.agents/account-detail-redirect-ai-tab.png`.
- Open PRs checked: #166, #144, #135, and #82. None owns the territory shell or territory E2E paths.

## Validation plan

- RED first: reproduce the 1226x768 reported Safari-like viewport and assert the profile header, Map/List switch, map, and primary navigation all fit within the viewport.
- Add a second short-desktop/zoom-resistant fit check if diagnosis confirms CSS-pixel scaling is involved.
- Re-run existing mobile portrait, landscape, territory-editor, and subway-control coverage.
- Run focused Playwright, `npm run verify`, and full `npm run test:e2e`.
- Capture final desktop and mobile screenshots and inspect them visually.

## Current state

Production Safari evidence confirms the profile header is present in the accessibility tree but visually clipped above the Map/List switch. Source diagnosis is in progress; no non-test source file has been edited.
