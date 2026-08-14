# Session: Issue 163 Contact Relationship Workspace Specification

## Linked work

- GitHub issue: https://github.com/brycejohnson1417/Picc-web-app/issues/163
- Draft PR: https://github.com/brycejohnson1417/Picc-web-app/pull/166
- Private Linear issue: https://linear.app/bryce-ai/issue/BRY-115/contact-relationship-workspace-gmail-intelligence-and-daily-debrief
- Private master specification: https://linear.app/bryce-ai/document/picc-contact-relationship-workspace-gmail-intelligence-and-daily-280ea7ef5f65
- Branch: `codex/163-contact-workspace-spec`

## Scope

- Capture the approved contact, account, Gmail, resurfacing, follow-up, and daily-debrief design in one private Linear master specification.
- Commit only a public-safe pointer and architecture boundary to this public repository.
- Preserve a complete traceability ledger from every user request and screenshot annotation to a release and acceptance check.
- Prepare the approved design for a separate implementation-planning pass.

## Out of scope

- Production source implementation in this specification branch.
- Production schema, authentication, OAuth, secret, provider, Notion-write, or destructive-data changes.
- Automatic Apple or Android call, SMS, iMessage, or RCS history synchronization.
- Changes to `/Users/brycejohnson/Code/map-app`.

## Constraints

- The detailed specification is private PICC operating context and belongs in the PICC-Web-app Linear project.
- The public GitHub repository receives only the safe skeleton, canonical links, validation boundaries, and non-proprietary architecture boundaries.
- Implementation must be split into independently testable and reversible releases.
- No implementation plan starts until the user reviews the written private specification.

## Ownership and overlap

- Owned paths: `SESSION.md` and `docs/superpowers/specs/2026-08-14-contact-relationship-workspace-pointer.md`.
- Open PRs #144, #135, and #82 were checked.
- None claims the owned specification paths.
- PR #144 proposes a conflicting monorepo migration, but this branch changes documentation only and does not adopt that architecture.

## Validation plan

- Confirm GitHub issue #163 and Linear issue BRY-115 link to one another.
- Self-review the private master specification for placeholders, contradictions, ambiguity, and missed requests.
- Confirm the public pointer contains no private sales workflows, Gmail data details, screenshots, or proprietary operating logic.
- Run documentation-focused diff and link checks before committing.
