import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// @desc  Update the user's password using the current password
// @route POST /api/user/change-password
// @access Private
export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const { password, newPassword } = (await request.json()) as {
    password?: string;
    newPassword?: string;
  };

  if (!newPassword || newPassword.length < 6 || newPassword.length > 250) {
    throw new ApiError(400, "New password is missing or invalid.");
  }

  if (!user.password || !(await bcrypt.compare(password ?? "", user.password))) {
    throw new ApiError(400, "Incorrect password.");
  }

  await connectDB();
  const hashedPassword = await hashPassword(newPassword);
  await User.findByIdAndUpdate(
    user._id,
    { password: hashedPassword },
    { returnDocument: "after" },
  );

  return NextResponse.json({ message: "Your password has been changed." });
});
