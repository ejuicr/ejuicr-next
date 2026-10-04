import RecipesList from "@/components/recipes/RecipesList";
import RequireAuth from "@/components/ui/RequireAuth";

export default function RecipesPage() {
  return (
    <RequireAuth>
      <RecipesList />
    </RequireAuth>
  );
}
