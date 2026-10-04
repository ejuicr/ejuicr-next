import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { clearAuthCookie } from "@/lib/auth";

// @desc  Clear the session cookie
// @route POST /api/user/logout
// @access Public
export const POST = apiHandler(async () => {
  await clearAuthCookie();
  return NextResponse.json({ message: "Logged out." });
});
