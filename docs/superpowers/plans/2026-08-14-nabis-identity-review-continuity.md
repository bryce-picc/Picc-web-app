# Nabis Identity Review Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Nabis sales current when CRM identity requires review, notify the configured administrator once, and provide a complete authenticated resolution workflow.

**Architecture:** Add a conflict decision/lifecycle module between the Notion adapter and Account ownership write, backed by existing notification/preference/audit models and a server-only email adapter. Run orders before optional retailer CRM mirroring, expose independent status, and extend the existing Nabis Settings panel with alert configuration and conflict resolution.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma/PostgreSQL, Vitest, Playwright, Tailwind/shadcn-style UI, server-side Resend REST adapter.

## Global Constraints

- No fuzzy automatic merges or destructive deletion.
- Ambiguous identity never writes ownership.
- Email failure never interrupts order ingestion.
- Configuration and resolution are fully usable from authenticated UI.
- No production test records; browser verification uses interception.
- RED-first tests precede every production-code behavior.
- Production email configuration and any one-time data repair remain approval-lane actions.

---

### Task 1: Conflict decision and persistence lifecycle

**Files:**
- Create: `lib/server/nabis-identity-conflicts.ts`
- Create: `lib/server/nabis-identity-conflicts.test.ts`
- Modify: `lib/server/nabis-sync.ts`

**Interfaces:**
- Produces: `assessNabisIdentityLink(input): "LINK" | "REVIEW"`
- Produces: `recordNabisIdentityConflict(input): Promise<ConflictRecordResult>`
- Consumes: Notion `reviewRequired`, current page owner, incoming Account/source identifiers.

- [ ] **Step 1: Write failing pure decision tests**

```ts
expect(assessNabisIdentityLink({ reviewRequired: true, incomingAccountId: 'a', ownerAccountId: null })).toBe('REVIEW');
expect(assessNabisIdentityLink({ reviewRequired: false, incomingAccountId: 'a', ownerAccountId: 'b' })).toBe('REVIEW');
expect(assessNabisIdentityLink({ reviewRequired: false, incomingAccountId: 'a', ownerAccountId: 'a' })).toBe('LINK');
```

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/server/nabis-identity-conflicts.test.ts`
Expected: FAIL because the module/exports do not exist.

- [ ] **Step 3: Implement the minimal decision and deterministic conflict key**

```ts
export function assessNabisIdentityLink(input: LinkAssessmentInput) {
  return input.reviewRequired || (input.ownerAccountId && input.ownerAccountId !== input.incomingAccountId) ? 'REVIEW' : 'LINK';
}
```

Use a stable hash of org, incoming Account, candidate page, and reason for `conflictKey`.

- [ ] **Step 4: Write and run RED persistence tests**

Inject a repository interface and assert first detection creates one OPEN notification, repeated detection updates occurrence metadata, and resolved-then-reintroduced creates a new lifecycle generation.

Run: `npm test -- lib/server/nabis-identity-conflicts.test.ts`
Expected: FAIL on missing persistence implementation.

- [ ] **Step 5: Implement notification lifecycle and integrate caller**

Before assigning a candidate page ID, query the organization-scoped current owner. For REVIEW, persist/update the conflict, do not write `notionPageId`, and continue processing. For LINK, retain the existing write and identity mapping behavior.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- lib/server/nabis-identity-conflicts.test.ts lib/server/notion-crm-sync.test.ts lib/server/nabis-sync.test.ts`
Expected: PASS.

Commit: `fix: preserve identity ownership on ambiguous Nabis matches`

### Task 2: Idempotent email adapter and recipient preferences

**Files:**
- Create: `lib/server/transactional-email.ts`
- Create: `lib/server/transactional-email.test.ts`
- Modify: `lib/server/nabis-identity-conflicts.ts`
- Modify: `lib/server/nabis-identity-conflicts.test.ts`

**Interfaces:**
- Produces: `sendIdentityConflictEmail(input): Promise<EmailDeliveryResult>`
- Produces: `resolveIdentityConflictRecipient(orgId): Promise<RecipientResolution>`
- Consumes: `RESEND_API_KEY`, configured sender, `EXCEPTIONS` preference, default admin email.

