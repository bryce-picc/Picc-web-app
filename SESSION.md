# Session: Issue 178 Contacts Light Surfaces

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/178
- Branch: `codex/178-contacts-light-surfaces`

## Scope

- Keep Contacts directory records, table headers, and mobile cards on light operational surfaces even when the device prefers dark appearance.
- Preserve immediate visibility of contact name, account, email, phone, status, and email/text/call actions.
- Correct the same shared CRM table contradiction for Accounts so both directories follow the app design system.
- Add browser regression coverage for dark device preferences.

## Out of scope

- Contact records, Gmail behavior, follow-up logic, schema, auth, provider configuration, or production data.
- Contact profile and Account Details redesigns.
- Changes to `/Users/brycejohnson/Code/map-app`; reusable Trap Map product ideas will be reported separately.

## Constraints and architecture check

- Surgical presentation fix in the existing shared `AdvancedDataTable`; no new state or service boundary.
- Follow `DESIGN-SYSTEM.md`: compact white/slate operational surfaces, clear status, and first-viewport actions.
- No new dependencies.
- Open PRs checked: #166, #144, #135, and #82. None actively owns the runtime paths in this issue; #144 is a stale broad architecture proposal that conflicts with the current canonical app direction.

## Validation plan

- RED first: emulate a dark device preference in the Contacts browser flow and assert the rendered row/card/header backgrounds stay light with dark readable text.
- Verify email, text, and call actions remain visible and interactive.
- Run focused Playwright coverage, `npm run verify`, and full `npm run test:e2e`.
- Capture mobile and desktop screenshot proof and inspect it visually.

## Current state

Issue claimed; implementation has not started.
