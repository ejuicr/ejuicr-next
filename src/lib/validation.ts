/**
 * Server-side request validation shared by API route handlers.
 *
 * Incoming JSON is `unknown` until it is checked. These helpers reject
 * malformed values with a 400 `ApiError` before they reach queries, hashing,
 * or Mongoose updates, and they build explicit allowlisted payloads so
 * clients cannot inject internal fields or MongoDB update operators.
 */

import { ApiError } from "@/lib/api";
import {
  PASSWORD_MAX_BYTES,
  isNormalizedRatio,
  passwordByteLength,
  validateEmail,
} from "@/lib/helpers";
import type { BaseRatio, SettingsData } from "@/types";

export const PASSWORD_MIN_LENGTH = 6;
export { PASSWORD_MAX_BYTES };

type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Require a non-empty string without altering its value. */
export function requireNonEmptyString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(400, message);
  }
  return value;
}

/**
 * Validate an email address and return it trimmed. Casing is preserved so
 * legacy mixed-case addresses still match exactly before normalization.
 */
export function requireEmail(
  value: unknown,
  missingMessage = "Email is missing.",
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, missingMessage);
  }
  const email = value.trim();
  if (!validateEmail(email)) {
    throw new ApiError(400, "Email is invalid.");
  }
  return email;
}

/** Require a new password within the lengths accepted by the UI and routes. */
export function requirePassword(
  value: unknown,
  message = "Password is missing or invalid.",
): string {
  if (
    typeof value !== "string" ||
    value.length < PASSWORD_MIN_LENGTH ||
    passwordByteLength(value) > PASSWORD_MAX_BYTES
  ) {
    throw new ApiError(400, message);
  }
  return value;
}

function requireFiniteNumber(
  value: unknown,
  message: string,
  min: number,
  max?: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    (max !== undefined && value > max)
  ) {
    throw new ApiError(400, message);
  }
  return value;
}

function requireBoolean(value: unknown, message: string): boolean {
  if (typeof value !== "boolean") {
    throw new ApiError(400, message);
  }
  return value;
}

function parseRatio(value: unknown, label: string): BaseRatio {
  if (!isPlainObject(value)) {
    throw new ApiError(400, `${label} PG/VG ratio is invalid.`);
  }
  const pg = requireFiniteNumber(
    value.pg,
    `${label} PG/VG ratio is invalid.`,
    0,
    100,
  );
  const vg = requireFiniteNumber(
    value.vg,
    `${label} PG/VG ratio is invalid.`,
    0,
    100,
  );
  // Each carrier ratio must be complete: a sum below 100 would leave part of
  // the mixture unaccounted for, and a sum above 100 produces more liquid
  // than the target volume.
  if (!isNormalizedRatio(pg, vg)) {
    throw new ApiError(400, `${label} PG/VG ratio must add up to 100.`);
  }
  return { pg, vg };
}

export interface RecipeInput {
  name: string;
  strength: number;
  base: BaseRatio;
  amount: number;
  ingredients: {
    nicotine: { strength: number; base: BaseRatio };
    flavors: { name: string; percentage: number; base: BaseRatio }[];
  };
}

/**
 * Build an allowlisted recipe payload from untrusted JSON. Unknown and
 * internal fields (`_id`, `author`, timestamps, update operators) are
 * ignored; nested objects are rebuilt field by field.
 */
