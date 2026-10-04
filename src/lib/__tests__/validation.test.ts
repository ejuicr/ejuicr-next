import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  parseRecipeInput,
  parseSettingsInput,
  requireEmail,
  requireNonEmptyString,
  requirePassword,
} from "@/lib/validation";

function captureError(fn: () => unknown): ApiError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("Expected an ApiError to be thrown.");
}

describe("requireNonEmptyString", () => {
  it("returns the original value", () => {
    expect(requireNonEmptyString("secret", "missing")).toBe("secret");
  });

  it("rejects non-strings and empty strings", () => {
    expect(captureError(() => requireNonEmptyString(123, "missing")).status).toBe(
      400,
    );
    expect(captureError(() => requireNonEmptyString("", "missing")).status).toBe(
      400,
    );
    expect(captureError(() => requireNonEmptyString(undefined, "missing")).message).toBe(
      "missing",
    );
  });
});

describe("requireEmail", () => {
  it("trims and preserves casing", () => {
    expect(requireEmail("  User@Example.com ")).toBe("User@Example.com");
  });

  it("rejects missing and non-string values with the caller's message", () => {
    expect(captureError(() => requireEmail("", "Email is missing.")).message).toBe(
      "Email is missing.",
    );
    expect(captureError(() => requireEmail(42, "Email is missing.")).message).toBe(
      "Email is missing.",
    );
  });

  it("rejects malformed addresses", () => {
    for (const value of ["not-an-email", "nope@", "@nope.com", "a b@c.com"]) {
      expect(captureError(() => requireEmail(value)).message).toBe(
        "Email is invalid.",
      );
    }
  });
});

describe("requirePassword", () => {
  it("accepts passwords within the bcrypt byte limit", () => {
    expect(requirePassword("a".repeat(PASSWORD_MIN_LENGTH))).toHaveLength(6);
    expect(requirePassword("a".repeat(PASSWORD_MAX_BYTES))).toHaveLength(72);
    // Multibyte characters count by their UTF-8 size: 36 * 2 = 72 bytes.
    expect(requirePassword("é".repeat(36))).toHaveLength(36);
  });

  it("rejects non-strings, short passwords, and passwords over 72 bytes", () => {
    for (const value of [
      undefined,
      null,
      123456,
      "short",
      "a".repeat(73),
      "é".repeat(37),
    ]) {
      const error = captureError(() => requirePassword(value, "bad password"));
      expect(error.status).toBe(400);
      expect(error.message).toBe("bad password");
    }
  });
});

const validRecipe = {
  name: "  Mango Mix  ",
  strength: 6,
  base: { pg: 30, vg: 70 },
  amount: 30,
  ingredients: {
    nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
    flavors: [
      { name: "  Mango  ", percentage: 8, base: { pg: 100, vg: 0 } },
    ],
  },
};

