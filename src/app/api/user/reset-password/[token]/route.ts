import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// @desc  Update the user's password using a reset token
// @route POST /api/user/reset-password/:token
// @access Public
export const POST = apiHandler<{
  params: Promise<{ token: string }>;
}>(async (request, { params }) => {
  const { token } = await params;
  const { password } = (await request.json()) as { password?: string };

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined.");

  // Validate the reset token
  let decoded: { id?: string };
  try {
    decoded = jwt.verify(
      Buffer.from(token, "base64url").toString(),
      secret,
    ) as { id?: string };
  } catch {
    throw new ApiError(400, "Invalid or expired token.");
  }

  if (!decoded.id) {
    throw new ApiError(400, "Invalid or expired token.");
  }

  if (!password || password.length < 6 || password.length > 250) {
    throw new ApiError(400, "Password is missing or invalid.");
  }

  await connectDB();
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(404, "Unable to find user account.");
  }

  const hashedPassword = await hashPassword(password);
  await User.findByIdAndUpdate(
    user._id,
    { password: hashedPassword },
    { returnDocument: "after" },
  );

  return NextResponse.json({ message: "Your password has been changed." });
});
