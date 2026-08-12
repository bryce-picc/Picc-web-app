# Session: Verified contact creation and Contacts navigation

## Issue

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/155

## Branch

- `codex/155-contacts`

## Scope

- Make Contacts directly reachable as a section tab inside Accounts.
- Keep Home, Map, Accounts, Route, and Dashboard in persistent navigation.
- Keep Home accessible from the Profile/tools menu.
- Add one reusable contact-creation experience to the Contacts page.
- Create contacts through the existing external CRM boundary.
- Prevent account-scoped duplicates, preserve existing relationships, and verify the completed relationship before reporting success.
- Provide honest, retryable partial-failure behavior.

## Out Of Scope

- Task creation UI, which remains tracked by issue #36.
- Mobile bundle optimization, which remains tracked by issue #94.
- Remote branch and stale PR cleanup, which remains tracked by issue #39.
- Bulk imports, historical relation repair, CRM schema changes, production backfills, or destructive data operations.
- Publishing private workspace IDs, tokens, or tenant-specific operating details.

## Owned Paths

- `app/(main)/accounts/page.tsx`
- `app/(main)/contacts/**`
- `app/api/contacts/**`
- `components/crm/accounts-section-tabs.tsx`
- `components/crm/contact-create-flow.tsx`
- `components/layout/app-shell.tsx`
- `lib/contacts/contact-create-model*`
- `lib/server/contact-creation*`
- `lib/server/notion-contact-creation*`
- `lib/server/notion-live-crm.ts`
- `lib/validation/schemas.ts`
- focused tests and browser artifacts for the above paths
- `docs/superpowers/specs/2026-08-12-contact-creation-design.md`
- `docs/superpowers/plans/2026-08-12-contact-creation.md`
- `SESSION.md`

## Active PR Overlap Check

- PR #135 overlaps `components/mobile/account-detail-sheet.tsx`; this branch does not edit that path.
- PRs #144 and #82 were checked and do not own the implemented paths.

## Validation Plan

- Use RED-first unit and route tests for duplicate prevention, relationship preservation, verification, partial failure, retry, validation, and authorization.
- Run focused tests after each behavior slice.
- Run `npm run verify` under Node 22.
- Run browser tests for the Contacts page, Accounts tabs, persistent navigation, Profile menu, form states, and 390x844 mobile viewport.
- Use fakes or route interception for external writes during automated/browser validation. Do not create production contacts as test data.

## Production Boundary

- Live schema inspection was read-only and explicitly approved.
- No production CRM writes, schema changes, backfills, or destructive actions are authorized for validation.
