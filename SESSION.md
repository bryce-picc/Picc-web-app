# Session: Issue 163 Mobile CRM UI Foundation

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/163
- Branch: `codex/163-contact-foundation`
- Draft PR: pending

## Scope

- Improve reusable mobile CRM status and navigation components.
- Improve readability and interaction consistency across related CRM views.
- Add focused regression coverage for the changed user flows.

## Out of scope

- Database, authentication, permissions, secrets, external integrations, and production-data changes.
- Changes to `/Users/brycejohnson/Code/map-app`.

## Constraints

- Preserve the current PWA shell and server boundaries.
- Use RED-first tests for behavior changes.
- Run `npm run verify` and `npm run test:e2e`.
- Capture mobile browser proof for changed UI flows.

## Ownership and overlap

- Owned paths: shared CRM presentation components, affected mobile CRM views, focused tests, `SESSION.md`, and UI evidence.
- A fresh open-PR overlap check is required before source edits.

## Validation evidence

- Baseline: 28 Vitest files and 134 tests passed under Node 22.22.0.
- Pending focused RED/GREEN tests and browser verification.

## Remaining verification boundary

- Production UI proof follows merge and deployment.
