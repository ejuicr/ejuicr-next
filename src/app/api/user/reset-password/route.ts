import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { findUserByEmail, signResetPasswordToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getMailer } from "@/lib/mailer";
import { User } from "@/lib/models/user";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/url";
import { requireEmail } from "@/lib/validation";

const RESET_IP_RULE = { limit: 10, windowMs: 15 * 60 * 1000 };
const RESET_EMAIL_RULE = { limit: 3, windowMs: 15 * 60 * 1000 };

// The same response is returned whether or not the account exists so reset
// requests cannot be used to discover addresses.
const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, a reset link has been sent.";

// @desc  Create and send a reset password token
// @route POST /api/user/reset-password
// @access Public
export const POST = apiHandler(async (request) => {
  enforceRateLimit(`reset:ip:${getClientIp(request)}`, RESET_IP_RULE);

  const body = (await request.json()) as { email?: unknown };
  const email = requireEmail(body?.email);
  enforceRateLimit(
    `reset:email:${email.toLowerCase()}`,
    RESET_EMAIL_RULE,
  );

  await connectDB();
  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ message: GENERIC_RESET_MESSAGE });
  }

  // Rotate a single-use nonce so only the latest reset link works, then sign
  // a purpose-bound token that the reset route consumes atomically.
  const nonce = randomUUID();
  await User.updateOne({ _id: user._id }, { passwordResetNonce: nonce });
  const token = signResetPasswordToken({ id: user._id.toString(), nonce });
  const encodedToken = Buffer.from(token).toString("base64url");

  const link = `${getAppUrl(request)}/update-password/${encodedToken}`;
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: email,
    subject: "Reset Password",
    text:
      "Click the link below to set a new password:\n\n" +
      link +
      "\n\nThis link will expire in 1 hour." +
      "\n\nIf you did not request a password reset, please ignore this message." +
      "\n\nRegards,\nejuicr",
  };

  const mailer = getMailer();
  if (!mailer) {
    throw new ApiError(500, "Failed to send reset password email.");
  }

  try {
    await mailer.sendMail(mailOptions);
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to send reset password email.");
  }

  return NextResponse.json({ message: GENERIC_RESET_MESSAGE });
});
