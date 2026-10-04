import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { clearAuthCookie, requireUser, setAuthCookie, signToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/lib/models/recipe";
import { User } from "@/lib/models/user";

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// @desc  Register a new user
// @route POST /api/user
// @access Public
export const POST = apiHandler(async (request) => {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    throw new ApiError(400, "Email or password is missing.");
  }

  await connectDB();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.password) {
      throw new ApiError(400, "User already exists.");
    }
    // Add a password to an account that was created through OAuth.
    const hashedPassword = await hashPassword(password);
    await User.updateOne({ email }, { password: hashedPassword });
    await setAuthCookie(signToken({ _id: existingUser._id.toString() }));
    return NextResponse.json(
      { _id: existingUser._id.toString(), email: existingUser.email },
      { status: 201 },
    );
  }

  const hashedPassword = await hashPassword(password);
  const user = await User.create({ email, password: hashedPassword });
  await setAuthCookie(signToken({ _id: user._id.toString() }));

  return NextResponse.json(
    { _id: user._id.toString(), email: user.email },
    { status: 201 },
  );
});

// @desc  Delete a user and all of their recipes
// @route DELETE /api/user
// @access Private
export const DELETE = apiHandler(async () => {
  const user = await requireUser();
  await connectDB();
  await Recipe.deleteMany({ author: user._id });
  await User.findByIdAndDelete(user._id);
  await clearAuthCookie();
  return NextResponse.json({ message: "Account successfully deleted." });
});
