import { NextResponse } from "next/server";
import { ApiError, apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/lib/models/recipe";
import { parseRecipeInput } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

// @desc  Get a single recipe
// @route GET /api/recipes/:id
// @access Private
export const GET = apiHandler<RouteParams>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;

  await connectDB();
  const recipe = await Recipe.findById(id);
  if (!recipe) {
    throw new ApiError(404, "Recipe not found.");
  }
  if (recipe.author.toString() !== user._id.toString()) {
    throw new ApiError(401, "That recipe does not belong to you.");
  }

  return NextResponse.json(recipe);
});

// @desc  Update a recipe
// @route PUT /api/recipes/:id
// @access Private
export const PUT = apiHandler<RouteParams>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const body = await request.json();
  const recipeInput = parseRecipeInput(body);

  if (Object.keys(recipeInput).length === 0) {
    throw new ApiError(400, "No valid recipe fields to update.");
  }

  await connectDB();
  // Scope the update to the current owner in the query itself so ownership
  // can never be reassigned and another user's recipe is never disclosed.
  const updatedRecipe = await Recipe.findOneAndUpdate(
    { _id: id, author: user._id },
    recipeInput,
    { returnDocument: "after", runValidators: true },
  );
  if (!updatedRecipe) {
    throw new ApiError(404, "Recipe not found.");
  }

  return NextResponse.json(updatedRecipe);
});

// @desc  Delete a recipe
// @route DELETE /api/recipes/:id
// @access Private
export const DELETE = apiHandler<RouteParams>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;

  await connectDB();
  const recipe = await Recipe.findById(id);
  if (!recipe) {
    throw new ApiError(404, "Recipe not found.");
  }
  if (recipe.author.toString() !== user._id.toString()) {
    throw new ApiError(401, "User not authorized.");
  }

  const deletedRecipe = await Recipe.findByIdAndDelete(id);
  return NextResponse.json({ id: deletedRecipe?._id.toString() });
});
