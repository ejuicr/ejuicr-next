import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Settings } from "@/lib/models/settings";
import { parseSettingsInput } from "@/lib/validation";

// @desc  Get the current user's settings
// @route GET /api/settings
// @access Private
export const GET = apiHandler(async () => {
  const user = await requireUser();
  await connectDB();

  const settings = await Settings.findOne({ user: user._id });
  if (!settings) return NextResponse.json({});
  return NextResponse.json(settings);
});

// @desc  Update the current user's settings
// @route POST /api/settings
// @access Private
export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = await request.json();
  const settingsInput = parseSettingsInput(body);

  await connectDB();

  // An empty body may create defaults on the first save, but must not be
  // accepted as an "update" when settings already exist.
  if (Object.keys(settingsInput).length === 0) {
    const existing = await Settings.exists({ user: user._id });
    if (existing) {
      throw new ApiError(400, "No valid settings fields to update.");
    }
  }

  // Atomic upsert plus the unique user index guarantees a single settings
  // document per user, even for simultaneous first saves.
  const settings = await Settings.findOneAndUpdate(
    { user: user._id },
    { $set: settingsInput },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
  return NextResponse.json(settings);
});
