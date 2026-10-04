import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/lib/models/recipe";

// @desc  Get all recipes for the current user
// @route GET /api/recipes
// @access Private
export const GET = apiHandler(async () => {
  const user = await requireUser();
  await connectDB();
  const recipes = await Recipe.find({ author: user._id });
  return NextResponse.json(recipes);
});

// @desc  Create a recipe
// @route POST /api/recipes
// @access Private
export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = (await request.json()) as { name?: string };

  const title = body.name;
  if (!title || !title.trim()) {
    throw new ApiError(400, "Recipe title must not be blank.");
  }

  await connectDB();

  // A user may not have two recipes with the same title.
  const duplicateRecipe = await Recipe.findOne({
    author: user._id,
    name: title,
  });
  if (duplicateRecipe) {
    throw new ApiError(
      400,
      `You already have a recipe named ${title}. Please use a different title.`,
    );
  }

  const recipe = await Recipe.create({ ...body, author: user._id });
  return NextResponse.json(recipe, { status: 201 });
});
