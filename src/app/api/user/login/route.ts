import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { findUserByEmail, setAuthCookie, signToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { capitalizeFirstLetter } from "@/lib/helpers";
import { requireEmail, requireNonEmptyString } from "@/lib/validation";

// @desc  Authenticate a user
// @route POST /api/user/login
// @access Public
export const POST = apiHandler(async (request) => {
  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
  };

  const email = requireEmail(body?.email, "Please fill out all fields.");
  const password = requireNonEmptyString(
    body?.password,
    "Please fill out all fields.",
  );

  await connectDB();

  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(400, "Unable to find an account with that email.");
  }

  // Check for non-existent password (OAuth users)
  if (!user.password) {
    const provider =
      user.authProvider ||
      (user.googleId ? "google" : user.twitterId ? "twitter" : "");
    throw new ApiError(
      400,
      `Sign in with ${capitalizeFirstLetter(
        provider || "your provider",
      )} instead. You can set a password from My Account after signing in.`,
    );
  }

  if (!(await bcrypt.compare(password, user.password))) {
    throw new ApiError(400, "Incorrect password.");
  }

  await setAuthCookie(
    signToken({
      _id: user._id.toString(),
      sessionVersion: user.sessionVersion ?? 0,
    }),
  );

  return NextResponse.json({
    _id: user._id.toString(),
    email: user.email,
  });
});
