# Session: Issue 163 Gmail Contact Activity

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/163
- Branch: `codex/163-gmail-contact-activity`
- Base branch: `main` after the approved contact-profile release merged.
- PR: https://github.com/brycejohnson1417/Picc-web-app/pull/169

## Scope

- Add per-rep read-only Gmail OAuth connection and explicit disconnect controls in Settings.
- Match Gmail activity and suggested contacts to CRM contacts through explicit provider boundaries.
- Show email activity and Gmail thread links on contact profiles.
- Offer reviewable suggested contacts with prefilled quick add.

## Out of scope

- Device call/text history ingestion.
- Daily scheduled briefing and follow-up intelligence, which remain in the next release.
- Production mailbox or CRM mutations during verification.
- Changes to `/Users/brycejohnson/Code/map-app`.

## Constraints

- Preserve tenant/user scoping, least-privilege Gmail scopes, encrypted refresh tokens, and explicit disconnect behavior.
- Keep CRM creation behind the existing guarded contact workflow and overwrite warnings.
- Use RED-first deterministic tests and real mobile browser verification.

## Ownership and overlap

- Owned paths: focused mailbox adapter/routes/UI, contact timeline integration, tests, one scoped migration, and `SESSION.md`.
- Rebased onto merged PR #168 and current `main`; the hardened contact lifecycle behavior remains authoritative.
- No production secrets or data are changed during local verification.

## Validation evidence

- Pre-rebase validation passed: lint, typecheck, 38 Vitest files / 167 tests, Prisma validation, production build, and 28 Chromium tests.
- Focused mobile browser flows passed for suggested-contact review and prefilled quick add, connected/disconnected Settings states, explicit disconnect confirmation, and contact email-thread links.
- Current-main verification will be rerun before merge.

## Remaining deployment boundary

- The scoped migration and production OAuth secrets/redirect configuration were approved for release.
- Production OAuth consent and thread readback require configured Google OAuth values and a rep completing the browser consent flow.
