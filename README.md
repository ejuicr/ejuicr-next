# ejuicr

ejuicr is a convenient, easy-to-use e-juice calculator for creating and
managing recipes. This repository is the Next.js rebuild that combines the
former React front end (`ejuicr`) and Express API (`ejuicr-server`) into a
single application.

## Tech stack

- [Next.js](https://nextjs.org/) 16 (App Router, TypeScript, Turbopack)
- [React](https://react.dev/) 19 and [Tailwind CSS](https://tailwindcss.com/) 4
- [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- JSON Web Tokens stored in `httpOnly` cookies
- Google OAuth 2.0 and Twitter OAuth 1.0a sign-in
- [Nodemailer](https://nodemailer.com/) for password reset emails
- [Vitest](https://vitest.dev/) and Testing Library

## Running the app locally

### Prerequisites

- Node.js 20.9 or newer
- A MongoDB connection string (Atlas or a local server)

### Installation

1. Install dependencies:

```
npm install
```

2. Create `.env.local` from the example and fill in your values:

```
cp .env.example .env.local
```

3. Start the development server:

```
npm run dev
```

Open the application at [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable                     | Required | Description                                                        |
| ---------------------------- | -------- | ------------------------------------------------------------------ |
| `MONGODB_URI`                | Yes      | MongoDB connection string.                                         |
| `JWT_SECRET`                 | Yes      | Secret used to sign session and password reset tokens.             |
| `APP_URL`                    | No       | Public URL; recommended for OAuth callbacks and reset links. Falls back to Vercel URLs or the request origin. |
| `GOOGLE_CLIENT_ID`           | No       | Enables Google sign-in when set with the secret.                   |
| `GOOGLE_CLIENT_SECRET`       | No       | Google OAuth client secret.                                        |
| `TWITTER_CONSUMER_KEY`       | No       | Enables Twitter sign-in when set with the secret.                  |
| `TWITTER_CONSUMER_SECRET`    | No       | Twitter OAuth 1.0a consumer secret.                                |
| `EMAIL_ADDRESS`              | No       | Gmail address used to send password reset emails.                  |
| `EMAIL_PASSWORD`             | No       | Gmail app password for the address above.                          |
| `NEXT_PUBLIC_DONATION_LINK`  | No       | Donation link on Contribute; the section is hidden when unset.     |
| `NEXT_PUBLIC_SUPPORT_EMAIL`  | No       | Support address on Help; the email option is hidden when unset.    |
| `NEXT_PUBLIC_FEEDBACK_EMAIL` | No       | Feedback address on Help and Contribute; hidden when unset.        |

Optional integrations degrade gracefully: Google and Twitter buttons are
hidden when their credentials are missing, and missing support/donation
values omit the corresponding UI instead of rendering empty links. Email and
password sign-in still works without mail credentials, but **password reset
emails require `EMAIL_ADDRESS` and `EMAIL_PASSWORD`**.

### OAuth callback URLs

The OAuth callback paths differ from the old Express server. Register the new
URLs with each provider (using your `APP_URL`):

- Google: `{APP_URL}/api/auth/google/callback`
- Twitter: `{APP_URL}/api/auth/twitter/callback`

The Twitter app must also be allowed to request the user's email address,
otherwise Twitter sign-in cannot create an account.

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the development server.            |
| `npm run build`     | Create a production build.               |
| `npm start`         | Start the production server.             |
| `npm run lint`      | Run ESLint.                              |
| `npm run typecheck` | Run the TypeScript compiler.             |
| `npm test`          | Run the test suite once.                 |
| `npm run test:integration` | Run database-backed integration tests (needs `MONGODB_TEST_URI`). |
| `npm run test:watch`| Run tests in watch mode.                 |
| `npm run test:e2e`  | Run the Playwright browser smoke suite.  |
| `npm run test:e2e:install` | Install Firefox for the smoke suite. |

The browser smoke suite runs against a production build, so run
`npm run build && npm run test:e2e` (and `npm run test:e2e:install` once).
It covers signed-out calculation, layout, and accessibility; authenticated
database flows are covered by `npm run test:integration`.

Database-backed integration tests exercise password races, duplicate writes,
provider-identity conflicts, and deletion/write overlap against a real
MongoDB. They create and drop a temporary database; by default they start an
in-memory MongoDB, or use an isolated server when `MONGODB_TEST_URI` is set:

```
npm run test:integration
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm run test:integration
```

CI (`.github/workflows/ci.yml`) runs all of the above with a MongoDB service
container and test-only credentials.

## Project structure

```
src/
├── app/                    # Pages and API route handlers
│   ├── api/                # REST API (user, recipes, settings, auth)
│   ├── recipes/            # Recipe list and calculator pages
│   ├── settings/           # Calculator defaults
│   ├── myaccount/          # Profile, password, linked accounts
│   ├── update-password/    # Password reset form
│   └── ...                 # Static pages
├── components/
│   ├── calculator/         # Calculator UI and state
│   ├── auth/               # Login, signup, reset forms
│   ├── account/            # Account profile components
│   ├── layout/             # Header, sidebar, footer
│   ├── recipes/            # Recipe list and loader
│   ├── settings/           # Settings form
│   ├── providers/          # Auth context
│   └── ui/                 # Shared UI primitives
├── lib/
│   ├── models/             # Mongoose schemas
│   ├── oauth/              # Google and Twitter helpers
│   ├── auth.ts             # Cookie sessions and JWTs
│   ├── db.ts               # Cached MongoDB connection
│   └── helpers.ts          # Mixing calculations and validation
└── types/                  # Shared TypeScript types
```

## API

All endpoints live under `/api` and use the same JSON shapes as the old
server, so existing data continues to work.

| Method | Endpoint                        | Access  | Description                        |
| ------ | ------------------------------- | ------- | ---------------------------------- |
| POST   | `/api/user`                     | Public  | Register an account.               |
| POST   | `/api/user/login`               | Public  | Log in with email and password.    |
| POST   | `/api/user/logout`              | Public  | Clear the session cookie.          |
| GET    | `/api/user/me`                  | Private | Get the current user.              |
| POST   | `/api/user/change-password`     | Private | Change the current password.       |
| POST   | `/api/user/set-password`        | Private | Set a password for OAuth accounts. |
| POST   | `/api/user/reset-password`      | Public  | Send a reset password email.       |
| POST   | `/api/user/reset-password/:token` | Public | Set a new password with a token. |
| DELETE | `/api/user`                     | Private | Delete the account and recipes.    |
| DELETE | `/api/user/google`              | Private | Unlink a Google account.           |
| DELETE | `/api/user/twitter`             | Private | Unlink a Twitter account.          |
| GET    | `/api/recipes`                  | Private | List recipe summaries (`?count=1`).|
| POST   | `/api/recipes`                  | Private | Create a recipe.                   |
| GET    | `/api/recipes/:id`              | Private | Get one recipe.                    |
| PUT    | `/api/recipes/:id`              | Private | Update a recipe.                   |
| DELETE | `/api/recipes/:id`              | Private | Delete a recipe.                   |
| GET    | `/api/settings`                 | Private | Get the user's defaults.           |
| POST   | `/api/settings`                 | Private | Save the user's defaults.          |
| GET    | `/api/auth/google`              | Public  | Start Google sign-in.              |
| GET    | `/api/auth/twitter`             | Public  | Start Twitter sign-in.             |

## Deployment

### Vercel

The app deploys to Vercel as a standard Next.js project.

1. Import the GitHub repository into Vercel; the default build settings
   (`next build`) work as-is.
2. Set the function region to the region of your MongoDB Atlas cluster
   (Project Settings → Functions). Vercel Hobby allows a single region.
3. Add the environment variables listed above. Scope `MONGODB_URI` per
   environment to match your database layout (for example
   `ejuicr-production` for Production and `ejuicr-staging` for Preview).
4. In Atlas, add `0.0.0.0/0` to Network Access and create a database user
   limited to `readWrite` on the ejuicr databases.
5. Deploy, then register the OAuth callbacks below using the assigned
   `*.vercel.app` domain (or your custom domain).

`APP_URL` only needs to be set for Production; preview deployments derive
their URL from Vercel's system environment variables. Gmail SMTP uses port
465, which Vercel allows (only port 25 is blocked). The `engines` field pins
Node.js 22 for parity with local development.

### Self-hosting

Build and run the production server:

```
npm run build
npm start
```

An `ecosystem.config.cjs` file is included for pm2:

```
pm2 start ecosystem.config.cjs
```

Set `APP_URL` to the externally reachable URL and serve the app over HTTPS.
Session cookies are marked `Secure` in production, so sign-in will not work
over plain HTTP. `PORT` can be set to change the listening port (default
3000).

## Security

Check the dependencies that actually ship to production with:

```
npm audit --omit=dev
```

At the time of the rebuild this reports no vulnerabilities. A full
`npm audit` may report advisories in the dev-only ESLint toolchain (for
example the `braces` stack-exhaustion advisory,
GHSA-vfj7-8cjw-p6xm) that do not yet have a patched release. These
packages are never loaded at runtime, and any future `3.x` patch will be
picked up automatically by `npm update` or a fresh `npm install`. Do not
run `npm audit fix --force`: it downgrades `eslint-config-next` to a
version that is incompatible with Next.js 16.

## Notes on the rebuild

- Sessions are now stored in an `httpOnly` cookie instead of `localStorage`,
  so the client no longer sends `Authorization` headers and tokens are not
  readable by JavaScript.
- OAuth uses a state/token cookie instead of Express sessions and Passport.
- The duplicate recipe title check is scoped to the signed-in user rather
  than being global.
- Password reset tokens are validated properly; invalid or expired links
  return a clear error instead of failing unexpectedly.
