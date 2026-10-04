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

    // Established links are matched by Twitter's immutable ID first, so a
    // linked account never resolves through an email that belongs to a
    // different account.
    let user = await User.findOne({ twitterId: profile.id });
    if (!user) {
      user = await User.findOne({ email: profile.email });
      // Email-based linking must not silently move a Twitter identity that is
      // already attached to another account.
      if (user?.twitterId && user.twitterId !== profile.id) {
        return NextResponse.redirect(`${appUrl}/?authError=twitter-conflict`);
      }
    }

    const profileFields = {
      authProvider: "twitter",
      twitterId: profile.id,
      twitterDisplayName: profile.displayName,
      twitterHandle: profile.handle,
      twitterPicture: profile.picture ?? "",
    };

    let userId: string;
    let sessionVersion: number;
    if (!user) {
      const createdUser = await User.create({
        ...profileFields,
        email: profile.email,
      });
      userId = createdUser._id.toString();
      sessionVersion = createdUser.sessionVersion ?? 0;
    } else if (user.twitterId === profile.id) {
      user.set(profileFields);
      await user.save();
      userId = user._id.toString();
      sessionVersion = user.sessionVersion ?? 0;
    } else {
      // Claiming an unlinked account by email is atomic: the filter only
      // matches while no other Twitter identity has been attached, so two
      // simultaneous links cannot both succeed.
      const linkedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [
            { twitterId: { $exists: false } },
            { twitterId: null },
            { twitterId: "" },
            { twitterId: profile.id },
          ],
        },
        { $set: profileFields },
        { returnDocument: "after" },
      );
      if (!linkedUser) {
        return NextResponse.redirect(`${appUrl}/?authError=twitter-conflict`);
      }
      userId = linkedUser._id.toString();
      sessionVersion = linkedUser.sessionVersion ?? 0;
    }

    await setAuthCookie(signToken({ _id: userId, sessionVersion }));
    return NextResponse.redirect(`${appUrl}/`);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${appUrl}/?authError=twitter`);
  }
});
