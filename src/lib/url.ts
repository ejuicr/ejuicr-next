import "server-only";

/**
 * Externally reachable base URL of the app.
 *
 * `APP_URL` wins when set (recommended for production). Otherwise Vercel's
 * system environment variables are used: preview deployments link to
 * themselves, and production falls back to the stable project domain.
 * Finally, the request origin is used (local development).
 */
export function getAppUrl(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (process.env.VERCEL_ENV === "preview" && vercelUrl) {
    return `https://${vercelUrl}`;
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl) return `https://${vercelProductionUrl}`;

  return new URL(request.url).origin;
}
