import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { setAuthCookie, signToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import {
  fetchTwitterProfile,
  getTwitterCredentials,
} from "@/lib/oauth/twitter";
import { getAppUrl } from "@/lib/url";
import { TWITTER_SECRET_COOKIE, TWITTER_TOKEN_COOKIE } from "../route";

// @desc  Handle the Twitter OAuth 1.0a callback
// @route GET /api/auth/twitter/callback
// @access Public
export const GET = apiHandler(async (request) => {
  const appUrl = getAppUrl(request);

  try {
    const url = new URL(request.url);
    const oauthToken = url.searchParams.get("oauth_token");
    const verifier = url.searchParams.get("oauth_verifier");
    const denied = url.searchParams.get("denied");

    const cookieStore = await cookies();
    const storedToken = cookieStore.get(TWITTER_TOKEN_COOKIE)?.value;
    const storedSecret = cookieStore.get(TWITTER_SECRET_COOKIE)?.value;
    cookieStore.delete(TWITTER_TOKEN_COOKIE);
    cookieStore.delete(TWITTER_SECRET_COOKIE);

    if (
      denied ||
      !oauthToken ||
      !verifier ||
      !storedToken ||
      !storedSecret ||
      oauthToken !== storedToken
    ) {
      return NextResponse.redirect(`${appUrl}/?authError=twitter`);
    }

    const credentials = getTwitterCredentials();
    if (!credentials) {
      return NextResponse.redirect(`${appUrl}/?authError=twitter`);
    }

    const profile = await fetchTwitterProfile(
      credentials,
      oauthToken,
      storedSecret,
      verifier,
    );

    if (!profile.email) {
      return NextResponse.redirect(`${appUrl}/?authError=twitter-email`);
    }

    await connectDB();

    const user = await User.findOne({
      $or: [{ twitterId: profile.id }, { email: profile.email }],
    });

    let userId: string;
    let sessionVersion: number;
    if (!user) {
      const createdUser = await User.create({
        authProvider: "twitter",
        email: profile.email,
        twitterId: profile.id,
        twitterDisplayName: profile.displayName,
        twitterHandle: profile.handle,
        twitterPicture: profile.picture ?? "",
      });
      userId = createdUser._id.toString();
      sessionVersion = createdUser.sessionVersion ?? 0;
    } else {
      user.authProvider = "twitter";
      user.twitterId = profile.id;
      user.twitterDisplayName = profile.displayName;
      user.twitterHandle = profile.handle;
      user.twitterPicture = profile.picture ?? "";
      await user.save();
      userId = user._id.toString();
      sessionVersion = user.sessionVersion ?? 0;
    }

    await setAuthCookie(signToken({ _id: userId, sessionVersion }));
    return NextResponse.redirect(`${appUrl}/`);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${appUrl}/?authError=twitter`);
  }
});
