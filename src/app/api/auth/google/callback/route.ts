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

    if (!profile.email) {
      return NextResponse.redirect(`${appUrl}/?authError=google-email`);
    }

    await connectDB();

    const user = await User.findOne({
      $or: [{ googleId: profile.sub }, { email: profile.email }],
    });

    let userId: string;
    if (!user) {
      const createdUser = await User.create({
        authProvider: "google",
        email: profile.email,
        googleId: profile.sub,
        googleDisplayName: profile.name ?? "",
        googlePicture: profile.picture ?? "",
      });
      userId = createdUser._id.toString();
    } else {
      user.authProvider = "google";
      user.googleId = profile.sub;
      user.googleDisplayName = profile.name ?? "";
      user.googlePicture = profile.picture ?? "";
      await user.save();
      userId = user._id.toString();
    }

    await setAuthCookie(signToken({ _id: userId }));
    return NextResponse.redirect(`${appUrl}/`);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${appUrl}/?authError=google`);
  }
});
