# Verified Contact Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Contacts a clear tab inside the Accounts section and provide an account-scoped, duplicate-safe contact form whose external CRM relationship is freshly verified before success.

**Architecture:** A pure orchestration service owns contact dedupe, creation, relationship repair, and verification through a narrow adapter interface. A current-version Notion adapter implements that interface behind the server boundary. Route handlers map typed outcomes to HTTP, while one reusable client flow serves the Contacts page and account-detail entry points.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS 4, Zod, Vitest, Playwright, Notion API `2026-03-11`.

## Global Constraints

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/155
- Work only on `codex/155-contacts`; never edit `main` or the user's Microbar branch.
- Do not create production contacts during tests or browser verification.
- Do not publish workspace IDs, tokens, raw external payloads, or tenant-specific operating intelligence.
- No external CRM schema changes, bulk imports, historical repairs, production backfills, or destructive writes.
- Keep Home, Map, Accounts, Route, and Dashboard in persistent navigation; also expose Home in Profile/tools.
- Add Accounts and Contacts as section tabs, and keep the persistent Accounts destination active on both routes.
- Use RED-first tests for every new behavior and run under Node 22.
- Preserve unrelated files and the user's untracked screenshot in the original checkout.

---

### Task 1: Contact creation domain orchestration

**Files:**
- Create: `lib/server/contact-creation.ts`
- Test: `lib/server/contact-creation.test.ts`

**Interfaces:**
- Produces: `CreateContactInput`, `ContactRecord`, `ContactCreationOutcome`, `ContactCreationAdapter`, `createVerifiedContact(input, adapter)`, and `retryVerifiedContactLink(input, adapter)`.
- Consumes: no framework or HTTP types; this unit stays deterministic and adapter-driven.

- [ ] **Step 1: Write failing tests for duplicate prevention and verified creation**

```ts
it('returns an existing verified contact for the same normalized name and account', async () => {
  const adapter = fakeAdapter({ existing: contact({ name: 'Maya  Chen' }) });
  const result = await createVerifiedContact(input({ name: ' maya chen ' }), adapter);
  expect(result.status).toBe('existing_verified');
  expect(adapter.createContact).not.toHaveBeenCalled();
});

it('creates and verifies a contact when the account has no normalized-name match', async () => {
  const adapter = fakeAdapter({ existing: null, verify: true });
  const result = await createVerifiedContact(input(), adapter);
  expect(result.status).toBe('created_verified');
  expect(adapter.createContact).toHaveBeenCalledTimes(1);
  expect(adapter.ensureAccountContact).toHaveBeenCalledWith('account-page', 'contact-page');
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run lib/server/contact-creation.test.ts`

Expected: FAIL because `contact-creation.ts` does not exist.

- [ ] **Step 3: Implement the minimal typed orchestration**

```ts
export type ContactCreationOutcome =
  | { status: 'created_verified' | 'existing_verified'; contact: ContactRecord; accountPageId: string }
  | { status: 'partial_relation'; contact: ContactRecord; accountPageId: string; retry: { contactPageId: string; accountPageId: string } };

export interface ContactCreationAdapter {
  requireAccount(accountPageId: string): Promise<void>;
  findContact(accountPageId: string, normalizedName: string): Promise<ContactRecord | null>;
  createContact(input: CreateContactInput): Promise<ContactRecord>;
  ensureAccountContact(accountPageId: string, contactPageId: string): Promise<void>;
  verifyBothSides(accountPageId: string, contactPageId: string): Promise<boolean>;
  refreshContacts(): Promise<void>;
}
```

Normalize names with Unicode NFKC, trimmed lowercase text, and collapsed whitespace. Require the account first, find before create, append/verify idempotently, refresh only after verification, and return `partial_relation` after a contact exists but verification remains false or throws.

- [ ] **Step 4: Add failing tests for account scoping, partial completion, and retry idempotency**

```ts
it('allows the same normalized name at a different account', async () => {
  const adapter = fakeAdapter({ existing: null, verify: true });
  const result = await createVerifiedContact(input({ accountPageId: 'second-account' }), adapter);
  expect(result.status).toBe('created_verified');
  expect(adapter.createContact).toHaveBeenCalledTimes(1);
});

it('returns partial_relation when the created contact cannot be verified', async () => {
  const adapter = fakeAdapter({ existing: null, verify: false });
  const result = await createVerifiedContact(input(), adapter);
  expect(result).toMatchObject({ status: 'partial_relation', retry: { accountPageId: 'account-page', contactPageId: 'contact-page' } });
});

it('retries only relationship repair for an existing contact id', async () => {
  const adapter = fakeAdapter({ verify: true });
  const result = await retryVerifiedContactLink({ accountPageId: 'account-page', contactPageId: 'contact-page' }, adapter);
  expect(result.status).toBe('existing_verified');
  expect(adapter.createContact).not.toHaveBeenCalled();
  expect(adapter.ensureAccountContact).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 5: Run focused tests to GREEN and commit**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run lib/server/contact-creation.test.ts`

