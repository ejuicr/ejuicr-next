Things needing your attention

1. MongoDB couldn't be reached from this machine — both the new app and the old Express server fail identically with querySrv ENOTFOUND for the Atlas cluster, so it's local DNS/network, not the rebuild. Fix DNS access or point MONGODB_URI at a local Mongo to use the app.
2. OAuth callback URLs changed (port/path): update these in Google Cloud Console and the Twitter app settings:

- {APP_URL}/api/auth/google/callback
- {APP_URL}/api/auth/twitter/callback (Twitter also needs email permission enabled)

3. .env.local was created (git-ignored) with the DB/JWT/OAuth/email values copied from the old server's .env and APP_URL=http://localhost:3000. Update APP_URL for production; cookies are Secure there, so HTTPS is required.
