import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { getMailer } from "@/lib/mailer";
import { User } from "@/lib/models/user";
import { getAppUrl } from "@/lib/url";

// @desc  Create and send a reset password token
// @route POST /api/user/reset-password
// @access Public
export const POST = apiHandler(async (request) => {
  const { email } = (await request.json()) as { email?: string };
  if (!email) {
    throw new ApiError(400, "Email is missing.");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined.");

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "Unable to find an account with that email.");
  }

  // Generate a reset token and encode it in a URL-safe base64 format
  const token = jwt.sign({ id: user._id.toString() }, secret, {
    expiresIn: "1h",
  });
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
