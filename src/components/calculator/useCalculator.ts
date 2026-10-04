"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/client-api";
import {
  calculateWeight,
  parseNumberInput,
  roundToTwoDecimalPlaces,
  totalFlavorPg,
  totalFlavorVg,
  validatePgVgValue,
} from "@/lib/helpers";
import type {
  CalculatorValues,
  FlavorState,
  NicConfig,
  NicResults,
  Recipe,
  SettingsData,
} from "@/types";

export const CALCULATOR_STORAGE_KEY = "calculator";

const EMPTY_NIC_RESULTS: NicResults = {
  amount: 0,
  percentage: 0,
  pg: 0,
  vg: 0,
  weight: 0,
};

function createDefaultFlavors(): FlavorState[] {
  return [
    {
      name: "Flavor 1",
      pg: 100,
      vg: 0,
      percentage: 5,
      amount: 1.5,
      pgAmount: 1.5,
      vgAmount: 0,
      weight: 1.55,
    },
  ];
}

interface FlavorInput {
  name: string;
  pg: number;
  vg: number;
  percentage: number;
}

/** Compute amounts and weights for a list of flavors at a given target volume. */
function buildFlavors(
  inputs: FlavorInput[],
  targetAmount: number,
): FlavorState[] {
  return inputs.map((flavor) => {
    const amount = roundToTwoDecimalPlaces(
      (flavor.percentage / 100) * targetAmount,
    );
    const pgAmount = roundToTwoDecimalPlaces((flavor.pg / 100) * amount);
    const vgAmount = roundToTwoDecimalPlaces((flavor.vg / 100) * amount);
    const weight = roundToTwoDecimalPlaces(
      calculateWeight(amount, flavor.pg, flavor.vg),
    );
    return { ...flavor, amount, pgAmount, vgAmount, weight };
  });
}

function flavorsFromRecipe(recipe: Recipe): FlavorState[] {
  return buildFlavors(
    recipe.ingredients.flavors.map((flavor) => ({
      name: flavor.name,
      pg: flavor.base.pg,
      vg: flavor.base.vg,
      percentage: flavor.percentage,
    })),
    recipe.amount,
  );
}

/**
 * Calculator state and handlers.
 *
 * When a `recipe` is passed the calculator initialises from it. Callers must
 * remount the calculator when switching recipes (see `key` usage in
 * `RecipeLoader`); this keeps the initialisation simple and avoids state
 * syncing effects.
 */
