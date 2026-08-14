# Session: Issue 163 Follow-up Intelligence and Daily Briefing

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/163
- Branch: `codex/163-followup-intelligence`
- Base branch: `main` after the approved Gmail release merged.
- PR: https://github.com/brycejohnson1417/Picc-web-app/pull/170

## Scope

- Add user-configurable follow-up defaults and daily briefing preferences in Settings.
- Add deterministic, user-scoped briefing generation and scheduled email delivery.
- Add a Home relationship-resurfacing workspace with transparent reasons and explicit next actions.
- Replace account metric placeholders only where a trustworthy current source exists.

## Out of scope

- Device call/text history ingestion.
- Generated prose or autonomous outbound sales messages.
- Changes to `/Users/brycejohnson/Code/map-app`.
- Invented Pay Days Avg values without a trustworthy source.

## Architecture and safety

- Keep ranking and briefing selection deterministic and testable; no LLM dependency.
- Scope preferences, reminders, mailbox activity, and delivery to the authenticated user and tenant.
- Use an authenticated cron route, an hourly GitHub Actions trigger, per-user local send time, delivery idempotency, and the existing email adapter.
- Never invent unavailable account metrics; expose only computed values from existing read models.

## Validation

- Pre-rebase `npm run verify` passed (42 test files / 176 tests, lint, typecheck, Prisma validation, and production build).
- Pre-rebase full Playwright suite passed (29 tests); focused contact workspace suite passed (6 tests).
- Current-main verification will be rerun before merge.
- Manual mobile browser verification covered Home resurfacing reasons/actions, clipboard copy confirmation, Settings defaults/debrief controls, compact sync disclosure, priority account fields, and unobstructed letter rail.

## Browser evidence

- `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/resurfaced-contacts-mobile.png`
- `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/follow-up-settings-mobile.png`
- `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/daily-debrief-settings-mobile.png`
- `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/accounts-mobile-priority-fields.png`

## Remaining deployment boundary

- The scoped migration, cron secret, and outbound email configuration were approved for release.
- Production delivery proof depends on the required provider and scheduler secrets being configured.
