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
        {!recipe && calculator.hasSavedDefaults && (
          <p className="my-2 text-right text-[0.9rem]">
            <button
              data-testid="applyDefaultsBtn"
              type="button"
              className="bg-transparent p-0 font-normal text-brand-cyan hover:bg-transparent hover:text-brand-pink active:bg-transparent active:text-brand-pink"
              onClick={calculator.handleApplyDefaults}
            >
              Apply Saved Defaults
            </button>
          </p>
        )}
        <TargetEjuice calculator={calculator} />
        <Ingredients calculator={calculator} />
      </div>
      <SaveRecipe calculator={calculator} recipe={recipe} />
    </>
  );
}
