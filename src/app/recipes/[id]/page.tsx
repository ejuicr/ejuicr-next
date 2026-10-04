import RecipeLoader from "@/components/recipes/RecipeLoader";
import RequireAuth from "@/components/ui/RequireAuth";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireAuth>
      <RecipeLoader id={id} />
    </RequireAuth>
  );
}
