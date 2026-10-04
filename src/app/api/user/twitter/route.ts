import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
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
  // The filter only matches while another sign-in method remains, so two
  // simultaneous unlink requests cannot leave the account locked out.
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      $or: [
        { password: { $type: "string", $ne: "" } },
        { googleId: { $type: "string", $ne: "" } },
      ],
    },
    {
      twitterId: "",
      twitterHandle: "",
      twitterPicture: "",
      twitterDisplayName: "",
      authProvider: authProvider === "twitter" ? "" : authProvider,
    },
    { returnDocument: "after" },
  );
  if (!updatedUser) {
    throw new ApiError(
      400,
      "You must keep at least one way to sign in. Set a password before unlinking this account.",
    );
  }

  return NextResponse.json({
    message: "Twitter profile data successfully removed.",
  });
});
