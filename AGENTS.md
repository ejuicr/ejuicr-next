# ejuicr – agent notes

Do not make changes to `docs/todo.md`. They are notes for the human, managed by the human.

## Next.js version

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project overview

Single Next.js app (App Router, TypeScript, Tailwind CSS v4) containing both
the UI and the REST API. MongoDB via Mongoose; sessions are JWTs in an
`httpOnly` cookie. See `README.md` for setup, scripts, and endpoint details.

## Conventions

- Pages are server components unless they need state or effects; interactive
  components start with `"use client"`.
- API handlers live in `src/app/api/**/route.ts`, use the `apiHandler` wrapper
  from `src/lib/api.ts`, and throw `ApiError` for expected failures.
- Server-only modules (`src/lib/db.ts`, `auth.ts`, `mailer.ts`, `oauth/*`)
  are marked with `server-only`; never import them from client components.
- API JSON field names match the legacy Express server (`_id`, `base.pg`,
  `ingredients.nicotine`, ...) so existing MongoDB data stays compatible.
- Theming lives in `src/app/globals.css` (`@theme` tokens from the old
  Dracula-inspired palette). The app is dark-only.

## Deployment

- Production: `https://ejuicr.vercel.app` on Vercel Hobby (non-commercial
  plan). The repo is `ejuicr/ejuicr-next`, branch `master`, auto-deployed by
  Vercel.
- MongoDB Atlas free cluster shared across environments by database name:
  local `ejuicr-development`, production `ejuicr-production`, preview
  `ejuicr-staging`.
- OAuth: Google client "ejuicr-next" and an X (Twitter) OAuth 1.0a app.
  Callbacks are `{APP_URL}/api/auth/{google,twitter}/callback`.
- Vercel env changes require a redeploy, and `NEXT_PUBLIC_*` values are
  inlined at build time, so set them before the build or redeploy after.
- Full runbook, known quirks, and post-change verification steps live in
  `docs/deployment.md`.
- `todo.md` is the maintainer's personal notes file; do not read or modify
  it unless explicitly asked.
- Never commit `.env.local`; secrets live there and in Vercel env vars.

## Validation

Run all of these before finishing a change:

```
npm run lint
npm run typecheck
npm test
npm run build
```
