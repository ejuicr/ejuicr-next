"use client";

import Ingredients from "./Ingredients";
import SaveRecipe from "./SaveRecipe";
import TargetEjuice from "./TargetEjuice";
import { useCalculator } from "./useCalculator";
import Button from "@/components/ui/Button";
import type { Recipe } from "@/types";

export default function Calculator({ recipe }: { recipe?: Recipe }) {
  const calculator = useCalculator(recipe);

  return (
    <>
      <div>
        {recipe ? (
          <div className="recipe-header">
            <h1 className="text-center">{recipe.name}</h1>
            <hr className="mb-8" />
          </div>
        ) : (
          <h1 className="sr-only">ejuicr calculator</h1>
        )}
        {!recipe && calculator.hasSavedDefaults && (
          <p className="my-2 text-right text-[0.9rem]">
            <Button
              data-testid="applyDefaultsBtn"
              variant="link"
              onClick={calculator.handleApplyDefaults}
            >
              Apply Saved Defaults
            </Button>
          </p>
        )}
        <TargetEjuice calculator={calculator} />
        <Ingredients calculator={calculator} />
      </div>
      <SaveRecipe calculator={calculator} recipe={recipe} />
    </>
  );
}
