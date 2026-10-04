# ejuicr – agent notes

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
- Deliberate architecture decisions are recorded as ADRs in
  `docs/DECISIONS.md`; read it before changing auth, data, or calculator
  behavior.

## Deployment

- Production: `https://ejuicr.vercel.app` on Vercel Hobby (non-commercial
  plan). The repo is `ejuicr/ejuicr-next`, branch `master`, auto-deployed by
  Vercel.
- For deployment, environment, or OAuth configuration changes, read the
  relevant sections of `docs/deployment.md` for environment mapping, setup,
  known quirks, and post-change verification.
- Never commit `.env.local`; secrets live there and in Vercel env vars.

## Validation

For application code, dependencies, or runtime/build configuration changes,
run all of these before finishing:

```
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

`npm run test:integration` uses an in-memory MongoDB by default; set
`MONGODB_TEST_URI` to run against an isolated server instead. CI supplies a
MongoDB service container. Never point it at development or production.

For UI changes, also run the browser smoke suite using the successful production
build above. Rebuild only if subsequent changes affect the build. Install
Firefox once with `npm run test:e2e:install`:

```
npm run test:e2e
```

For documentation-only or agent-guidance changes, inspect the diff and verify
referenced paths and commands; the application suite is not required. Validate
executable examples or configuration when those are affected. Repeat checks
only when subsequent changes or unresolved failures justify it.
