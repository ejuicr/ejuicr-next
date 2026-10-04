import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { getAppUrl } from "@/lib/url";

// @desc  Twitter OAuth failure landing
// @route GET /api/auth/twitter/failure
// @access Public
export const GET = apiHandler(async (request) => {
  return NextResponse.redirect(`${getAppUrl(request)}/?authError=twitter`);
});
