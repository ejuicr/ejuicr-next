import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

// @desc  Remove Twitter account data from a user
// @route DELETE /api/user/twitter
// @access Private
export const DELETE = apiHandler(async () => {
  const user = await requireUser();
  await connectDB();

  const authProvider = user.authProvider ?? "";
  await User.findByIdAndUpdate(
    user._id,
    {
      twitterId: "",
      twitterHandle: "",
      twitterPicture: "",
      twitterDisplayName: "",
      authProvider: authProvider === "twitter" ? "" : authProvider,
    },
    { returnDocument: "after" },
  );

  return NextResponse.json({
    message: "Twitter profile data successfully removed.",
  });
});