export function useCalculator(recipe?: Recipe) {
  const { user } = useAuth();

  const [targetPg, setTargetPg] = useState(() =>
    recipe ? recipe.base.pg : 30,
  );
  const [targetVg, setTargetVg] = useState(() =>
    recipe ? recipe.base.vg : 70,
  );
  const [targetNicStrength, setTargetNicStrength] = useState(() =>
    recipe ? recipe.strength : 6,
  );
  const [targetAmount, setTargetAmount] = useState(() =>
    recipe ? recipe.amount : 30,
  );
  const [nicConfig, setNicConfig] = useState<NicConfig>(() =>
    recipe
      ? {
          strength: recipe.ingredients.nicotine.strength,
          pg: recipe.ingredients.nicotine.base.pg,
          vg: recipe.ingredients.nicotine.base.vg,
        }
      : { strength: 100, pg: 100, vg: 0 },
  );
  const [flavors, setFlavors] = useState<FlavorState[]>(() =>
    recipe ? flavorsFromRecipe(recipe) : createDefaultFlavors(),
  );
  const [zeroNicotineMode, setZeroNicotineMode] = useState(false);
  const [units, setUnits] = useState<SettingsData["units"]>("both");

  // Restore persisted calculator values on first mount. This has to run after
  // mount so the server-rendered defaults keep matching the first client
  // render (localStorage is not available during SSR).
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
  useEffect(() => {
    if (recipe) return;
    try {
      const saved = JSON.parse(
        localStorage.getItem(CALCULATOR_STORAGE_KEY) ?? "null",
      ) as Partial<CalculatorValues> | null;
      if (!saved) return;
      if (typeof saved.targetPg === "number") setTargetPg(saved.targetPg);
      if (typeof saved.targetVg === "number") setTargetVg(saved.targetVg);
      if (typeof saved.targetNicStrength === "number")
        setTargetNicStrength(saved.targetNicStrength);
      if (typeof saved.targetAmount === "number")
        setTargetAmount(saved.targetAmount);
      if (saved.nicConfig) setNicConfig(saved.nicConfig);
      if (Array.isArray(saved.flavors) && saved.flavors.length > 0)
        setFlavors(saved.flavors);
    } catch (error) {
      console.error("Failed to restore calculator values.", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load the signed-in user's saved settings.
  const settingsLoadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user || settingsLoadedFor.current === user._id) return;
    settingsLoadedFor.current = user._id;

    let cancelled = false;
    (async () => {
      try {
        const settings = await api.get<SettingsData | Record<string, never>>(
          "/api/settings",
        );
        if (cancelled || !("base" in settings)) return;

        setZeroNicotineMode(settings.zeroNicotineMode);
        setUnits(settings.units);

        // A recipe being viewed always takes precedence over defaults.
        if (recipe) return;

        setTargetPg(settings.base.pg);
        setTargetVg(settings.base.vg);
        setTargetNicStrength(settings.zeroNicotineMode ? 0 : settings.strength);
        setTargetAmount(settings.amount);
        setNicConfig({
          strength: settings.nicotine.strength,
          pg: settings.nicotine.base.pg,
          vg: settings.nicotine.base.vg,
        });
        setFlavors(
          buildFlavors(
            [
              {
                name: "Flavor 1",
                pg: settings.flavor.base.pg,
                vg: settings.flavor.base.vg,
                percentage: settings.flavor.percentage,
              },
            ],
            settings.amount,
          ),
        );
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, recipe]);

  // Nicotine results are derived from the target values and nicotine base.
  const nicResults = useMemo<NicResults>(() => {
    if (
      nicConfig.strength <= 0 ||
      nicConfig.strength < targetNicStrength ||
      targetAmount <= 0
    ) {
      return EMPTY_NIC_RESULTS;
    }
    const amount = roundToTwoDecimalPlaces(
      (targetNicStrength * targetAmount) / nicConfig.strength,
    );
    const percentage = roundToTwoDecimalPlaces((amount / targetAmount) * 100);
    const pg = roundToTwoDecimalPlaces((nicConfig.pg / 100) * amount);
    const vg = roundToTwoDecimalPlaces((nicConfig.vg / 100) * amount);
    const weight = roundToTwoDecimalPlaces(
      calculateWeight(amount, nicConfig.pg, nicConfig.vg),
    );
    return { amount, percentage, pg, vg, weight };
  }, [nicConfig, targetNicStrength, targetAmount]);

  // The PG/VG that must be added to reach the target ratio.
  const pgRequired = useMemo(
    () =>
      roundToTwoDecimalPlaces(
        (targetPg / 100) * targetAmount -
          nicResults.pg -
          totalFlavorPg(flavors),
      ),
    [targetPg, targetAmount, nicResults.pg, flavors],
  );

  const vgRequired = useMemo(
    () =>
      roundToTwoDecimalPlaces(
        (targetVg / 100) * targetAmount -
          nicResults.vg -
          totalFlavorVg(flavors),
      ),
    [targetVg, targetAmount, nicResults.vg, flavors],
  );

  // Persist calculator values between visits.
  useEffect(() => {
    if (recipe) return;
    const values: CalculatorValues = {
      targetPg,
      targetVg,
      targetNicStrength,
      targetAmount,
      nicConfig,
      nicResults,
      flavors,
      pgRequired,
      vgRequired,
    };
    localStorage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(values));
  }, [
    recipe,
    targetPg,
    targetVg,
    targetNicStrength,
    targetAmount,
    nicConfig,
    nicResults,
    flavors,
    pgRequired,
    vgRequired,
  ]);

  const handleChangeTargetPgVg = useCallback(
    (value: string | number, ingredient: "pg" | "vg" = "pg") => {
      const validatedValue = validatePgVgValue(value);
      setTargetPg(ingredient === "vg" ? 100 - validatedValue : validatedValue);
      setTargetVg(ingredient === "vg" ? validatedValue : 100 - validatedValue);
    },
    [],
  );

  const handleChangeTargetNicStrength = useCallback(
    (value: string | number) => {
      setTargetNicStrength(roundToTwoDecimalPlaces(parseNumberInput(value)));
    },
    [],
  );

  const handleChangeTargetAmount = useCallback((value: string | number) => {
    const roundedValue = roundToTwoDecimalPlaces(parseNumberInput(value));
    setTargetAmount(roundedValue);
    setFlavors((current) => buildFlavors(current, roundedValue));
  }, []);

  const handleChangeNicConfigPgVg = useCallback(
    (value: string | number, ingredient: "pg" | "vg" = "pg") => {
      const validatedValue = validatePgVgValue(value);
      setNicConfig((current) => ({
        ...current,
        pg: ingredient === "vg" ? 100 - validatedValue : validatedValue,
        vg: ingredient === "vg" ? validatedValue : 100 - validatedValue,
      }));
    },
    [],
  );

  const handleChangeNicConfigStrength = useCallback(
    (value: string | number) => {
      const parsedValue = parseNumberInput(value);
      setNicConfig((current) => ({
        ...current,
        strength: parsedValue > 1000 ? 1000 : Math.round(parsedValue),
      }));
    },
    [],
  );

  const handleChangeFlavorName = useCallback((index: number, value: string) => {
    setFlavors((current) =>
      current.map((flavor, flavorIndex) =>
        flavorIndex === index ? { ...flavor, name: value } : flavor,
      ),
    );
  }, []);

  const handleChangeFlavorPercentage = useCallback(
    (index: number, value: string | number) => {
      const roundedValue = roundToTwoDecimalPlaces(parseNumberInput(value));
      setFlavors((current) =>
        buildFlavors(
          current.map((flavor, flavorIndex) =>
            flavorIndex === index
              ? { ...flavor, percentage: roundedValue }
              : flavor,
          ),
          targetAmount,
        ),
      );
    },
    [targetAmount],
  );

  const handleChangeFlavorPgVg = useCallback(
    (index: number, value: string | number, ingredient: "pg" | "vg" = "pg") => {
      const validatedValue = validatePgVgValue(value);
      setFlavors((current) =>
        buildFlavors(
          current.map((flavor, flavorIndex) =>
            flavorIndex === index
              ? {
                  ...flavor,
                  pg: ingredient === "vg" ? 100 - validatedValue : validatedValue,
                  vg: ingredient === "vg" ? validatedValue : 100 - validatedValue,
                }
              : flavor,
          ),
          targetAmount,
        ),
      );
    },
    [targetAmount],
  );

  const handleRemoveFlavor = useCallback((index: number) => {
    setFlavors((current) =>
      current.filter((_, flavorIndex) => flavorIndex !== index),
    );
  }, []);

  const handleAddFlavor = useCallback(() => {
    setFlavors((current) => [
      ...current,
      {
        name: `Flavor ${current.length + 1}`,
        pg: 100,
        vg: 0,
        percentage: 0,
        amount: 0,
        pgAmount: 0,
        vgAmount: 0,
        weight: 0,
      },
    ]);
  }, []);

  return {
    targetPg,
    targetVg,
    targetNicStrength,
    targetAmount,
    nicConfig,
    nicResults,
    flavors,
    pgRequired,
    vgRequired,
    zeroNicotineMode,
    units,
    setZeroNicotineMode,
    handleChangeTargetPgVg,
    handleChangeTargetNicStrength,
    handleChangeTargetAmount,
    handleChangeNicConfigPgVg,
    handleChangeNicConfigStrength,
    handleChangeFlavorName,
    handleChangeFlavorPercentage,
    handleChangeFlavorPgVg,
    handleRemoveFlavor,
    handleAddFlavor,
  };
}

export type CalculatorController = ReturnType<typeof useCalculator>;
