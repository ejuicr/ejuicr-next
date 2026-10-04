import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { requireUser, setAuthCookie, signToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { requirePassword } from "@/lib/validation";

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// @desc  Set an initial password for an account that signs in with a provider
// @route POST /api/user/set-password
// @access Private
export const POST = apiHandler(async (request) => {
  const user = await requireUser();

  // Setting an initial password must never overwrite an existing one; accounts
  // that already have a password must use change-password with that password.
  if (user.password) {
    throw new ApiError(
      400,
      "This account already has a password. Use change password instead.",
    );
  }

  const body = (await request.json()) as { password?: unknown };
  const password = requirePassword(body?.password);

  await connectDB();
  const hashedPassword = await hashPassword(password);
  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      $set: { password: hashedPassword },
      $inc: { sessionVersion: 1 },
    },
    { returnDocument: "after" },
  );
  if (!updatedUser) {
    throw new ApiError(401, "Not authorized.");
  }

  // Adding a password is a credential change: keep this session and revoke
  // any other token issued before it.
  await setAuthCookie(
    signToken({
      _id: updatedUser._id.toString(),
      sessionVersion: updatedUser.sessionVersion ?? 0,
    }),
  );

  return NextResponse.json({ message: "Your password has been set." });
});
