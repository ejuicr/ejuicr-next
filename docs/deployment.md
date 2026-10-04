# Deployment and operations

Operational notes for the ejuicr deployment. Last updated: October 2026.

## Production

- App: <https://ejuicr.vercel.app>
- Host: Vercel Hobby plan (free, personal/non-commercial use only — the
  donate link is a gray area for this clause).
- Repo: `github.com/ejuicr/ejuicr-next`, branch `master`. Vercel deploys on
  push automatically.
- Node.js is pinned to `22.x` via `engines` in `package.json`.
- Hobby gets a **single function region**; set it in Project Settings →
  Functions to the region nearest the Atlas cluster.
- Preview deployments use rotating URLs, so OAuth cannot complete there.
  Test auth on production.

## Environment mapping

| Environment       | Database             | `APP_URL`                     |
| ----------------- | -------------------- | ----------------------------- |
| Local development | `ejuicr-development` | `http://localhost:3000`       |
| Vercel Production | `ejuicr-production`  | optional (see below)          |
| Vercel Preview    | `ejuicr-staging`     | not needed (uses `VERCEL_URL`)|

All three databases live in the same free Atlas M0 cluster
(`ejuicrcluster.m6bqbpe.mongodb.net`). Free-tier characteristics that matter:
512 MB storage, ~100 ops/sec, 500 connections, **no automated backups**, and
the cluster auto-pauses after 30 days with zero connections.

Atlas Network Access allows `0.0.0.0/0` because Vercel Hobby has no static
egress IPs. The database user is scoped to the ejuicr databases (avoid admin
users in Vercel).

`APP_URL` is optional on Vercel: `getAppUrl()` in `src/lib/url.ts` falls back
to `VERCEL_PROJECT_PRODUCTION_URL` (stable production domain) and
`VERCEL_URL` (previews), then the request origin. It is still used for
password reset links and OAuth redirect URIs.

## Environment variables

Core (required): `MONGODB_URI`, `JWT_SECRET`.

Required for the features they enable:

- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — Google sign-in (hidden when
  unset).
- `TWITTER_CONSUMER_KEY` + `TWITTER_CONSUMER_SECRET` — Twitter sign-in
  (hidden when unset).
- `EMAIL_ADDRESS` + `EMAIL_PASSWORD` — password reset emails. Without them,
  reset requests fail; email/password sign-in still works.
- `NEXT_PUBLIC_DONATION_LINK` — donation link on Contribute (the section is
  hidden when unset).
- `NEXT_PUBLIC_SUPPORT_EMAIL` / `NEXT_PUBLIC_FEEDBACK_EMAIL` — mail links on
  Help and Contribute (email text is omitted when unset).

`APP_URL` is optional on Vercel (see above); set it to the externally
reachable URL when hosting elsewhere.

- Values are in the git-ignored `.env.local` locally and in Vercel's project
  settings for deployments.
- `NEXT_PUBLIC_*` values are inlined at build time — set them before the
  build or redeploy afterward.
- Any Vercel env change needs a new deployment to take effect.
- `JWT_SECRET` must be a long random string (`openssl rand -base64 32`).
  Rotating it signs out every session. Session versioning also revokes old
  tokens whenever a password is set or changed.

## OAuth

### Google

- Client name **ejuicr-next** in the Google Cloud project **ejuicr-server**
  (project number `916930895724`), under the Google account that owns the
  `ejuicr-server`, `ejuicr-server staging`, and `ejuice-server development`
  projects.
- Authorized redirect URIs:
  - `https://ejuicr.vercel.app/api/auth/google/callback`
  - `http://localhost:3000/api/auth/google/callback`
- Flow: OAuth 2.0 authorization code, implemented in
  `src/lib/oauth/google.ts` and `src/app/api/auth/google/`.
- Console path: <https://console.cloud.google.com/auth/clients> (the older
  "APIs & Services → Credentials" page also works).
- Google can take 5 minutes to a few hours to apply redirect URI changes.
- A stale client from project `42289256841` exists in an old `.env` but
  belongs to an account we cannot access. **Do not use it.**

### X (Twitter)

- OAuth 1.0a via the `twitter-api-v2` package; implementation in
  `src/lib/oauth/twitter.ts` and `src/app/api/auth/twitter/`.
- Identify the app in the X developer portal by matching its **API Key**
  with `TWITTER_CONSUMER_KEY`.
- Callback URIs:
  - `https://ejuicr.vercel.app/api/auth/twitter/callback`
  - `http://localhost:3000/api/auth/twitter/callback`
- "Request email from users" must be enabled; the app rejects sign-in
  without an email (`authError=twitter-email`).
- If sign-in fails, `/api/auth/twitter` redirects to `/?authError=twitter`.
  To see X's exact error, call `generateAuthLink` locally with the callback
  URL; X's XML error message is logged by the route.

### Email

- Gmail SMTP over port 465 (`EMAIL_ADDRESS` + app password in
  `EMAIL_PASSWORD`). Vercel allows ports 465/587 and blocks only port 25.
- Verify credentials without sending mail via `transporter.verify()`.
- Password **reset** sends email; changing a password while signed in
  never does.

## Known quirks

