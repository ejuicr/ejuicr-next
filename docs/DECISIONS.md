# Architecture decisions

Deliberate choices that should not be revisited casually. Each record states
the context, the decision, and its consequences. The October 2026 review that
produced these decisions was removed after completion; its full history
remains in git (`git show <commit>:docs/review-2026-10-04.md`).

## ADR-001 — Reject existing accounts on public signup

**Status:** Accepted · October 2026

**Context:** Public signup used to attach a password to an OAuth-only account
when the email matched, which allowed account takeover.

**Decision:** `POST /api/user` rejects every existing email. Accounts created
through OAuth add a password through the authenticated
`POST /api/user/set-password`, which derives the account from the session and
refuses to overwrite an existing password. The write is a conditional update
filtered on "no password yet" and the session version observed when the
request authenticated, so two simultaneous set-password requests cannot both
win; the loser receives 409 without a refreshed session. My Account uses that
endpoint.

**Consequences:** Existing users cannot claim an account through signup; they
sign in with their provider and set a password from My Account. Login keeps
provider-specific guidance (required by this decision), so account existence
is still discoverable through login responses; rate limiting (ADR-006)
mitigates abuse.

## ADR-002 — Password changes revoke existing sessions

**Status:** Accepted · October 2026

**Context:** Sessions were 30-day JWTs with no revocation mechanism, so a
password reset did not remove a session holder.

**Decision:** The user document carries a `sessionVersion`. Session tokens
carry the version and `getCurrentUser` rejects mismatches. Setting, changing,
or resetting a password increments the version; signed-in flows re-issue a
cookie for the current session. Tokens minted before versioning have no
version and are treated as version 0. A signed-in change or set is a
conditional write that also matches the credential state observed when the
request authenticated (the old password hash, or the absence of one), so a
change authorized against stale credentials cannot overwrite a reset or
another change that landed first; that request fails with 409 and does not
mint a session.

**Consequences:** Every other session is revoked on a credential change while
the current session stays signed in. Legacy sessions keep working until the
account's first password change. The conflict response tells the caller to
sign in again, which is required anyway because the version bump revoked the
stale session.

## ADR-003 — Single-use, purpose-bound password-reset tokens

**Status:** Accepted · October 2026

**Context:** Reset links were reusable until their one-hour expiry and shared
the session-token secret.

**Decision:** Reset tokens carry an explicit `password-reset` purpose and a
random nonce stored on the user. Consumption is an atomic `findOneAndUpdate`
filtered by the nonce, which is cleared in the same write; requesting a new
link rotates the nonce and invalidates earlier links. Tokens without the
purpose are rejected.

**Consequences:** A used or superseded link returns a 400 "invalid or already
used" response. A successful reset also bumps `sessionVersion` (ADR-002).

## ADR-004 — Provider linking and unlinking rules

**Status:** Accepted · October 2026

**Context:** Google was matched by email without checking verification, and
last-sign-in-method protection existed only in the UI.

**Decision:** Established Google and Twitter links are matched by the
immutable provider ID first (`sub`, `id`), so a linked account never resolves
through an email that belongs to another account. Attaching Google to an
account or creating one from Google requires the `email_verified` claim.
Email-based linking is separate: if the email already belongs to an account
with a different Twitter identity, the callback refuses with
`authError=twitter-conflict`, and claiming an unlinked account is an atomic
conditional update that only matches while no other provider identity has
been attached, so two simultaneous links cannot both win. Unlinking Google or
Twitter uses an atomic conditional update whose filter requires another
sign-in method (password or the other provider) to remain.

**Consequences:** Unverified provider emails are refused with
`authError=google-email-unverified`; simultaneous unlink requests cannot leave
an account without a sign-in method; a Twitter identity is never silently
moved between accounts. Unique partial indexes on `googleId` and `twitterId`
enforce one account per non-empty provider ID while leaving unlinked accounts
(empty or missing values) unconstrained. Staging and production were audited
clean with `scripts/inspect-duplicates.mjs` on 2026-10-05 before the indexes
were added; the audit remains the pre-rollout check for restored or migrated
data.

## ADR-005 — Password length limited to bcrypt's 72-byte boundary

**Status:** Accepted · October 2026

**Context:** The UI advertised up to 250 characters, but bcrypt only hashes the
first 72 bytes, so longer passwords silently shared a prefix.

**Decision:** New and changed passwords are limited to 6–72 UTF-8 bytes on
both the client and the server.

**Consequences:** Longer passphrases are rejected with an explicit message.
Login only requires a non-empty string, so existing passwords longer than 72
bytes still authenticate and can be changed to a password within the policy.

## ADR-006 — Per-instance best-effort rate limiting

**Status:** Accepted · October 2026

**Context:** Vercel scales horizontally and no external rate-limit store was
wanted at this stage.

**Decision:** Authentication routes use in-process fixed-window limits keyed
by requester IP and account identifier: signup 10/15 min per IP and 3/15 min
per email, login 20 and 10, password reset 10 and 3. Limits return 429 with a
`Retry-After` header.

**Consequences:** This is not a global cap; each instance enforces its own
budget. A distributed store is required if global limits become necessary.

## ADR-007 — Generic password-reset responses

**Status:** Accepted · October 2026

**Context:** Reset requests distinguished registered from unknown emails,
which turned the endpoint into an account-discovery oracle.

**Decision:** Password-reset requests return the same generic response whether
or not an account exists; mail is sent only for known accounts. Login keeps
provider-specific guidance per ADR-001.

**Consequences:** Users receive no immediate feedback for a mistyped address.
The generic message is also what the UI displays.

