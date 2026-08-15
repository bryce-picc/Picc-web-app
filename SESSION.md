# Session: Issue 175 Safari Territory Header Clipping

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/175
- Branch: `codex/175-safari-territory-header`
- Draft PR: https://github.com/brycejohnson1417/Picc-web-app/pull/176

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

RED reproduced the asymmetric desktop shell contract: the AppShell header started at `y=0` even though the shell height already reserved 24px. The fix moves that allowance into symmetric desktop `py-3` and lets the inner shell fill the padded content box; mobile remains edge-to-edge.

- Focused Safari viewport regressions: 2 passed at 1226x768 and zoom-equivalent 981x614.
- Complete territory regression set: 12 passed serially. One parallel subway reload timed out once, then passed 4/4 in isolation and 12/12 in the serial territory run.
- `npm run verify`: passed lint, typecheck, 46 Vitest files / 202 tests, Prisma validation, and production build.
- Full E2E: 35 passed serially on a clean Playwright-owned server.
- Real-browser Map to List to Map interaction passed with current local territory data.
- Browser bounds at 981x614: header top 12, header bottom 66.5, primary navigation top 518, navigation bottom 614, `scrollY` 0.
- Mobile bounds at 390x844: header top 0, navigation bottom 844, `scrollY` 0.
- Screenshot proof: `test-results/territory-shell-fit-keeps--aa8a8-below-Safari-browser-chrome-chromium/territory-shell-safari-desktop.png` and `test-results/territory-shell-fit-keeps--8d94a-lent-short-desktop-viewport-chromium/territory-shell-safari-zoom-equivalent.png`.