export function parseRecipeInput(body: unknown): Partial<RecipeInput> {
  if (!isPlainObject(body)) {
    throw new ApiError(400, "Invalid recipe data.");
  }

  const recipe: Partial<RecipeInput> = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      throw new ApiError(400, "Recipe title must not be blank.");
    }
    recipe.name = body.name.trim();
  }

  if ("strength" in body) {
    recipe.strength = requireFiniteNumber(
      body.strength,
      "Recipe strength is invalid.",
      0,
    );
  }

  if ("base" in body) {
    recipe.base = parseRatio(body.base, "Recipe");
  }

  if ("amount" in body) {
    recipe.amount = requireFiniteNumber(
      body.amount,
      "Recipe amount is invalid.",
      0,
    );
  }

  if ("ingredients" in body) {
    const ingredients = body.ingredients;
    if (
      !isPlainObject(ingredients) ||
      !("nicotine" in ingredients) ||
      !("flavors" in ingredients) ||
      !isPlainObject(ingredients.nicotine) ||
      !Array.isArray(ingredients.flavors)
    ) {
      throw new ApiError(400, "Recipe ingredients are invalid.");
    }

    recipe.ingredients = {
      nicotine: {
        strength: requireFiniteNumber(
          ingredients.nicotine.strength,
          "Nicotine strength is invalid.",
          0,
          1000,
        ),
        base: parseRatio(ingredients.nicotine.base, "Nicotine"),
      },
      flavors: ingredients.flavors.map((flavor) => {
        if (!isPlainObject(flavor)) {
          throw new ApiError(400, "Recipe flavors are invalid.");
        }
        if (typeof flavor.name !== "string" || flavor.name.trim() === "") {
          throw new ApiError(400, "Flavor name must not be blank.");
        }
        return {
          name: flavor.name.trim(),
          percentage: requireFiniteNumber(
            flavor.percentage,
            "Flavor percentage is invalid.",
            0,
            100,
          ),
          base: parseRatio(flavor.base, "Flavor"),
        };
      }),
    };
  }

  return recipe;
}

export type SettingsInput = Pick<
  SettingsData,
  | "theme"
  | "units"
  | "base"
  | "strength"
  | "amount"
  | "zeroNicotineMode"
  | "nicotine"
  | "flavor"
>;

/**
 * Build an allowlisted settings payload from untrusted JSON. The owning
 * `user` field and any other unknown fields are ignored.
 */
export function parseSettingsInput(body: unknown): Partial<SettingsInput> {
  if (!isPlainObject(body)) {
    throw new ApiError(400, "Invalid settings data.");
  }

  const settings: Partial<SettingsInput> = {};

  if ("theme" in body) {
    if (body.theme !== "light" && body.theme !== "dark") {
      throw new ApiError(400, "Theme is invalid.");
    }
    settings.theme = body.theme;
  }

  if ("units" in body) {
    if (
      body.units !== "weight" &&
      body.units !== "volume" &&
      body.units !== "both"
    ) {
      throw new ApiError(400, "Mixing units are invalid.");
    }
    settings.units = body.units;
  }

  if ("base" in body) {
    settings.base = parseRatio(body.base, "Base");
  }

  if ("strength" in body) {
    settings.strength = requireFiniteNumber(
      body.strength,
      "Strength is invalid.",
      0,
    );
  }

  if ("amount" in body) {
    settings.amount = requireFiniteNumber(body.amount, "Amount is invalid.", 0);
  }

  if ("zeroNicotineMode" in body) {
    settings.zeroNicotineMode = requireBoolean(
      body.zeroNicotineMode,
      "Zero nicotine mode is invalid.",
    );
  }

  if ("nicotine" in body) {
    if (!isPlainObject(body.nicotine)) {
      throw new ApiError(400, "Nicotine settings are invalid.");
    }
    settings.nicotine = {
      strength: requireFiniteNumber(
        body.nicotine.strength,
        "Nicotine strength is invalid.",
        0,
        1000,
      ),
      base: parseRatio(body.nicotine.base, "Nicotine"),
    };
  }

  if ("flavor" in body) {
    if (!isPlainObject(body.flavor)) {
      throw new ApiError(400, "Flavor settings are invalid.");
    }
    settings.flavor = {
      percentage: requireFiniteNumber(
        body.flavor.percentage,
        "Flavor percentage is invalid.",
        0,
        100,
      ),
      base: parseRatio(body.flavor.base, "Flavor"),
    };
  }

  return settings;
}
