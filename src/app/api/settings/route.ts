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

  const existing = await Settings.findOne({ user: user._id });
  if (!existing) {
    const newSettings = await Settings.create({
      ...settingsInput,
      user: user._id,
    });
    return NextResponse.json(newSettings);
  }

  if (Object.keys(settingsInput).length === 0) {
    throw new ApiError(400, "No valid settings fields to update.");
  }

  const updatedSettings = await Settings.findOneAndUpdate(
    { user: user._id },
    settingsInput,
    { returnDocument: "after", runValidators: true },
  );
  return NextResponse.json(updatedSettings);
});
