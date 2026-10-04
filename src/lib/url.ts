import "server-only";

/**
 * Externally reachable base URL of the app. Falls back to the request origin
 * when `APP_URL` is not configured (fine for local development).
 */
export function getAppUrl(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}