describe("parseRecipeInput", () => {
  it("rebuilds a valid payload and trims names", () => {
    expect(parseRecipeInput(validRecipe)).toEqual({
      name: "Mango Mix",
      strength: 6,
      base: { pg: 30, vg: 70 },
      amount: 30,
      ingredients: {
        nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
        flavors: [
          { name: "Mango", percentage: 8, base: { pg: 100, vg: 0 } },
        ],
      },
    });
  });

  it("ignores internal fields and Mongo update operators", () => {
    expect(
      parseRecipeInput({
        ...validRecipe,
        _id: "injected-id",
        author: "injected-author",
        createdAt: "2020-01-01",
        $set: { author: "injected-author" },
        $unset: { amount: "" },
      }),
    ).toEqual(parseRecipeInput(validRecipe));

    expect(
      parseRecipeInput({
        author: "injected-author",
        $set: { author: "injected-author" },
      }),
    ).toEqual({});
  });

  it("rejects non-object bodies", () => {
    for (const value of [null, undefined, "recipe", 42, []]) {
      expect(captureError(() => parseRecipeInput(value)).message).toBe(
        "Invalid recipe data.",
      );
    }
  });

  it("rejects blank titles and invalid numbers", () => {
    expect(
      captureError(() => parseRecipeInput({ name: "   " })).message,
    ).toBe("Recipe title must not be blank.");
    expect(
      captureError(() => parseRecipeInput({ name: "ok", strength: -1 })).status,
    ).toBe(400);
    expect(
      captureError(() => parseRecipeInput({ name: "ok", strength: "6" })).status,
    ).toBe(400);
    expect(
      captureError(() => parseRecipeInput({ name: "ok", amount: Infinity }))
        .status,
    ).toBe(400);
  });

  it("requires complete PG/VG ratios within range", () => {
    expect(
      captureError(() => parseRecipeInput({ base: { pg: 30 } })).message,
    ).toMatch(/PG\/VG ratio is invalid/);
    expect(
      captureError(() => parseRecipeInput({ base: { pg: 30, vg: 101 } })).status,
    ).toBe(400);
    expect(
      captureError(() =>
        parseRecipeInput({
          ingredients: { nicotine: { strength: 100, base: { pg: 50 } } },
        }),
      ).status,
    ).toBe(400);
  });

  it("requires complete ingredient shapes", () => {
    expect(
      captureError(() => parseRecipeInput({ ingredients: { nicotine: {} } }))
        .message,
    ).toBe("Recipe ingredients are invalid.");
    expect(
      captureError(() =>
        parseRecipeInput({
          ingredients: {
            nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
            flavors: [{ name: "", percentage: 5, base: { pg: 100, vg: 0 } }],
          },
        }),
      ).message,
    ).toBe("Flavor name must not be blank.");
    expect(
      captureError(() =>
        parseRecipeInput({
          ingredients: {
            nicotine: { strength: 1001, base: { pg: 100, vg: 0 } },
            flavors: [],
          },
        }),
      ).status,
    ).toBe(400);
  });
});

const validSettings = {
  theme: "dark",
  units: "both",
  base: { pg: 30, vg: 70 },
  strength: 6,
  amount: 30,
  zeroNicotineMode: false,
  nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
  flavor: { percentage: 5, base: { pg: 100, vg: 0 } },
};

describe("parseSettingsInput", () => {
  it("rebuilds a valid payload", () => {
    expect(parseSettingsInput(validSettings)).toEqual(validSettings);
  });

  it("ignores the owning user and update operators", () => {
    expect(
      parseSettingsInput({
        ...validSettings,
        _id: "injected-id",
        user: "injected-user",
        $set: { user: "injected-user" },
      }),
    ).toEqual(validSettings);

    expect(
      parseSettingsInput({ user: "injected-user", $set: { user: "x" } }),
    ).toEqual({});
  });

  it("rejects non-object bodies", () => {
    for (const value of [null, "settings", 42, []]) {
      expect(captureError(() => parseSettingsInput(value)).message).toBe(
        "Invalid settings data.",
      );
    }
  });

  it("rejects invalid enums, booleans, and numbers", () => {
    expect(
      captureError(() => parseSettingsInput({ ...validSettings, theme: "neon" }))
        .message,
    ).toBe("Theme is invalid.");
    expect(
      captureError(() => parseSettingsInput({ ...validSettings, units: "litres" }))
        .message,
    ).toBe("Mixing units are invalid.");
    expect(
      captureError(() =>
        parseSettingsInput({ ...validSettings, zeroNicotineMode: "yes" }),
      ).status,
    ).toBe(400);
    expect(
      captureError(() => parseSettingsInput({ ...validSettings, strength: -1 }))
        .status,
    ).toBe(400);
    expect(
      captureError(() =>
        parseSettingsInput({
          nicotine: { strength: 100, base: { pg: 100 } },
        }),
      ).message,
    ).toMatch(/PG\/VG ratio is invalid/);
    expect(
      captureError(() =>
        parseSettingsInput({
          flavor: { percentage: 101, base: { pg: 100, vg: 0 } },
        }),
      ).status,
    ).toBe(400);
  });
});