## ADR-008 — Per-user uniqueness enforced in the database

**Status:** Accepted · October 2026

**Context:** Recipe-title checks raced and skipped updates; settings used
find-then-create with an unindexed `user` field. Both could produce duplicates.

**Decision:** Recipes use a unique compound index on `(author, name)` with a
case-insensitive collation (strength 2), and create/update duplicate checks
use the same collation. Settings use a unique `user` index and an atomic
upsert with `runValidators` and `setDefaultsOnInsert`; an empty payload
creates defaults on the first save and is rejected once settings exist.

**Consequences:** Concurrent duplicate writes fail with a duplicate-key error
(409) instead of creating duplicates. Staging and production were inspected
clean before the indexes were added.

## ADR-009 — Index creation via Mongoose autoIndex

**Status:** Accepted · October 2026

**Context:** The shared Atlas free cluster is used from serverless functions
across three databases.

**Decision:** Rely on Mongoose creating schema indexes on the first connection
after a deploy (the `autoIndex` default). If autoIndex is ever disabled,
create the indexes manually and verify with `db.collection.getIndexes()`.

**Consequences:** The first cold connection builds the indexes; collections
are small, so this is effectively instantaneous.

## ADR-010 — Account deletion removes dependent data first

**Status:** Accepted · October 2026

**Context:** Deleting an account left its settings document behind, and a
recipe creation or settings save that authenticated before deletion could
insert after dependent cleanup and leave an orphan.

**Decision:** Deletion marks the user document with `deleting: true` first
(idempotent, so a retry is safe), then deletes recipes and settings in
parallel, then the user document, and finally clears the session cookie.
Dependent write routes (`POST /api/recipes`, `POST /api/settings`) re-check
the account after writing through `accountAcceptingWrites`; if the account is
gone or deleting, they remove their own record and return 409.

**Consequences:** A successful deletion removes all owned data even when
writes overlap it: a write that lands before dependent cleanup is removed by
that cleanup, and one that lands after it removes itself. A partial failure
leaves the account intact with `deleting: true`, so reads still work, writes
are refused, and retrying the deletion is safe. Wrapping deletion in a
transaction alone would not close the write side, which is why the
deletion-state protocol covers both paths. Orphaned records from older
deletions were checked and none remained in production.

## ADR-011 — Calculator state is input-only and versioned

**Status:** Accepted · October 2026

**Context:** Persisted calculator state included derived amounts, weights, and
carrier results and was trusted on load, so stale or malformed data could
produce invalid mixes.

**Decision:** localStorage key `calculator` stores a versioned (`version: 2`)
input-only draft. Derived results are always recalculated; stored values are
validated field by field and invalid values or flavor entries are dropped.
Carrier ratios (target base, nicotine base, flavor base) must be finite,
within 0–100, and add up to 100 within a 0.01 tolerance; the API rejects
anything else, the draft parser drops the affected values, and calculator
status marks impossible mixtures invalid so Save stays disabled. Storage
reads and writes are failure-tolerant.

**Consequences:** Drafts survive reloads without carrying stale derived state.
Legacy unversioned drafts and derived fields from older formats are ignored
where invalid and migrated where possible. Legacy documents with
non-normalized ratios load with an explicit error and cannot be saved until
corrected, and non-finite results (for example from a corrupted target
amount) are invalid rather than silently rendering `NaN` instructions.

## ADR-012 — Calculator initialization precedence

**Status:** Accepted · October 2026

**Context:** Loading the signed-in user's defaults replaced an active draft,
and zero-nicotine defaults could hide active nicotine in a saved recipe.

**Decision:** Initialization precedence is: an opened recipe, then an existing
draft or active edits, then saved defaults. Defaults apply to a fresh
calculator or through the explicit "Apply Saved Defaults" action. Newly added
flavors inherit saved flavor defaults, and nicotine controls are never hidden
while `targetNicStrength > 0`. A settings request is recorded as loaded for an
account only after it succeeds, so an auth refresh that replaces the user
object while the request is pending retries instead of permanently cancelling
it. Saved defaults are keyed to the account that loaded them; logging out or
switching accounts stops offering and applying them (and stops inheriting
flavor defaults) without replacing active inputs.

**Consequences:** Saved defaults never silently replace an active draft, and
displayed instructions always include every active ingredient. A late
response for a previous account cannot apply to the current one.

## ADR-013 — Database-backed integration tests verify high-risk invariants

**Status:** Accepted · October 2026

**Context:** Unit and component tests asserted mechanisms — mocked database
updates, cookie calls, and schema declarations — but could not prove
guarantees such as "an initial password is never overwritten" or "a
successful deletion removes all owned data". The browser smoke suite covers
signed-out UI only.

**Decision:** Auth and data invariants are verified by a database-backed
integration suite (`npm run test:integration`). It exercises the real route
handlers, models, and database constraints; only the session/cookie layer and
the Twitter HTTP exchange are mocked. Each test file creates and drops a
uniquely named temporary database. The suite starts an in-memory MongoDB
(`mongodb-memory-server`) by default or uses an isolated `MONGODB_TEST_URI`;
CI supplies a MongoDB service container and test-only credentials. The fast
unit/component suite stays database-free and runs separately.

**Consequences:** Credential races, duplicate writes, provider-identity
conflicts, and deletion/write overlap are verified against persisted state,
not just call patterns. The suite needs a MongoDB binary or service and takes
seconds rather than milliseconds, so it stays out of the default `npm test`
run. The browser smoke suite still does not cover authenticated flows;
integration tests are the evidence layer for them.
