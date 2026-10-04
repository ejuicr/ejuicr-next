import { describe, expect, it } from "vitest";
import { Recipe } from "@/lib/models/recipe";
import { Settings } from "@/lib/models/settings";

describe("Recipe model indexes", () => {
  it("defines case-insensitive per-author title uniqueness", () => {
    expect(Recipe.schema.indexes()).toContainEqual([
      { author: 1, name: 1 },
      expect.objectContaining({
        unique: true,
        collation: { locale: "en", strength: 2 },
      }),
    ]);
  });
});

describe("Settings model indexes", () => {
  it("allows one settings document per user", () => {
    expect(Settings.schema.indexes()).toContainEqual([
      { user: 1 },
      expect.objectContaining({ unique: true }),
    ]);
  });
});
