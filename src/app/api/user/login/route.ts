import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { setAuthCookie, signToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { capitalizeFirstLetter } from "@/lib/helpers";
import { User } from "@/lib/models/user";

// @desc  Authenticate a user
// @route POST /api/user/login
// @access Public
export const POST = apiHandler(async (request) => {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    throw new ApiError(400, "Please fill out all fields.");
  }

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "Unable to find an account with that email.");
  }

  // Check for non-existent password (OAuth users)
  if (!user.password) {
    throw new ApiError(
      400,
      `Sign in with ${capitalizeFirstLetter(
        user.authProvider ?? "your provider",
      )} instead or sign up using this email to add a password.`,
    );
  }

  if (!(await bcrypt.compare(password, user.password))) {
    throw new ApiError(400, "Incorrect password.");
  }

  await setAuthCookie(signToken({ _id: user._id.toString() }));

  return NextResponse.json({
    _id: user._id.toString(),
    email: user.email,
  });
});
