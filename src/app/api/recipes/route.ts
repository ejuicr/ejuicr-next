import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/lib/models/recipe";
import { parseRecipeInput } from "@/lib/validation";

// @desc  Get all recipes for the current user
// @route GET /api/recipes
// @access Private
export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  await connectDB();

  const url = new URL(request.url);
  if (url.searchParams.get("count") === "1") {
    const count = await Recipe.countDocuments({ author: user._id });
    return NextResponse.json({ count });
  }

  // List views only need the summary fields.
  const recipes = await Recipe.find({ author: user._id })
    .select("name updatedAt")
    .lean();
  return NextResponse.json(recipes);
});

// @desc  Create a recipe
// @route POST /api/recipes
// @access Private
export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = await request.json();
  const recipeInput = parseRecipeInput(body);

  const title = recipeInput.name;
  if (!title) {
    throw new ApiError(400, "Recipe title must not be blank.");
  }

  await connectDB();

  // A user may not have two recipes with the same title, ignoring case.
  const duplicateRecipe = await Recipe.findOne({
    author: user._id,
    name: title,
  }).collation({ locale: "en", strength: 2 });
  if (duplicateRecipe) {
    throw new ApiError(
      400,
      `You already have a recipe named ${title}. Please use a different title.`,
    );
  }

  const recipe = await Recipe.create({ ...recipeInput, author: user._id });
  return NextResponse.json(recipe, { status: 201 });
});
