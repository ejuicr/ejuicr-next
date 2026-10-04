import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import {
  buildGoogleAuthUrl,
  getGoogleCredentials,
} from "@/lib/oauth/google";
import { getAppUrl } from "@/lib/url";

export const OAUTH_STATE_COOKIE = "ejuicr_oauth_state";

// @desc  Start the Google OAuth 2.0 flow
// @route GET /api/auth/google
// @access Public
export const GET = apiHandler(async (request) => {
  const credentials = getGoogleCredentials();
  if (!credentials) {
    throw new ApiError(501, "Google sign-in is not configured.");
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${getAppUrl(request)}/api/auth/google/callback`;

  (await cookies()).set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(
    buildGoogleAuthUrl(credentials, redirectUri, state),
  );
});
