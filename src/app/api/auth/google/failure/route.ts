import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { getAppUrl } from "@/lib/url";

// @desc  Google OAuth failure landing
// @route GET /api/auth/google/failure
// @access Public
export const GET = apiHandler(async (request) => {
  return NextResponse.redirect(`${getAppUrl(request)}/?authError=google`);
});
