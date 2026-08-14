# Session: Issue 163 Mobile CRM Record Management

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/163
- Branch: `codex/163-contact-profiles`
- Base branch: `main` after the approved foundation release merged.
- Draft PR: https://github.com/brycejohnson1417/Picc-web-app/pull/168

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
- Checked open PRs #167, #166, #144, #135, and #82 before source edits. The remaining PRs do not actively own the focused paths or are stale/documentation-only.

## Validation evidence

- Baseline inherited from #167: `npm run verify` passed (31 Vitest files / 141 tests plus lint, typecheck, Prisma validation, and build); `npm run test:e2e` passed (25 tests).
- `npm run verify` passed: lint, typecheck, 35 Vitest files / 158 tests, Prisma validation, and production build.
- `npm run test:e2e` passed: 26 Chromium tests.
- Focused API/domain suite passed: 8 files / 38 tests.
- Mobile browser proof covered favorite/profile editing, reminders through visible completion, save-to-phone vCard download, role-collision confirmation, and guarded maintenance dialogs.
- UI evidence: `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/contact-profile-mobile.png`.

## Remaining verification boundary

- Production UI proof follows merge and deployment.
- Schema migration and user-triggered live CRM maintenance were approved before merge.