- [ ] **Step 1: Write failing adapter tests**

Assert missing transport returns `{ status: "UNAVAILABLE" }`, a configured send includes deterministic idempotency header, non-2xx responses return `{ status: "FAILED" }`, and no secret enters logs/output.

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/server/transactional-email.test.ts`
Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement server-only fetch adapter**

POST minimal HTML/text content to the provider API. Return provider-neutral `SENT`, `FAILED`, or `UNAVAILABLE`; never throw raw provider content through the sync path.

- [ ] **Step 4: Write failing lifecycle email tests**

Assert only a newly opened lifecycle invokes the sender, repeat detections do not, and delivery failure updates conflict metadata without rejecting conflict persistence.

- [ ] **Step 5: Implement recipient resolution and lifecycle send**

Use the authenticated administrator's saved `EXCEPTIONS` preference. Fall back to configured administrator email and the most recent matching organization session for in-app targeting. GET remains read-only.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- lib/server/transactional-email.test.ts lib/server/nabis-identity-conflicts.test.ts`
Expected: PASS.

Commit: `feat: alert administrators to identity review conflicts`

### Task 3: Sales-first sync and truthful freshness

**Files:**
- Modify: `lib/server/nabis-sync.ts`
- Modify: `lib/server/nabis-sync.test.ts`
- Modify: `lib/server/nabis-sync-status.ts`
- Create or modify: `lib/server/nabis-sync-status.test.ts`
- Modify: `lib/dashboard/nabis-server.ts`

**Interfaces:**
- Produces: independent `{ orders, retailers }` combined result.
- Produces: `lastSuccessfulSyncAt` and separate `lastAttemptAt` semantics.

- [ ] **Step 1: Write failing sequencing test**

Inject/drive a combined runner where order ingestion succeeds and retailer CRM fails; assert order completion occurs first and remains recorded.

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/server/nabis-sync.test.ts`
Expected: FAIL because retailer currently runs first.

- [ ] **Step 3: Reorder the combined sync and preserve independent outcomes**

Call `syncNabisOrdersCore` before `syncNabisRetailersCore`. Keep the global lease and module checkpoints. A handled review does not throw; a real retailer failure occurs only after order success.

- [ ] **Step 4: Write failing freshness test**

Given an ERROR checkpoint updated today and an earlier successful run, expect last success to use the successful run and last attempt to use the failed checkpoint.

- [ ] **Step 5: Implement truthful status lookup**

Query recent successful module runs as fallback and expose failed attempt timestamps separately. Never fall back from an ERROR checkpoint to its `updatedAt` as a successful sync.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- lib/server/nabis-sync.test.ts lib/server/nabis-sync-status.test.ts lib/dashboard/nabis-refresh.test.ts`
Expected: PASS.

Commit: `fix: keep Nabis sales current through CRM failures`

### Task 4: Authenticated conflict settings API

**Files:**
- Create: `app/api/settings/nabis-identity-conflicts/route.ts`
- Create: `app/api/settings/nabis-identity-conflicts/preferences/route.ts`
- Create: `app/api/settings/nabis-identity-conflicts/[conflictId]/resolve/route.ts`
- Create: `app/api/settings/nabis-identity-conflicts/[conflictId]/retry-email/route.ts`
- Create: `lib/server/nabis-identity-conflict-admin.ts`
- Create: `lib/server/nabis-identity-conflict-admin.test.ts`

**Interfaces:**
- Produces: `getIdentityConflictAdminData(orgId, actor)`.
- Produces: `saveIdentityConflictPreference(input)`.
- Produces: `resolveIdentityConflict(input)` with `KEEP_CURRENT_OWNER | TRANSFER_TO_INCOMING`.
- Produces: `retryIdentityConflictEmail(input)`.

- [ ] **Step 1: Write failing admin-domain tests**

