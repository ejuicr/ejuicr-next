import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/client-api", () => ({
  api: { get: mocks.get, delete: mocks.delete },
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import RecipesList from "../RecipesList";

describe("RecipesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes sorting as keyboard-operable buttons", async () => {
    mocks.get.mockResolvedValue([
      { _id: "r1", name: "Mango Mix", updatedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    render(<RecipesList />);

    expect(await screen.findByRole("button", { name: /title/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /last updated/i }),
    ).toBeInTheDocument();
  });
});