Commit: `git commit -m "feat: orchestrate verified contact creation"`

---

### Task 2: Current Notion data-source adapter

**Files:**
- Create: `lib/server/notion-contact-creation.ts`
- Test: `lib/server/notion-contact-creation.test.ts`
- Modify: `lib/server/notion-live-crm.ts`

**Interfaces:**
- Produces: `notionContactCreationAdapter: ContactCreationAdapter` and `refreshLiveNotionContactsCache(): Promise<void>`.
- Consumes: the Task 1 domain types and existing Notion environment boundaries.

- [ ] **Step 1: Write failing adapter tests around current data-source endpoints**

```ts
it('resolves the database data source and paginates account-scoped contacts', async () => {
  const result = await notionContactCreationAdapter.findContact('account-page', 'maya chen');
  expect(result?.id).toBe('matching-contact');
  expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
    'https://api.notion.com/v1/databases/contacts-db',
    'https://api.notion.com/v1/data_sources/contacts-source/query',
    'https://api.notion.com/v1/data_sources/contacts-source/query',
  ]);
  expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({ start_cursor: 'opaque-next-cursor' });
  expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ 'Notion-Version': '2026-03-11' });
});

it('creates a page beneath the resolved contacts data source', async () => {
  await notionContactCreationAdapter.createContact(input());
  const body = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
  expect(body.parent).toEqual({ type: 'data_source_id', data_source_id: 'contacts-source' });
  expect(Object.keys(body.properties).sort()).toEqual([
    'Contact Name', 'Contact Position', 'Dispensary', 'Email', 'Phone Number', 'Where Contact Info Came From',
  ].sort());
});
```

- [ ] **Step 2: Run the adapter test and confirm RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run lib/server/notion-contact-creation.test.ts`

Expected: FAIL because the adapter module does not exist.

- [ ] **Step 3: Implement the current-version request boundary**

Implement a private `notionRequest<T>()` with:

- `Notion-Version: 2026-03-11`;
- `cache: 'no-store'`;
- at most three bounded retries for 429 and 5xx;
- `Retry-After` support when present;
- sanitized thrown messages that include status/code but not authorization or full request payloads.

Resolve database IDs to their first configured data-source ID through database retrieval, then query `/data_sources/{dataSourceId}/query` with `page_size: 100` and opaque cursor pagination.

- [ ] **Step 4: Write failing relationship-preservation and verification tests**

```ts
it('appends the new contact without removing existing account contacts', async () => {
  await notionContactCreationAdapter.ensureAccountContact('account-page', 'contact-c');
  const body = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
  expect(body.properties['Associated Contacts'].relation).toEqual([
    { id: 'contact-a' }, { id: 'contact-b' }, { id: 'contact-c' },
  ]);
});

it('requires the contact and account pages to contain the relationship on fresh readback', async () => {
  // Contact side true, account side false => false.
});
```

- [ ] **Step 5: Implement account validation, dedupe reads, creation, append, and readback**

Validate the account page belongs to the configured master data source and is not trashed. Read property values by a small ordered candidate map already consistent with the existing contact reader. Use the existing app contact-source classification. Never overwrite unrelated properties or replace the account's existing contact identifiers.

- [ ] **Step 6: Expose a focused cache refresh and run tests to GREEN**

Add `refreshLiveNotionContactsCache()` in `notion-live-crm.ts` as a narrow wrapper around the existing refresh path. The adapter calls it only after verified success.

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run lib/server/contact-creation.test.ts lib/server/notion-contact-creation.test.ts`

Commit: `git commit -m "feat: add verified Notion contact adapter"`

---

### Task 3: Contact routes and validation

**Files:**
- Modify: `lib/validation/schemas.ts`
- Modify: `app/api/contacts/route.ts`
- Create: `app/api/contacts/retry-link/route.ts`
- Create: `lib/server/contact-routes.test.ts`

**Interfaces:**
- Produces: browser contracts for `POST /api/contacts` and `POST /api/contacts/retry-link`.
- Consumes: `createVerifiedContact`, `retryVerifiedContactLink`, and `notionContactCreationAdapter`.