- **Authentication and data invariants**: see "Decisions and invariants"
  below before changing auth, session, password, or uniqueness behavior.
- **Local dev DNS**: the LAN router (`192.168.50.1`) has a stale negative
  cache for the Atlas SRV record (from when the cluster was paused), so
  `querySrv ENOTFOUND` is returned even though public DNS resolves it. Fix
  by flushing/restarting the router DNS or using `1.1.1.1`/`8.8.8.8` on the
  dev machine. Temporary workaround: run a module that calls
  `dns.setServers(["1.1.1.1", "8.8.8.8"])` and start dev with
  `NODE_OPTIONS="--import /path/to/module.mjs" npm run dev`.
- **npm audit**: the five high advisories are a single dev-only chain
  (`eslint-config-next → fast-glob → micromatch → braces`,
  GHSA-vfj7-8cjw-p6xm) with no patched release. `npm audit --omit=dev`
  reports zero. Never run `npm audit fix --force` (it downgrades
  `eslint-config-next` to v14 and breaks the Next 16 lint setup).
- **Old infrastructure**: the old `ejuicr-server` backend and Vite front end
  are retired. The old backend had been down for 30+ days (proven by the
  Atlas auto-pause) and its GitHub Actions self-hosted runner is gone.
  Cleanup was deliberately skipped; nothing depends on it.

## Decisions and invariants

Deliberate choices recorded in October 2026, after the completed review was
removed. Treat these as invariants unless there is a concrete reason to change
them; the reasoning and per-item verification history remain in git history
(`git log` and `git show <commit>:docs/review-2026-10-04.md`).

### Authentication and sessions

- Public signup (`POST /api/user`) rejects every existing email. Accounts
  created through OAuth add a password with the authenticated
  `POST /api/user/set-password`; My Account uses that endpoint.
- `sessionVersion` on the user revokes old sessions: setting, changing, or
  resetting a password bumps it, and signed-in flows re-issue a cookie for the
  current session. Sessions minted before versioning have no version and keep
  working until the account's first password change.
- Password-reset links are single-use: tokens carry a `password-reset`
  purpose and a stored random nonce, consumed atomically. Requesting a new
  link invalidates earlier ones.
- Google links match by `sub` first; attaching Google to an account or
  creating one from Google requires the `email_verified` claim. Unlinking the
  last sign-in method is refused server-side.
- Password policy: 6–72 UTF-8 bytes, matching bcrypt's effective limit.
  Existing passwords longer than 72 bytes still authenticate and can be
  changed to one within the policy.
- Rate limiting is in-process and per-instance (best effort, not a global
  cap): signup 10/15 min per IP and 3/15 min per email, login 20 and 10,
  password reset 10 and 3. A distributed store is needed for a global limit.
- Password-reset requests always return the same generic response, so the
  endpoint cannot be used to discover accounts.

### Data

- Recipes: unique case-insensitive compound index `(author, name)`
  (`author_title_unique`, collation strength 2). Create and update duplicate
  checks use the same collation.
- Settings: unique `user` index and an atomic upsert in `POST /api/settings`.
  An empty payload creates schema defaults on the first save and is rejected
  once settings exist.
- Account deletion removes recipes and settings before the user document.
- Mongoose creates these indexes automatically on the first connection after
  a deploy (the `autoIndex` default). If autoIndex is ever disabled, create
  them manually and verify with `db.collection.getIndexes()`.

### Calculator

- Persisted drafts (localStorage key `calculator`) are versioned input-only
  (`version: 2`); derived amounts and weights are always recalculated and
  invalid stored values are dropped rather than trusted.
- Initialization precedence: an opened recipe wins, then an existing draft or
  active edits, then saved defaults. Defaults apply to a fresh calculator or
  through the explicit "Apply Saved Defaults" action.
- Nicotine controls are never hidden while nicotine is active
  (`targetNicStrength > 0`).

### Operations

- Read-only duplicate audit:
  `node --env-file=.env.local scripts/inspect-duplicates.mjs --database ejuicr-production`
  (also accepts `ejuicr-staging`; exit code 2 means duplicates were found).
- The retired Vite front end is still deployed at
  <https://ejuicr.netlify.app>. Backend-dependent pages fail, but the
  calculator remains usable as a visual reference for UI parity. Update or
  remove this note if that deployment is taken down.
- `todo.md` at the repository root is the maintainer's personal notes file and
  is git-ignored; do not commit it.

## Verification after any change

Run all four locally:

```
npm run lint
npm run typecheck
npm test
npm run build
```

Then smoke-test production:

1. `GET /api/user/me` → 401 when signed out.
2. Register → `/api/user/me` → delete a throwaway account (201/200/200).
3. `GET /api/auth/google` → redirects to `accounts.google.com` with client
   project `916930895724` and the production callback.
4. `GET /api/auth/twitter` → redirects to `api.x.com` with an
   `oauth_token` and sets the request-token cookie.
5. In a browser: Google + X sign-in, save/view a recipe, settings
   persistence, change password, and password reset email end-to-end.

## API compatibility

JSON field names deliberately match the legacy Express API (`_id`,
`base.pg`, `ingredients.nicotine`, ...). Existing data in the three
databases therefore works unchanged; do not rename fields in the models or
route responses without a migration plan.
