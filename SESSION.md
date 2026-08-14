# Session: Issue 163 Mobile CRM Record Management

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/163
- Branch: `codex/163-contact-profiles`
- Base branch: `main` after the approved foundation release merged.
- PR: https://github.com/brycejohnson1417/Picc-web-app/pull/168

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
- Stacked on merged PR #167 for the shared action foundation.
- Latest `main` changes, including the territory drawing clearance fix, are integrated without modifying their behavior.

## Validation evidence

- `npm run verify` passed after integrating current `main` and both review passes: lint, typecheck, 39 Vitest files / 182 tests, Prisma validation, and production build.
- Full browser suite passed on an isolated port: `PICC_AGENT_DEV_PORT=3180 npx playwright test --workers=1` (29 tests).
- Focused API/domain suite passed: 8 files / 38 tests.
- Mobile browser proof covered favorite/profile editing, reminders through visible completion, save-to-phone vCard download, role-collision confirmation, and guarded maintenance dialogs.
- Review regressions cover full Notion relation pagination, role-preserving merges and retries, stale collision invalidation, API-aligned role controls, load-safe partial profile updates, metadata consolidation, and recoverable cross-system merge retries.
- UI evidence: `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/contact-profile-mobile.png`.

## Remaining verification boundary

- Production UI proof follows merge and deployment.
- Schema migration and user-triggered live CRM maintenance were approved before merge.
