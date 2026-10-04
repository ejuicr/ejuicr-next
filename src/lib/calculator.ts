/**
 * Pure calculator: derives all results from inputs so the state hook only
 * needs to hold inputs. Also owns the versioned draft format used for
 * localStorage, with validation on load.
 */

import {
  calculateWeight,
  totalFlavorPg,
  totalFlavorVg,
} from "@/lib/helpers";
import type {
  CalculatorInput,
  CalculatorResults,
  FlavorInput,
  FlavorState,
  NicResults,
  Recipe,
} from "@/types";

export const CALCULATOR_STORAGE_VERSION = 2;

const MAX_NICOTINE_STRENGTH = 1000;

const EMPTY_NIC_RESULTS: NicResults = {
  amount: 0,
  percentage: 0,
  pg: 0,
  vg: 0,
  weight: 0,
};

export function createDefaultFlavors(): FlavorInput[] {
  return [{ name: "Flavor 1", pg: 100, vg: 0, percentage: 5 }];
}

export function flavorInputsFromRecipe(recipe: Recipe): FlavorInput[] {
  return recipe.ingredients.flavors.map((flavor) => ({
    name: flavor.name,
    pg: flavor.base.pg,
    vg: flavor.base.vg,
    percentage: flavor.percentage,
  }));
}

/** Compute amounts and weights for a list of flavors at a target volume. */
function buildFlavors(
  inputs: FlavorInput[],
  targetAmount: number,
): FlavorState[] {
  return inputs.map((flavor) => {
    // Keep full precision internally; display formatting rounds later.
    const amount = (flavor.percentage / 100) * targetAmount;
    const pgAmount = (flavor.pg / 100) * amount;
    const vgAmount = (flavor.vg / 100) * amount;
    const weight = calculateWeight(amount, flavor.pg, flavor.vg);
    return { ...flavor, amount, pgAmount, vgAmount, weight };
  });
}

/** Derive nicotine, flavor, and carrier results from calculator inputs. */
export function calculateResults(input: CalculatorInput): CalculatorResults {
  const {
    targetPg,
    targetVg,
    targetNicStrength,
    targetAmount,
    nicConfig,
    flavors,
  } = input;

  let nicResults: NicResults = EMPTY_NIC_RESULTS;
  if (
    nicConfig.strength > 0 &&
    nicConfig.strength >= targetNicStrength &&
    targetAmount > 0
  ) {
    const amount = (targetNicStrength * targetAmount) / nicConfig.strength;
    const percentage = (amount / targetAmount) * 100;
    const pg = (nicConfig.pg / 100) * amount;
    const vg = (nicConfig.vg / 100) * amount;
    const weight = calculateWeight(amount, nicConfig.pg, nicConfig.vg);
    nicResults = { amount, percentage, pg, vg, weight };
  }

  const flavorStates = buildFlavors(flavors, targetAmount);
  const pgRequired =
    (targetPg / 100) * targetAmount - nicResults.pg - totalFlavorPg(flavorStates);
  const vgRequired =
    (targetVg / 100) * targetAmount - nicResults.vg - totalFlavorVg(flavorStates);

  return { nicResults, flavors: flavorStates, pgRequired, vgRequired };
}

/** Serialize an input-only draft with an explicit format version. */
export function serializeCalculatorDraft(input: CalculatorInput): string {
  return JSON.stringify({ version: CALCULATOR_STORAGE_VERSION, ...input });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteInRange(
  value: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    return null;
  }
  return value;
}

function parseFlavorInput(value: unknown): FlavorInput | null {
  if (!isRecord(value) || typeof value.name !== "string") return null;

  const pg = finiteInRange(value.pg, 0, 100);
  const vg = finiteInRange(value.vg, 0, 100);
  const percentage = finiteInRange(value.percentage, 0, 100);
  if (pg === null || vg === null || percentage === null) return null;

  return { name: value.name, pg, vg, percentage };
}

/**
 * Validate a parsed stored draft and return only the input fields that are
 * present and valid. Derived fields and unknown keys are ignored, invalid
 * values are dropped rather than trusted, and unknown format versions are
 * rejected. Returns null when nothing usable remains.
 */
export function parseCalculatorDraft(
  value: unknown,
): Partial<CalculatorInput> | null {
  if (!isRecord(value)) return null;
  if (
    value.version !== undefined &&
    value.version !== CALCULATOR_STORAGE_VERSION
  ) {
    return null;
  }

  const draft: Partial<CalculatorInput> = {};

  const targetPg = finiteInRange(value.targetPg, 0, 100);
  if (targetPg !== null) draft.targetPg = targetPg;

  const targetVg = finiteInRange(value.targetVg, 0, 100);
  if (targetVg !== null) draft.targetVg = targetVg;

  const targetNicStrength = finiteInRange(
    value.targetNicStrength,
    0,
    MAX_NICOTINE_STRENGTH,
  );
  if (targetNicStrength !== null) draft.targetNicStrength = targetNicStrength;

  const targetAmount = finiteInRange(value.targetAmount, 0);
  if (targetAmount !== null) draft.targetAmount = targetAmount;

  if (isRecord(value.nicConfig)) {
    const strength = finiteInRange(
      value.nicConfig.strength,
      0,
      MAX_NICOTINE_STRENGTH,
    );
    const pg = finiteInRange(value.nicConfig.pg, 0, 100);
    const vg = finiteInRange(value.nicConfig.vg, 0, 100);
    if (strength !== null && pg !== null && vg !== null) {
      draft.nicConfig = { strength, pg, vg };
    }
  }

  if (Array.isArray(value.flavors)) {
    draft.flavors = value.flavors
      .map(parseFlavorInput)
      .filter((flavor): flavor is FlavorInput => flavor !== null);
  }

  return Object.keys(draft).length > 0 ? draft : null;
}
