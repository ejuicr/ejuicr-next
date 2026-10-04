import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import {
  createTwitterAuthLink,
  getTwitterCredentials,
} from "@/lib/oauth/twitter";
import { getAppUrl } from "@/lib/url";

export const TWITTER_TOKEN_COOKIE = "ejuicr_twitter_token";
export const TWITTER_SECRET_COOKIE = "ejuicr_twitter_secret";

// @desc  Start the Twitter OAuth 1.0a flow
// @route GET /api/auth/twitter
// @access Public
export const GET = apiHandler(async (request) => {
  const appUrl = getAppUrl(request);

  const credentials = getTwitterCredentials();
  if (!credentials) {
    throw new ApiError(501, "Twitter sign-in is not configured.");
  }

  const callbackUrl = `${appUrl}/api/auth/twitter/callback`;

  let link;
  try {
    link = await createTwitterAuthLink(credentials, callbackUrl);
  } catch (error) {
    // Most commonly the callback URL is not registered in the Twitter app.
    console.error(error);
    return NextResponse.redirect(`${appUrl}/?authError=twitter`);
  }

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  };
  cookieStore.set(TWITTER_TOKEN_COOKIE, link.oauthToken, options);
  cookieStore.set(TWITTER_SECRET_COOKIE, link.oauthTokenSecret, options);

  return NextResponse.redirect(link.url);
});
