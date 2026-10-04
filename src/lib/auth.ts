import "server-only";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { ApiError } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { User, type User as UserDocument } from "@/lib/models/user";
import type { PublicUser } from "@/types";

export const AUTH_COOKIE = "ejuicr_token";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SESSION_PURPOSE = "session";
const RESET_PASSWORD_PURPOSE = "password-reset";

interface SessionTokenPayload {
  _id: string;
  sessionVersion: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined. Add it to .env.local.");
  return secret;
}

/**
 * Sign a session token. `sessionVersion` must match the user's current
 * version or the session is rejected, so bumping the version revokes every
 * previously issued session token.
 */
export function signToken(payload: SessionTokenPayload): string {
  return jwt.sign(
    { ...payload, purpose: SESSION_PURPOSE },
    getJwtSecret(),
    { expiresIn: "30d" },
  );
}

/**
 * Verify a session token. Tokens issued before session versioning have no
 * `purpose` or `sessionVersion`; they stay valid for accounts that never
 * bumped their version. Tokens minted for other purposes are rejected.
 */
export function verifyToken(
  token: string,
): { _id?: string; sessionVersion?: number } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      _id?: string;
      purpose?: string;
      sessionVersion?: number;
    };
    if (decoded.purpose !== undefined && decoded.purpose !== SESSION_PURPOSE) {
      return null;
    }
    return { _id: decoded._id, sessionVersion: decoded.sessionVersion };
  } catch {
    return null;
  }
}

/** Sign a single-use password-reset token bound to a stored nonce. */
export function signResetPasswordToken(payload: {
  id: string;
  nonce: string;
}): string {
  return jwt.sign(
    { id: payload.id, purpose: RESET_PASSWORD_PURPOSE, nonce: payload.nonce },
    getJwtSecret(),
    { expiresIn: "1h" },
  );
}

/**
 * Verify a base64url password-reset token, enforcing its explicit purpose.
 * Returns null for malformed, expired, or non-reset tokens.
 */
export function verifyResetPasswordToken(
  encodedToken: string,
): { id: string; nonce: string } | null {
  try {
    const token = Buffer.from(encodedToken, "base64url").toString();
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id?: string;
      purpose?: string;
      nonce?: string;
    };
    if (
      decoded.purpose !== RESET_PASSWORD_PURPOSE ||
      !decoded.id ||
      !decoded.nonce
    ) {
      return null;
    }
    return { id: decoded.id, nonce: decoded.nonce };
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
    const user = await User.findById(decoded._id);
    if (!user) return null;
    // A password change bumps the user's version, invalidating old tokens.
    if ((decoded.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
      return null;
    }
    return user;
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

/**
 * Find a user by email. New accounts are stored with normalized lowercase
 * addresses, but legacy documents may keep their original casing, so an
 * exact match is preferred before falling back to the lowercase form.
 */
export async function findUserByEmail(
  email: string,
): Promise<UserDocument | null> {
  const trimmed = email.trim();
  await connectDB();

  const exact = await User.findOne({ email: trimmed });
  if (exact || trimmed === trimmed.toLowerCase()) return exact;

  return User.findOne({ email: trimmed.toLowerCase() });
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
