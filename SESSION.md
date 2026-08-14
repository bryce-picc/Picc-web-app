# Session: Issue 164 Nabis Identity Review Continuity

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/164
- Draft PR: https://github.com/brycejohnson1417/Picc-web-app/pull/165
- Branch: `codex/164-nabis-identity-review`
- Worktree: `/Users/brycejohnson/Code/PICC-Web-App-worktrees/issue-164-nabis-identity-review`

## Scope

- Preserve canonical Notion page ownership when Nabis identity matching is ambiguous.
- Keep recent order ingestion independent from optional CRM mirroring failures.
- Create deduplicated, auditable identity-review notifications.
- Email the configured administrator once per newly opened conflict.
- Add complete Settings UI for recipient configuration, open/resolved review items, and explicit resolution.
- Correct last-success and failed-attempt status semantics.

## Out of scope

- Fuzzy automatic account merges.
- Destructive Account or Notion page deletion.
- Unreviewed production data repair.
- Changes to `/Users/brycejohnson/Code/map-app`.
- Unrelated Nabis exception workflows or application-shell refactors.

## Constraints

- Use RED-first tests for every behavior change.
- Keep Notion and email behind server adapters.
- Reuse existing notification, preference, identity, and audit models unless tests prove a schema addition unavoidable.
- All configuration and resolution actions must be usable from the authenticated browser UI.
- Production email-provider or environment changes require approval-lane confirmation on PR #165.
- Run `npm run verify` and browser E2E before completion.

## Ownership and overlap

- Owned paths: `lib/server/nabis-sync*`, `lib/server/notion-crm-sync*`, identity-conflict and email modules, `app/api/settings/nabis-*/**`, `components/settings/nabis-sync-admin-panel.tsx`, focused tests, `docs/superpowers/**`, and `SESSION.md`.
- PR #135 was checked; this branch avoids its separate account-detail email workflow.
- PR #144 was checked; this work follows the canonical current root-app architecture.
- The branch is `parallel:exclusive` because sync sequencing and identity ownership are shared production behavior.

## Validation plan

- Unit/domain: collision handling, exact matches, deduplication, email idempotency, order continuity, last-success semantics, resolution transaction.
- API/component: authorization, validation, preference persistence, loading/error/empty/open/resolved states.
- Browser: configure recipient, inspect a deterministic intercepted conflict, resolve it, and verify status/readback without creating production test data.
- Static/full: `npm run verify` and `npm run test:e2e`.

## Current state

Design approved in chat. Written specification is pending user review; implementation has not started.
