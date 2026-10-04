"use client";

import { useEffect, useState } from "react";
import Calculator from "@/components/calculator/Calculator";
import { ErrorMessage } from "@/components/ui/Messages";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";
import type { Recipe } from "@/types";

/**
 * Loads a recipe. The request state is remounted when the ID changes so a
 * previous recipe or error can never linger while another one loads.
 */
export default function RecipeLoader({ id }: { id: string }) {
  return <RecipeRequest key={id} id={id} />;
}

function RecipeRequest({ id }: { id: string }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get<Recipe>(`/api/recipes/${id}`)
      .then((data) => {
        if (!cancelled) setRecipe(data);
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Failed to load recipe.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) return <Spinner />;
  if (error || !recipe) {
    return (
      <ErrorMessage>{error || "Recipe not found."}</ErrorMessage>
    );
  }
  return <Calculator key={recipe._id} recipe={recipe} />;
}
