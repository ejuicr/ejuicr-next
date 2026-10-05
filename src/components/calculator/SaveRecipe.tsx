"use client";

import { useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faSave } from "@fortawesome/free-solid-svg-icons";
import Login from "@/components/auth/Login";
import { useAuth } from "@/components/providers/AuthProvider";
import InputBorder from "@/components/ui/InputBorder";
import { ErrorMessage, SuccessMessage } from "@/components/ui/Messages";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";
import type { Recipe } from "@/types";
import {
  CALCULATOR_STORAGE_KEY,
  type CalculatorController,
} from "./useCalculator";

export default function SaveRecipe({
  calculator,
  recipe,
}: {
  calculator: CalculatorController;
  recipe?: Recipe;
}) {
  const { user, providers } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    targetPg,
    targetVg,
    targetNicStrength,
    targetAmount,
    nicConfig,
    flavors,
  } = calculator;

  const handleClickSaveRecipe = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!recipe && !recipeTitle.trim()) {
      setError("Recipe title must not be blank.");
      setIsLoading(false);
      return;
    }

    const newRecipe = {
      name: recipeTitle.trim(),
      strength: targetNicStrength,
      base: {
        pg: targetPg,
        vg: targetVg,
      },
      amount: targetAmount,
      ingredients: {
        nicotine: {
          strength: nicConfig.strength,
          base: {
            pg: nicConfig.pg,
            vg: nicConfig.vg,
          },
        },
        flavors: flavors.map((flavor) => ({
          name: flavor.name,
          percentage: flavor.percentage,
          base: {
            pg: flavor.pg,
            vg: flavor.vg,
          },
        })),
      },
    };

    try {
      if (!recipe) {
        const created = await api.post<Recipe>("/api/recipes", newRecipe);
        setSuccess(`"${created.name}" has been saved to your recipes.`);
        localStorage.removeItem(CALCULATOR_STORAGE_KEY);
      } else {
        const updated = await api.put<Recipe>(`/api/recipes/${recipe._id}`, {
          ...newRecipe,
          name: recipe.name,
        });
        setSuccess(`"${updated.name}" has been updated.`);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : recipe
            ? "Failed to update recipe."
            : "Failed to save recipe.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mt-[1em] text-[2.25rem]">
        {recipe ? "Save Changes" : "Save Recipe"}
      </h2>
      <hr />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {isLoading && <Spinner />}
      {!isLoading &&
        (user ? (
          <div className="mx-2 my-6 flex max-sm:block">
            <div className="grow pr-4 max-sm:pr-0 max-sm:pb-4">
              <InputBorder className="w-full max-sm:mx-auto max-sm:block max-sm:max-w-[260px]">
                <input
                  type="text"
                  aria-label="Recipe title"
                  placeholder="Recipe Title"
                  value={(recipe && recipe.name) || recipeTitle}
                  readOnly={Boolean(recipe)}
                  onChange={(event) =>
                    !recipe && setRecipeTitle(event.target.value)
                  }
                />
              </InputBorder>
            </div>
            <div className="max-sm:text-center">
              <button
                type="button"
                className="btn-green h-full text-[0.95rem]"
                disabled={Boolean(calculator.error)}
                title={calculator.error || undefined}
                onClick={handleClickSaveRecipe}
              >
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Save
              </button>
            </div>
          </div>
        ) : showLoginForm ? (
          <Login hideHeading onCancel={() => setShowLoginForm(false)} />
        ) : (
          <div className="row max-sm:block">
            <div className="w-1/2 max-sm:w-full">
              <p className="max-sm:px-4 max-sm:text-center">
                Sign in to your account to save this recipe for next time.
              </p>
            </div>
            <div className="w-fit pl-4 max-sm:mt-6 max-sm:w-full max-sm:p-0 max-sm:text-center">
              <ul className="m-0 list-none p-0">
                {providers.google && (
                  <li className="mb-4">
                    <a
                      href="/api/auth/google"
                      className="btn btn-white h-auto px-[0.75em] py-[0.5em] text-[0.95rem] leading-[normal]"
                    >
                      <Image
                        src="/google-logo.svg"
                        alt=""
                        width={18}
                        height={18}
                        className="mr-2"
                      />
                      Sign in with Google
                    </a>
                  </li>
                )}
                {providers.twitter && (
                  <li className="mb-4">
                    <a
                      href="/api/auth/twitter"
                      className="btn btn-black h-auto px-[0.75em] py-[0.5em] text-[0.95rem] leading-[normal]"
                    >
                      <Image
                        src="/x-logo.svg"
                        alt=""
                        width={18}
                        height={18}
                        className="mr-2"
                      />
                      Sign in with X
                    </a>
                  </li>
                )}
                <li className="mb-4">
                  <button
                    type="button"
                    className="inline-block h-auto px-[0.75em] py-[0.5em] text-[0.95rem] leading-[normal]"
                    onClick={() => setShowLoginForm(true)}
                  >
                    <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                    Sign in with Email
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ))}
    </div>
  );
}
