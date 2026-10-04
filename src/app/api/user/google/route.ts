import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

// @desc  Remove Google profile data from a user
// @route DELETE /api/user/google
// @access Private
export const DELETE = apiHandler(async () => {
  const user = await requireUser();
  await connectDB();

  const authProvider = user.authProvider ?? "";
  await User.findByIdAndUpdate(
    user._id,
    {
      googleId: "",
      googlePicture: "",
      googleDisplayName: "",
      authProvider: authProvider === "google" ? "" : authProvider,
    },
    { returnDocument: "after" },
  );

  return NextResponse.json({
    message: "Google profile data successfully removed.",
  });
});
