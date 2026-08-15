# Session: Issue 173 Territory Editor Minimization

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/173
- Draft PR: https://github.com/brycejohnson1417/Picc-web-app/pull/174
- Branch: `codex/173-territory-editor-minimize`
- Design: `docs/superpowers/specs/2026-08-14-territory-editor-minimize-design.md`
- Plan: `docs/superpowers/plans/2026-08-15-territory-editor-minimize.md`

## Scope

- Add a visible minimize control to the territory boundary editor.
- Collapse to a one-row drawing bar above primary navigation.
- Keep map-tap drawing active and preserve the entire unsaved draft.
- Keep point count, Undo, and Expand usable while minimized.
- Add mobile browser coverage for drawing, undo, and restore.

## Out of scope

- Draggable or resizable sheets.
- Persisting minimized state across editor sessions.
- Territory API, geometry, persistence, or navigation changes.
- Changes to `/Users/brycejohnson/Code/map-app`.

## Constraints

- RED-first browser test before production code.
- Local presentation state only; do not duplicate territory draft state.
- Start each newly opened editor expanded.
- Preserve the fixed Finish, Clear, and Save action footer when expanded.
- Keep the unrelated untracked `.agents/account-detail-redirect-ai-tab.png` untouched.

## Validation plan

- At 390x844, minimize and verify the compact bar clears the map and bottom navigation.
- While minimized, tap the map, observe point-count growth, Undo, and observe the count revert.
- Expand and verify draft fields, points, drawing mode, and fixed actions are preserved.
- Run focused territory Playwright, `npm run verify`, and full E2E.

## Current state

Written design approved by the user. Implementation plan is ready; production code has not been changed.
