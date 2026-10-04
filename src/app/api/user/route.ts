import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import {
  clearAuthCookie,
  findUserByEmail,
  requireUser,
  setAuthCookie,
  signToken,
} from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/lib/models/recipe";
import { Settings } from "@/lib/models/settings";
import { User } from "@/lib/models/user";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { requireEmail, requirePassword } from "@/lib/validation";

const SIGNUP_IP_RULE = { limit: 10, windowMs: 15 * 60 * 1000 };
const SIGNUP_EMAIL_RULE = { limit: 3, windowMs: 15 * 60 * 1000 };

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// @desc  Register a new user
// @route POST /api/user
// @access Public
export const POST = apiHandler(async (request) => {
  enforceRateLimit(`signup:ip:${getClientIp(request)}`, SIGNUP_IP_RULE);

  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
  };

  const email = requireEmail(body?.email, "Email or password is missing.");
  enforceRateLimit(`signup:email:${email.toLowerCase()}`, SIGNUP_EMAIL_RULE);
  const password = requirePassword(body?.password);

  await connectDB();

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    // Existing accounts must not be claimable through public signup. Accounts
    // created through OAuth add a password with the authenticated
    // set-password endpoint instead.
    throw new ApiError(400, "User already exists.");
  }

  const hashedPassword = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
  });
  await setAuthCookie(
    signToken({
      _id: user._id.toString(),
      sessionVersion: user.sessionVersion ?? 0,
    }),
  );

  return NextResponse.json(
    { _id: user._id.toString(), email: user.email },
    { status: 201 },
  );
});

// @desc  Delete a user and all of their recipes
// @route DELETE /api/user
// @access Private
export const DELETE = apiHandler(async () => {
  const user = await requireUser();
  await connectDB();
  // Remove dependent documents before the account so a partial failure leaves
  // the account (and a retry) intact.
  await Promise.all([
    Recipe.deleteMany({ author: user._id }),
    Settings.deleteMany({ user: user._id }),
  ]);
  await User.findByIdAndDelete(user._id);
  await clearAuthCookie();
  return NextResponse.json({ message: "Account successfully deleted." });
});