- [ ] **Step 1: Write route tests that fail before route changes**

```ts
it('maps created_verified to 201 and partial_relation to 202', async () => {
  createVerifiedContact.mockResolvedValueOnce(createdOutcome()).mockResolvedValueOnce(partialOutcome());
  expect((await POST(contactRequest(validPayload()))).status).toBe(201);
  expect((await POST(contactRequest(validPayload()))).status).toBe(202);
});

it('rejects malformed page identifiers and invalid email with 400', async () => {
  const response = await POST(contactRequest({ ...validPayload(), accountPageId: 'wrong', email: 'not-email' }));
  expect(response.status).toBe(400);
  expect(createVerifiedContact).not.toHaveBeenCalled();
});

it('returns the guard response before invoking the service', async () => {
  guard.mockResolvedValueOnce({ error: new Response(null, { status: 403 }) });
  expect((await POST(contactRequest(validPayload()))).status).toBe(403);
  expect(createVerifiedContact).not.toHaveBeenCalled();
});

it('retry rejects mismatched identifiers and never accepts property payloads', async () => {
  const response = await RETRY_POST(contactRequest({ ...validRetryPayload(), properties: { unsafe: true } }));
  expect(response.status).toBe(400);
  expect(retryVerifiedContactLink).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run route tests and confirm RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run lib/server/contact-routes.test.ts`

- [ ] **Step 3: Add the exact schemas and route mappings**

Create schemas for:

```ts
{ accountPageId, name, position, email?: string | null, phone?: string | null }
{ accountPageId, contactPageId }
```

Accept hyphenated or compact UUID page identifiers, trim text, convert blank optional values to null, cap lengths, and keep the existing allowed write roles. Return 201/200/202 according to the typed outcome. Preserve the existing generic error envelope and map missing/foreign account errors to 404.

- [ ] **Step 4: Run route tests to GREEN and commit**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run lib/server/contact-routes.test.ts lib/server/contact-creation.test.ts lib/server/notion-contact-creation.test.ts`

Commit: `git commit -m "feat: expose verified contact routes"`

---

### Task 4: Reusable browser contact flow

**Files:**
- Create: `components/crm/contact-create-model.ts`
- Test: `components/crm/contact-create-model.test.ts`
- Create: `components/crm/contact-create-flow.tsx`
- Modify: `app/(main)/contacts/page.tsx`
- Modify: `components/crm/contacts-table.tsx`

**Interfaces:**
- Produces: `ContactCreateFlow`, `filterContactAccounts()`, `validateContactDraft()`, and `buildContactCreateHref()`.
- Consumes: `RuntimeAccountSummary[]`, the Task 3 routes, and router query parameters `new=1` and optional `accountPageId`.

- [ ] **Step 1: Write failing pure-model tests**

```ts
it('filters accounts by name, city, and license without case sensitivity', () => {
  expect(filterContactAccounts(accounts, 'brooklyn').map((account) => account.name)).toEqual(['Juniper House']);
  expect(filterContactAccounts(accounts, 'OCM-CAURD-24-000321').map((account) => account.name)).toEqual(['North Fork Cannabis']);
});

it('requires account, name, and position and validates a present email', () => {
  expect(validateContactDraft({ accountPageId: '', name: '', position: '', email: 'wrong', phone: '' })).toEqual({
    accountPageId: 'Choose an account.',
    name: 'Enter the contact name.',
    position: 'Enter the contact position.',
    email: 'Enter a valid email address.',
  });
});

it('builds a quick-create URL without leaking unrelated query parameters', () => {
  expect(buildContactCreateHref('account-page')).toBe('/contacts?new=1&accountPageId=account-page');
  expect(buildContactCreateHref()).toBe('/contacts?new=1');
});
```

- [ ] **Step 2: Run model tests and confirm RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run components/crm/contact-create-model.test.ts`

- [ ] **Step 3: Implement the pure model and reusable flow**

The flow renders inline at the top of Contacts when `new=1`. On mobile it occupies the usable viewport above the persistent menu; on desktop it becomes a two-column form/account-search surface. Implement:

- searchable account results with keyboard-accessible buttons;
- account lock when `accountPageId` is supplied and found;
- labeled fields with adjacent errors;
- loading, empty search, submitting, duplicate, verified, partial, and failure states;
- retry by calling `/api/contacts/retry-link` with server-returned identifiers only;
- cancel by removing only the creation query parameters;
- `router.refresh()` after verified results;
- focus movement to the result heading and an `aria-live="polite"` status region.

