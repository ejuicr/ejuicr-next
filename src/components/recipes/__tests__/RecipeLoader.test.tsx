import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/lib/client-api", () => ({ api: { get: mocks.get } }));
vi.mock("@/components/calculator/Calculator", () => ({
  default: ({ recipe }: { recipe?: { name: string } }) => (
    <div data-testid="calculator">{recipe?.name}</div>
  ),
}));

import RecipeLoader from "../RecipeLoader";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("RecipeLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays a recipe", async () => {
    mocks.get.mockResolvedValue({ _id: "a", name: "Recipe A" });

    render(<RecipeLoader id="a" />);

    expect(await screen.findByTestId("calculator")).toHaveTextContent("Recipe A");
    expect(mocks.get).toHaveBeenCalledWith("/api/recipes/a");
  });

  it("does not keep the old recipe visible when the id changes", async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    mocks.get
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender } = render(<RecipeLoader id="a" />);
    await act(async () => {
      first.resolve({ _id: "a", name: "Recipe A" });
    });
    expect(screen.getByTestId("calculator")).toHaveTextContent("Recipe A");

    rerender(<RecipeLoader id="b" />);

    expect(screen.queryByTestId("calculator")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();

    await act(async () => {
      second.resolve({ _id: "b", name: "Recipe B" });
    });
    expect(screen.getByTestId("calculator")).toHaveTextContent("Recipe B");
  });

  it("clears a previous error when a new id loads successfully", async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    mocks.get
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender } = render(<RecipeLoader id="a" />);
    await act(async () => {
      first.reject(new Error("Failed to load recipe."));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load recipe.",
    );

    rerender(<RecipeLoader id="b" />);
    await act(async () => {
      second.resolve({ _id: "b", name: "Recipe B" });
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("calculator")).toHaveTextContent("Recipe B");
  });
});
