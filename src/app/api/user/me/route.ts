import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser, toPublicUser } from "@/lib/auth";

// @desc  Get the current user's data
// @route GET /api/user/me
// @access Private
export const GET = apiHandler(async () => {
  const user = await requireUser();
  return NextResponse.json(toPublicUser(user));
});
