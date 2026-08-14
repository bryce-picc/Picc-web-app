# Session: Issue 163 Mobile CRM Record Management

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/163
- Branch: `codex/163-contact-profiles`
- Base branch: `codex/163-contact-foundation`
- Draft PR: pending

## Scope

- Improve mobile CRM record-management usability through existing app boundaries.
- Add safe, explicit controls for supported record metadata and maintenance workflows.
- Add focused deterministic and mobile-browser coverage.

## Out of scope

- New provider integrations, device-history ingestion, and scheduled reporting.
- Production-data changes during verification.
- Changes to `/Users/brycejohnson/Code/map-app`.

## Constraints

- Preserve the current PWA shell, tenant scope, permissions, and explicit external-service boundaries.
- Use RED-first tests for behavior changes.
- Run `npm run verify` and `npm run test:e2e`.
- Capture mobile browser proof for changed UI flows.

## Ownership and overlap

- Owned paths: focused mobile CRM UI and domain/server boundaries, tests, `SESSION.md`, and UI evidence.
- Stacked on draft PR #167 for the shared action foundation.
- Open PR overlap check pending before source edits.

## Validation evidence

- Baseline inherited from #167: `npm run verify` passed (31 Vitest files / 141 tests plus lint, typecheck, Prisma validation, and build); `npm run test:e2e` passed (25 tests).
- Slice-specific RED/GREEN and browser evidence pending.

## Remaining verification boundary

- Production UI proof follows merge and deployment.
