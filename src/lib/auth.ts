import "server-only";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { ApiError } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { User, type User as UserDocument } from "@/lib/models/user";
import type { PublicUser } from "@/types";

export const AUTH_COOKIE = "ejuicr_token";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined. Add it to .env.local.");
  return secret;
}

export function signToken(payload: { _id: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): { _id?: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { _id?: string };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

export async function clearAuthCookie(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE);
}

/** Load the signed-in user, or null when there is no valid session. */
export async function getCurrentUser(): Promise<UserDocument | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded?._id) return null;

  await connectDB();
  try {
    return await User.findById(decoded._id);
  } catch {
    return null;
  }
}

/** Load the signed-in user or throw a 401 error. */
export async function requireUser(): Promise<UserDocument> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Not authorized.");
  return user;
}

/** Strip credentials and internal fields before sending a user to the client. */
export function toPublicUser(user: UserDocument): PublicUser {
  return {
    _id: user._id.toString(),
    email: user.email,
    authProvider: user.authProvider ?? undefined,
    twitterHandle: user.twitterHandle ?? undefined,
    googleDisplayName: user.googleDisplayName ?? undefined,
    googlePicture: user.googlePicture ?? undefined,
    twitterDisplayName: user.twitterDisplayName ?? undefined,
    twitterPicture: user.twitterPicture ?? undefined,
    hasPassword: Boolean(user.password),
    hasGoogleLinked: Boolean(user.googleId),
    hasTwitterLinked: Boolean(user.twitterId),
  };
}
