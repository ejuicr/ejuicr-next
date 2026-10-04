import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { findUserByEmail, signResetPasswordToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getMailer } from "@/lib/mailer";
import { User } from "@/lib/models/user";
import { getAppUrl } from "@/lib/url";
import { requireEmail } from "@/lib/validation";

// @desc  Create and send a reset password token
// @route POST /api/user/reset-password
// @access Public
export const POST = apiHandler(async (request) => {
  const body = (await request.json()) as { email?: unknown };
  const email = requireEmail(body?.email);

  await connectDB();
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(400, "Unable to find an account with that email.");
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

  return NextResponse.json({ message: "Reset password email sent." });
});
