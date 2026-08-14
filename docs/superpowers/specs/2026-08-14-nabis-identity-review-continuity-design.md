# External Identity Review and Sales-Sync Continuity Design

## Summary

An ambiguous external-record match must not be treated as confirmed identity. When review is required, the application will preserve existing ownership, continue sales-data ingestion, create one actionable review item, and notify the configured administrator without exposing private source data outside authenticated surfaces.

## Goals

- Keep sales-data ingestion independent from optional CRM mirroring.
- Preserve existing external-record ownership until an authorized user resolves ambiguity.
- Deduplicate review items and email alerts.
- Make notification configuration, review, and resolution fully usable from the authenticated Settings UI.
- Distinguish successful sync timestamps from failed attempts.
- Keep every resolution organization-scoped and audited.

## Non-goals

- Fuzzy automatic merges.
- Destructive account or external-record deletion.
- A general-purpose messaging system.
- Unrelated sync or application-shell refactors.

## Domain Boundaries

External identity matching produces three explicit outcomes:

- `linked`: exact or same-owner identity; the link may be persisted.
- `review-required`: ambiguous or differently owned identity; no ownership write occurs.
- `failed`: provider operation failed; the failure is recorded without undoing completed sales ingestion.

Before any ownership write, the server verifies the current organization-scoped owner. The database uniqueness constraint remains the final invariant rather than the first conflict detector.

Each unresolved conflict has a deterministic key and lifecycle state. Repeated detection updates the existing open item instead of creating duplicate records or emails. Resolution records the selected canonical account, actor, timestamp, and audit reference.

## Sync Sequencing

The combined refresh becomes sales-first:

1. Acquire the existing sync lease.
2. Ingest recent orders.
3. Refresh retailer/account data and perform optional CRM mirroring.
4. Report the independent outcome of each module.

A review-required outcome is handled business state, not a crashed sync. A provider failure may still fail its own module, but completed sales ingestion remains successful and visible.

Last-success timestamps come only from successful runs. Failed-attempt timestamps are reported separately and are never labeled as synced.

## Notification Design

Use existing notification, preference, identity, and audit boundaries where practical. A server-only email adapter keeps provider details out of domain logic.

- The configured administrator receives one opening email per conflict lifecycle.
- Delivery uses a deterministic idempotency key.
- Delivery failure is visible in-app and never interrupts sales ingestion.
- The Settings UI provides validated recipient and channel controls.
- Default values may be derived from existing administrator configuration, but GET requests never write preferences.
- Production provider configuration remains approval-lane work.

Email content includes only the minimum context needed to sign in and review the conflict. Private source details remain inside the authenticated application.

## Browser UI

Extend the existing sync Settings surface with two complete sections.

### Alert settings

- Validated recipient input.
- Email and in-app toggles.
- Transport readiness without revealing secrets.
- Save, reset, loading, validation, saved, and unavailable states.

### Identity review

- Open, failed-delivery, and resolved counts.
- Open conflicts first with reason, occurrence count, freshness, and both candidate records.
- Resolved history below the active queue.
- Loading skeleton, actionable error, and useful empty state.
- An explicit confirmation flow showing before/after ownership.
- Transfer is never the default choice.

Admin and Ops may resolve conflicts. Finance may inspect the queue. Only Admin may change external notification settings.

## Resolution Safety

- Re-read both records and current ownership inside the transaction.
- Reject stale UI versions and cross-organization identifiers.
- Apply ownership and identity-mapping changes atomically.
- Record actor, decision, and before/after state in the audit log.
- Return fresh readback so the UI reflects persisted truth.

## Test Strategy

Use RED-first tests for:

- ambiguous matches never writing ownership;
- exact and same-owner matches linking normally;
- conflict and email deduplication;
- email failure isolation;
- sales ingestion completing before optional CRM failure;
- last-success timestamp semantics;
- transactional, organization-scoped resolution;
- API authorization and validation;
- UI loading, empty, open, resolved, error, and success states.

Browser tests use intercepted deterministic responses and create no production test records. The core flow is configure recipient → inspect conflict → confirm ownership → resolve → verify history.

Run `npm run verify` and `npm run test:e2e` before completion.

## Rollout Boundary

Code may merge only after automated validation, browser proof, self-review, and any required approval-lane configuration confirmation. Production verification uses existing records and read-only status checks. Any one-time data repair requires exact-record review and separate explicit approval before mutation.

## Alternatives Considered

- Silently skipping ambiguous links keeps sync running but hides required work.
- Automatically merging candidates reduces clicks but risks corrupting identity.
- The selected approach combines safe review state, idempotent notification, explicit browser resolution, and sales-first sequencing.
