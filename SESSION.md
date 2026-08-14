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
- Use an authenticated cron route, an hourly GitHub Actions trigger, per-user local send time, delivery idempotency, and the existing email adapter; GitHub Actions supplies the wake-up because the current Vercel plan rejects hourly Cron schedules.
- Never invent unavailable account metrics; expose only computed values from existing read models.

## Validation

- Current-main `npm run verify` passed: lint, typecheck, 46 Vitest files / 202 tests, Prisma validation, and production build.
- Full browser suite passed on an isolated port: `PICC_AGENT_DEV_PORT=3170 npx playwright test --workers=1` (32 tests).
- Manual mobile browser verification covered Home resurfacing reasons/actions, clipboard copy confirmation, Settings defaults/debrief controls, compact sync disclosure, priority account fields, and unobstructed letter rail.

## Browser evidence

- `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/resurfaced-contacts-mobile.png`
- `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/follow-up-settings-mobile.png`
- `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/daily-debrief-settings-mobile.png`
- `/Users/brycejohnson/.codex/visualizations/2026/08/13/019ffc03-da13-7281-ae9a-5216d1b9437f/accounts-mobile-priority-fields.png`

## Remaining deployment boundary

- The scoped migration, cron secret, and outbound email configuration were approved for release.
- Production delivery proof depends on the required provider and scheduler secrets being configured.
- The first Vercel preview rejected the hourly `vercel.json` Cron schedule and linked to Vercel Cron plan limits.
- The final implementation uses an hourly GitHub Actions schedule to call the same authenticated endpoint. The repository `CRON_SECRET` and the app deployment `CRON_SECRET` must match before scheduled delivery is enabled.
