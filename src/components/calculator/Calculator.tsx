"use client";

import Ingredients from "./Ingredients";
import SaveRecipe from "./SaveRecipe";
import TargetEjuice from "./TargetEjuice";
import { useCalculator } from "./useCalculator";
import type { Recipe } from "@/types";

export default function Calculator({ recipe }: { recipe?: Recipe }) {
  const calculator = useCalculator(recipe);

  return (
    <>
      <div>
        {recipe && (
          <div className="recipe-header">
            <h2 className="text-center">{recipe.name}</h2>
            <hr className="mb-8" />
          </div>
        )}
        <TargetEjuice calculator={calculator} />
        <Ingredients calculator={calculator} />
      </div>
      <SaveRecipe calculator={calculator} recipe={recipe} />
    </>
  );
}
