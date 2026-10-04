/**
 * Runtime configuration shared by client components.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so they can be read
 * directly in client code.
 */

export const DONATION_LINK = process.env.NEXT_PUBLIC_DONATION_LINK ?? "";

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";

export const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL ?? "";
