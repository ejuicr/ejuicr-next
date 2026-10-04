/**
 * Placeholder for the `server-only` guard when running integration tests.
 *
 * The marker normally throws outside a React Server Component environment.
 * Integration tests exercise real server modules (db, account lifecycle)
 * outside Next's runtime, so the integration Vitest config aliases
 * `server-only` to this empty module. Production builds still use the real
 * guard.
 */
export {};
