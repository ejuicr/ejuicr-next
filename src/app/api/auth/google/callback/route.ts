import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { setAuthCookie, signToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  getGoogleCredentials,
} from "@/lib/oauth/google";
import { getAppUrl } from "@/lib/url";
import { OAUTH_STATE_COOKIE } from "../route";

// @desc  Handle the Google OAuth 2.0 callback
// @route GET /api/auth/google/callback
// @access Public
export const GET = apiHandler(async (request) => {
  const appUrl = getAppUrl(request);

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookieStore = await cookies();
    const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
    cookieStore.delete(OAUTH_STATE_COOKIE);

    if (!code || !state || !storedState || state !== storedState) {
      return NextResponse.redirect(`${appUrl}/?authError=google`);
    }

    const credentials = getGoogleCredentials();
    if (!credentials) {
      return NextResponse.redirect(`${appUrl}/?authError=google`);
    }

    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const accessToken = await exchangeGoogleCode(
      credentials,
      code,
      redirectUri,
    );
    const profile = await fetchGoogleProfile(accessToken);

    await connectDB();

    // Established links are matched by Google's immutable subject ID first,
    // so a linked account never depends on the provider email.
    let user = await User.findOne({ googleId: profile.sub });
    if (!user) {
      if (!profile.email) {
        return NextResponse.redirect(`${appUrl}/?authError=google-email`);
      }
      // An unverified provider email must not be attached to an existing
      // account or used to key a new one.
      if (!profile.emailVerified) {
        return NextResponse.redirect(
          `${appUrl}/?authError=google-email-unverified`,
        );
      }
      user = await User.findOne({ email: profile.email });
    }

    let userId: string;
    let sessionVersion: number;
    if (!user) {
      const createdUser = await User.create({
        authProvider: "google",
        email: profile.email,
        googleId: profile.sub,
        googleDisplayName: profile.name ?? "",
        googlePicture: profile.picture ?? "",
      });
      userId = createdUser._id.toString();
      sessionVersion = createdUser.sessionVersion ?? 0;
    } else {
      user.authProvider = "google";
      user.googleId = profile.sub;
      user.googleDisplayName = profile.name ?? "";
      user.googlePicture = profile.picture ?? "";
      await user.save();
      userId = user._id.toString();
      sessionVersion = user.sessionVersion ?? 0;
    }

    await setAuthCookie(signToken({ _id: userId, sessionVersion }));
    return NextResponse.redirect(`${appUrl}/`);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${appUrl}/?authError=google`);
  }
});
