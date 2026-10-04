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

// @desc  Update the user's password using the current password
// @route POST /api/user/change-password
// @access Private
export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = (await request.json()) as {
    password?: unknown;
    newPassword?: unknown;
  };

  const newPassword = requirePassword(
    body?.newPassword,
    "New password is missing or invalid.",
  );

  if (
    typeof body?.password !== "string" ||
    body.password.length === 0 ||
    !user.password ||
    !(await bcrypt.compare(body.password, user.password))
  ) {
    throw new ApiError(400, "Incorrect password.");
  }

  await connectDB();
  const hashedPassword = await hashPassword(newPassword);
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

  // Keep this session signed in while the version bump revokes every other
  // token that was issued before the password change.
  await setAuthCookie(
    signToken({
      _id: updatedUser._id.toString(),
      sessionVersion: updatedUser.sessionVersion ?? 0,
    }),
  );

  return NextResponse.json({ message: "Your password has been changed." });
});
