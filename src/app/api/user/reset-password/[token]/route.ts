import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { verifyResetPasswordToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { requirePassword } from "@/lib/validation";

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
  const body = (await request.json()) as { password?: unknown };

  const reset = verifyResetPasswordToken(token);
  if (!reset) {
    throw new ApiError(400, "Invalid or expired token.");
  }

  const password = requirePassword(body?.password);

  await connectDB();
  const hashedPassword = await hashPassword(password);

  // Atomic single-use consumption: the nonce is part of the filter, so a
  // repeated or concurrent use of the same link matches nothing. Bumping the
  // session version revokes every existing session.
  const updatedUser = await User.findOneAndUpdate(
    { _id: reset.id, passwordResetNonce: reset.nonce },
    {
      $set: { password: hashedPassword, passwordResetNonce: null },
      $inc: { sessionVersion: 1 },
    },
    { returnDocument: "after" },
  );
  if (!updatedUser) {
    throw new ApiError(
      400,
      "This reset link is invalid or has already been used.",
    );
  }

  return NextResponse.json({ message: "Your password has been changed." });
});
