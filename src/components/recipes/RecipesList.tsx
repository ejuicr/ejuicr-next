"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSortDown } from "@fortawesome/free-solid-svg-icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DeleteButton from "@/components/ui/DeleteButton";
import Button from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/Messages";
import PageHeading from "@/components/ui/PageHeading";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";
import type { Recipe } from "@/types";

const sortByDate = (recipes: Recipe[]) =>
  [...recipes].sort(
    (a, b) =>
      new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime(),
  );

export default function RecipesList() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSortByTitle, setIsSortByTitle] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Recipe[]>("/api/recipes")
      .then((data) => setRecipes(sortByDate(data)))
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load recipes.",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const handleConfirmDelete = async (index: number) => {
    const target = recipes?.[index];
    if (!target) return;

    setIsLoading(true);
    try {
      await api.delete(`/api/recipes/${target._id}`);
      setRecipes(
        (current) => current?.filter((item) => item._id !== target._id) ?? null,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to delete recipe.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortByTitle = () => {
    if (!recipes) return;
    setRecipes(
      [...recipes].sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      }),
    );
    setIsSortByTitle(true);
  };

  const handleSortByDate = () => {
    if (!recipes) return;
    setRecipes(sortByDate(recipes));
    setIsSortByTitle(false);
  };

  return (
    <div>
      <PageHeading>Recipes</PageHeading>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {isLoading && <Spinner />}
      {!isLoading &&
        ((recipes && recipes.length > 0 && (
          <>
            <div className="mb-4 flex">
              <div className="grow text-[0.9rem] text-secondary">
                <Button
                  variant="link"
                  className="text-[0.9rem] text-secondary"
                  onClick={handleSortByTitle}
                >
                  Title {isSortByTitle && <FontAwesomeIcon icon={faSortDown} />}
                </Button>
              </div>
              <div className="text-right text-[0.9rem] text-secondary">
                <Button
                  variant="link"
                  className="text-[0.9rem] text-secondary"
                  onClick={handleSortByDate}
                >
                  Last Updated{" "}
                  {!isSortByTitle && <FontAwesomeIcon icon={faSortDown} />}
                </Button>
              </div>
              <div className="w-[calc(35px+1em)]" />
            </div>
            <ul className="m-0 list-none p-0">
              {recipes.map((recipe, index) => (
                <li key={recipe._id} className="mb-4 flex">
                  <div className="grow pt-2 pr-4">
                    <Link href={`/recipes/${recipe._id}`}>{recipe.name}</Link>
                  </div>
                  <div className="pt-2">
                    {recipe.updatedAt?.slice(0, 10)}
                  </div>
                  <div className="ml-4">
                    <DeleteButton
                      index={index}
                      handler={setPendingDelete}
                      label={`Delete ${recipe.name}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )) || <p className="text-center">You don&apos;t have any saved recipes.</p>)}
      {pendingDelete !== null && recipes?.[pendingDelete] && (
        <ConfirmDialog
          label={`Delete recipe ${recipes[pendingDelete].name}`}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            Are you sure you want to delete{" "}
            <strong>&ldquo;{recipes[pendingDelete].name}&rdquo;</strong>?
          </p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              className="text-base"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-red text-base"
              onClick={() => {
                const index = pendingDelete;
                setPendingDelete(null);
                void handleConfirmDelete(index);
              }}
            >
              Delete
            </button>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