- [ ] **Step 4: Add visible entry points on Contacts**

Add an Add contact button beside the Contacts heading and a toolbar action in `ContactsTable`. Both use `buildContactCreateHref()`. Remove or replace unsupported toolbar copy only where necessary for this flow; do not broaden into table redesign.

- [ ] **Step 5: Run model and existing tests to GREEN and commit**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run components/crm/contact-create-model.test.ts && PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test`

Commit: `git commit -m "feat: add mobile-first contact form"`

---

### Task 5: Persistent navigation and account entry point

**Files:**
- Modify: `components/layout/app-shell.tsx`
- Create: `components/crm/accounts-section-tabs.tsx`
- Modify: `app/(main)/accounts/page.tsx`
- Modify: `app/(main)/contacts/page.tsx`
- Modify: `components/mobile/account-detail-sheet.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `buildContactCreateHref()` and the account page identifier already present on `TerritoryStorePin`.
- Produces: persistent Home, Map, Accounts, Route, Dashboard navigation; shared Accounts/Contacts section tabs; Profile/tools Home link; global Add contact/Add task links; account-detail Add contact link.

- [ ] **Step 1: Add failing browser assertions for exact navigation**

```ts
await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByText('Contacts')).toHaveCount(0);
await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByText('Dashboard')).toBeVisible();
await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByText('Home')).toBeVisible();
await page.getByRole('link', { name: 'Accounts' }).click();
await expect(page.getByRole('navigation', { name: 'Account directory' }).getByRole('link', { name: 'Contacts' })).toBeVisible();
await page.getByText('Profile').click();
await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
```

- [ ] **Step 2: Implement the Accounts/Contacts section tabs and Profile/tools link**

Keep the existing five equal-width persistent tabs. Add Home to Profile/tools and a compact header quick-action details menu with Add contact and Add task. Create `AccountsSectionTabs` with accessible `aria-label="Account directory"` navigation and links to Accounts and Contacts. Render it near the top of both pages. Extend the Accounts persistent-tab matching so it remains active on `/contacts` without changing the link destination.

- [ ] **Step 3: Resolve PR #135 overlap before editing account detail**

Recheck PR #135 status and changed paths. If it remains stale/conflicting, release its stale path claim according to repo policy with a public-safe comment before this branch edits `account-detail-sheet.tsx`. Add an Add contact action next to Associated Contacts that links to the reusable form with the active account preselected. Do not import the form into the already-large sheet.

- [ ] **Step 4: Run focused browser navigation checks and commit**

Run the targeted Playwright tests under the agent dev environment, then:

Commit: `git commit -m "feat: add contacts tab to accounts"`

---

### Task 6: Browser states, screenshots, and full verification

**Files:**
- Create or modify: `tests/e2e/contact-create.spec.ts`
- Create: `.agents/issue-155-contacts-mobile.png`
- Create: `.agents/issue-155-contacts-desktop.png`
- Modify: `SESSION.md` only if validation evidence or owned paths changed.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: repeatable user-visible proof without a production CRM write.

- [ ] **Step 1: Add a Playwright contact flow using network interception**

Intercept the runtime account endpoint with one realistic account and intercept contact POST responses for verified, duplicate, partial, retry, and error cases. Do not add mock application data paths to production code. Test normal user input, cancel, field validation, focus behavior, and response states.

- [ ] **Step 2: Run the QA inventory on desktop and 390x844 mobile**

Cover:

- persistent navigation, Accounts/Contacts section tabs, and Profile Home;
- Contacts page Add contact;
- account search and selection;
- locked account query state;
- validation, duplicate, verified, partial/retry, and hard error;
- no horizontal overflow or controls behind bottom navigation;
- keyboard reachability and visible focus;
- exploratory double-submit protection;
- exploratory retry after a simulated timeout.

- [ ] **Step 3: Capture screenshots and a short interaction recording**

Capture final desktop and mobile form/result states under `.agents/`. The recording must show opening Contacts, creating through intercepted routes, and reaching verified success. Label all proof as local/intercepted, not production.

- [ ] **Step 4: Run fresh complete verification**

Run:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run verify
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run test:e2e
```

Expected: both commands exit 0. Record exact test counts, build result, and any existing audit warnings separately.

- [ ] **Step 5: Self-review and update the draft PR**

Review the complete diff for private data, unrelated edits, accidental local files, path overlap, accessibility, and honest integration claims. Update the PR with commands, screenshots, local/intercepted proof, remaining production-write boundary, and rollback risk.

Commit: `git commit -m "test: verify contact creation in the browser"`
