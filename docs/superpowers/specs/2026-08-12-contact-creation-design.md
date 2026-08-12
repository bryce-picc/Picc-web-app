# Verified Contact Creation Design

## Objective

Make Contacts a first-class field workflow and let an authorized user add a contact without leaving the PICC app. A successful result means the contact exists in the connected CRM, belongs to the selected account, appears in the account's related-contact collection, and has been verified through a fresh server read.

## Product Boundary

This slice changes contact creation and navigation only. Task creation, general mobile performance work, and stale engineering cleanup remain separate issues and pull requests. It does not change the external CRM schema, bulk-import contacts, repair historical relationships, or perform a production backfill.

## User Experience

### Navigation

The persistent five-item navigation remains Home, Map, Accounts, Route, and Dashboard. Home is also available from the Profile/tools menu. The Accounts section gains a clear two-tab switcher for Accounts and Contacts; the persistent Accounts destination remains active while either tab is open.

The app shell also exposes a compact quick-action control containing Add contact and Add task. Add task can continue routing to its existing quick-create URL until issue #36 supplies its form.

### Entry points

The same reusable creation experience opens from:

- the Contacts page through a visible Add contact button;
- the quick-create URL;
- an account-detail sheet, with that account preselected and locked;
- the global quick-action control.

On mobile it uses a focused full-height workflow above the persistent navigation. On wider screens it uses a constrained side panel. Both render the same form component and state model.

### Form

The form contains:

- Account, required and searchable unless preselected by account detail;
- Contact name, required;
- Position, required;
- Email, optional but validated when present;
- Phone, optional;
- Save and Cancel actions.

Labels remain above fields. Save is disabled only while submitting or when required client validation fails. Server validation remains authoritative. The form does not expose internal integration property names.

### States

- Loading: account search and submission use layout-matched skeleton or inline progress states.
- Empty: account search explains how to broaden the query.
- Validation: field-specific messages remain adjacent to their inputs.
- Duplicate: show the existing contact and offer View contact; do not create a second record.
- Verified success: show the contact name and linked account, then refresh the contact directory and account detail.
- Partial completion: explain that the contact exists but the account relationship could not be fully verified; provide Retry link and View contact. Never label this state successful.
- Failure: preserve entered values and provide a retry action with a safe, human-readable message.

## Server Architecture

### Boundary

A focused contact-creation service owns all external CRM operations. UI components and the route handler do not construct external property payloads.

The service accepts a normalized request containing the selected account page identifier, contact name, position, email, and phone. It returns one of four explicit outcomes:

- `created_verified`;
- `existing_verified`;
- `partial_relation`;
- `failed` through a typed error.

### Idempotent workflow

1. Validate the authenticated user's write role.
2. Resolve and freshly read the selected account through the configured CRM boundary.
3. Query contacts scoped to the exact account and compare normalized names.
4. If a matching contact exists, verify the account relationship and return `existing_verified` or repair only the missing relationship through the same retry-safe path.
5. If no match exists, create the contact with its account relationship and the existing app-appropriate source classification.
6. Freshly read the account's related-contact collection, append the new identifier without removing existing identifiers, and update only when missing.
7. Freshly read both records and require the relationship to be present from both directions.
8. Invalidate or refresh the app's contact snapshot only after the verified outcome.

The external system does not provide a cross-record transaction. Every step is therefore idempotent. Retrying after a timeout or partial update must find the existing account-scoped contact before attempting creation.

### Partial completion

If contact creation succeeds but the account-side relationship or final readback fails, return `partial_relation` with the existing contact identifier and a retry token derived from stable record identifiers. The retry endpoint repeats relationship verification and append behavior without creating a new contact.

Logs and activity records contain stable internal identifiers and outcome codes, never tokens, full external payloads, or sensitive contact values.

## API Contract

`POST /api/contacts` accepts the browser form payload and returns HTTP 201 for `created_verified`, HTTP 200 for `existing_verified`, and HTTP 202 for `partial_relation`. Invalid input is HTTP 400, missing/foreign accounts are HTTP 404, and unauthorized roles remain HTTP 403.

The route preserves the existing generic error envelope. The response includes only the display fields and identifiers needed by the UI.

`POST /api/contacts/retry-link` accepts the partial outcome identifiers and returns `created_verified` or `existing_verified` after fresh verification. It never accepts arbitrary external property payloads from the client.

## Component Boundaries

- `ContactCreateFlow`: owns query-string visibility, form state, outcome rendering, cancel behavior, and router refresh.
- `ContactForm`: renders accessible fields and client validation; it knows nothing about external CRM payloads.
- `AccountContactPicker`: searches the existing account runtime with keyboard and touch support.
- `contact-create-service`: performs dedupe, create, relationship append, readback, and cache invalidation.
- route handlers: authenticate, parse, call the service, and map typed outcomes to HTTP.

The account-detail sheet only supplies the account identifier and opens the reusable flow. It does not duplicate form or write logic.

## Accessibility And Mobile Behavior

- Meet WCAG 2.1 AA contrast and focus visibility using the existing design system.
- All controls have accessible labels, 44px minimum mobile touch targets, logical tab order, and focus restoration on close.
- Validation and result messages use an appropriate live region without moving focus unexpectedly.
- The mobile workflow fits a 390x844 viewport, respects safe areas, and never sits behind the bottom navigation.
- Motion is limited to 150-240ms state transitions and honors reduced-motion preferences.

## Testing

### Unit and service tests

- account-scoped normalized-name duplicate returns the existing contact;
- the same name at a different account can be created;
- create payload contains only supported contact fields;
- account relationship append preserves existing contact identifiers;
- verified success requires fresh two-sided readback;
- partial completion returns the existing contact identifier;
- retry is idempotent and never creates a second contact;
- external rate-limit and transient failures use bounded retry behavior;
- secrets and raw payloads do not enter logs.

### Route tests

- role enforcement;
- valid created, existing, and partial status mappings;
- malformed input, missing account, and foreign account responses;
- retry endpoint rejects arbitrary or mismatched identifiers.

### Browser tests

- Dashboard remains reachable in one tap from primary navigation;
- Contacts is reachable from the Accounts section tab switcher;
- Home remains persistent and is also reachable from the Profile/tools menu;
- Add contact opens from Contacts and account detail;
- account detail locks the correct account;
- required-field and email errors are visible and accessible;
- duplicate, verified success, partial, and retry states render correctly;
- cancel returns to the prior surface without data loss elsewhere;
- desktop and 390x844 mobile layouts have no clipped controls or horizontal overflow.

Browser tests intercept external writes or use a local adapter. They do not create production contacts.

## Delivery And Proof

The pull request must link issue #155, list overlapping pull requests reviewed, and remain scoped to owned paths. Required proof is a clean repository verification run, focused browser tests, before/after navigation screenshots, form screenshots on mobile and desktop, and a short interaction recording. Production behavior may be claimed only after an explicitly approved real write followed by live readback; local and intercepted-browser verification must be labeled as such.