Assert org scoping, stale-version rejection, already-resolved idempotency, keep-owner mapping, transfer transaction, and audit metadata.

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/server/nabis-identity-conflict-admin.test.ts`
Expected: FAIL because the admin module does not exist.

- [ ] **Step 3: Implement transactional admin functions**

Re-read conflict metadata and both Accounts, verify ownership, update identity mappings/ownership atomically, mark resolved, and append audit event. Return fresh queue readback.

- [ ] **Step 4: Add guarded routes with Zod validation**

Admin/Ops/Finance GET; Admin preference/retry; Admin/Ops resolution. Return 409 for stale version/ownership changes and 404 for cross-org IDs.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- lib/server/nabis-identity-conflict-admin.test.ts && npm run typecheck`
Expected: PASS.

Commit: `feat: add authenticated identity conflict controls`

### Task 5: Complete Nabis Settings review UI

**Files:**
- Modify: `components/settings/nabis-sync-admin-panel.tsx`
- Create: `components/settings/nabis-identity-review-panel.tsx`
- Create: `components/settings/nabis-identity-review-panel.test.tsx` only if the existing Vitest environment supports DOM; otherwise cover domain/API with Playwright.
- Modify: `DESIGN-SYSTEM.md` only if a reusable conflict-state pattern is missing.

**Interfaces:**
- Consumes: Settings conflict GET/PATCH/POST routes.
- Produces: alert settings, queue, resolution modal, retry email, and fresh readback.

- [ ] **Step 1: Write failing browser E2E skeleton**

Intercept the conflict APIs and assert the Nabis Settings panel exposes recipient input, open conflict details, canonical-owner choices, disabled-until-confirmed resolve action, and resolved history.

- [ ] **Step 2: Run RED**

Run the focused Playwright test.
Expected: FAIL because the Identity Review section is absent.

- [ ] **Step 3: Implement the thin panel**

Use existing Button/Input/Badge/Dialog patterns and design tokens. Implement loading skeleton, empty, API error/retry, open, delivery-failed, resolving, resolved, validation, saved, and transport-unavailable states.

- [ ] **Step 4: Run GREEN across desktop/mobile/keyboard**

Run the focused Playwright test at desktop and mobile sizes. Verify keyboard focus/confirmation and no overlap with fixed navigation.

- [ ] **Step 5: Commit**

Commit: `feat: add Nabis identity review workspace`

### Task 6: Full verification, review, deploy, and production proof

**Files:**
- Modify: `SESSION.md`
- Modify: draft PR #165 body/status/comments.

**Interfaces:**
- Consumes: completed code and tests.
- Produces: validated PR, deployed production behavior, and read-only proof.

- [ ] **Step 1: Run static and full automated validation**

Run: `npm run verify`
Expected: lint, typecheck, unit tests, Prisma validation, and build all PASS.

Run: `npm run test:e2e`
Expected: all Playwright tests PASS.

- [ ] **Step 2: Self-review the complete diff**

Check correctness, auth/org scoping, email idempotency, secrets, UI state completeness, test quality, and file-count coherence. Fix findings with new RED tests where behavior changes.

- [ ] **Step 3: Capture browser evidence**

Save desktop/mobile screenshots and a short interaction recording of configure → review → resolve using intercepted data.

- [ ] **Step 4: Update SESSION and PR proof**

Document RED/GREEN commands, full validation, screenshots/video, remaining environment boundary, and changed-file scope.

- [ ] **Step 5: Complete approval-lane configuration if required**

Post `@bryce approval requested: configure the production transactional-email provider and sender required for identity-conflict alerts.` on PR #165 only if production transport is absent. Do not expose secrets.

- [ ] **Step 6: Merge/deploy and verify**

After required approval and green checks, merge PR #165, verify the Vercel production deployment, exercise only read-only/live-safe UI paths, run an authorized sales refresh, and read back independent module timestamps/counts. Do not create test records.

- [ ] **Step 7: Handle the existing conflict safely**

Identify exact records read-only. Present any proposed one-time ownership change before mutation. If no production write is approved, leave the review item open and report the precise boundary while confirming sales ingestion is healthy.
