# Session: Issue 171 Territory Drawing Action Clearance

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/171
- Draft PR: https://github.com/brycejohnson1417/Picc-web-app/pull/172
- Branch: `codex/171-territory-drawing-actions`
- Worktree: `/Users/brycejohnson/Code/PICC-Web-App`

## Scope

- Keep `Finish Shape` and `Clear` fully visible and tappable above fixed mobile actions.
- Preserve the existing `Save Boundary` clearance from the primary bottom navigation.
- Add a phone-sized Playwright regression covering visibility, geometry, and interaction.

## Out of scope

- Territory geometry, persistence, permissions, or API changes.
- Primary map navigation redesign.
- Changes to `/Users/brycejohnson/Code/map-app`.

## Constraints

- Reproduce the clipping with a RED browser test before changing the component.
- Keep the fix localized to the existing mobile territory boundary sheet.
- Preserve portrait, landscape, keyboard, and desktop behavior.
- Run `npm run verify`, the focused territory E2E spec, and the full E2E suite before completion.

## Ownership and overlap

- Owned paths: `components/mobile/territory-boundary-sheet.tsx`, `tests/e2e/territory-boundary-editor.spec.ts`, browser proof artifacts, and `SESSION.md`.
- Open PRs were checked; none owns the territory boundary sheet or its E2E spec.
- The unrelated untracked `.agents/account-detail-redirect-ai-tab.png` is not part of this work.

## Validation plan

- RED: at 390x844, assert `Finish Shape` and `Clear` do not extend under the fixed Save footer and can receive pointer clicks.
- GREEN: run the focused territory boundary editor Playwright spec.
- Regression: run repository verification and the full Playwright suite.
- Visual: capture the corrected phone viewport with the drawing actions visible above bottom UI.

## Current state

RED reproduced the scrolling controls at y=81 instead of their original y=663. The fixed action footer is implemented and verified at portrait, landscape, short desktop, and reported desktop sizes. After rebasing onto current `main`, `npm run verify` passes with 159 unit tests and all 28 Playwright tests pass; PR review and merge remain.
