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
    // Keep full precision internally; display formatting rounds later.
    const amount = (flavor.percentage / 100) * targetAmount;
    const pgAmount = (flavor.pg / 100) * amount;
    const vgAmount = (flavor.vg / 100) * amount;
    const weight = calculateWeight(amount, flavor.pg, flavor.vg);
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

/** The settings endpoint returns `{}` until the user has saved defaults. */
function hasSettings(value: unknown): value is SettingsData {
  return (
    typeof value === "object" && value !== null && "base" in value
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
  // A recipe with zero strength is a zero-nicotine recipe; otherwise the
  // calculator starts with nicotine visible until settings say otherwise.
  const [zeroNicotineMode, setZeroNicotineMode] = useState(() =>
    recipe ? recipe.strength <= 0 : false,
  );
  const [units, setUnits] = useState<SettingsData["units"]>("both");
  const [hasSavedDefaults, setHasSavedDefaults] = useState(false);

  // Tracks whether the current values came from an existing draft or from
  // edits made before settings loaded; either outranks saved defaults.
  const hasDraftRef = useRef(false);
  const savedSettingsRef = useRef<SettingsData | null>(null);

  // Restore persisted calculator values on first mount. This has to run after
  // mount so the server-rendered defaults keep matching the first client
  // render (localStorage is not available during SSR).
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
  useEffect(() => {
    if (recipe) return;
    try {
      const raw = localStorage.getItem(CALCULATOR_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<CalculatorValues> | null;
      if (!saved || typeof saved !== "object") return;
      // Any stored state is an existing draft and outranks user defaults.
      hasDraftRef.current = true;
      if (typeof saved.targetPg === "number") setTargetPg(saved.targetPg);
      if (typeof saved.targetVg === "number") setTargetVg(saved.targetVg);
      if (typeof saved.targetNicStrength === "number")
        setTargetNicStrength(saved.targetNicStrength);
      if (typeof saved.targetAmount === "number")
        setTargetAmount(saved.targetAmount);
      if (saved.nicConfig) setNicConfig(saved.nicConfig);
      if (Array.isArray(saved.flavors)) setFlavors(saved.flavors);
    } catch (error) {
      console.error("Failed to restore calculator values.", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Apply saved defaults to the calculator. Used when a fresh calculator
  // initializes and when the user deliberately applies defaults.
  const applySettings = useCallback((settings: SettingsData) => {
    setZeroNicotineMode(settings.zeroNicotineMode);
    setUnits(settings.units);
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
  }, []);

  // Load the signed-in user's saved settings.
  const settingsLoadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user || settingsLoadedFor.current === user._id) return;
    settingsLoadedFor.current = user._id;

    let cancelled = false;
    (async () => {
      try {
        const settings = await api.get<unknown>("/api/settings");
        if (cancelled || !hasSettings(settings)) return;

        savedSettingsRef.current = settings;
        setHasSavedDefaults(true);

        // Display preferences always apply.
        setUnits(settings.units);

        if (recipe) {
          // The recipe's own nicotine decides whether nicotine controls are
          // shown; zero-nicotine defaults must never hide active nicotine.
          setZeroNicotineMode(recipe.strength <= 0);
          return;
        }

        // Initialization precedence: an existing draft, or edits made while
        // settings were loading, outrank the user's defaults.
        if (hasDraftRef.current) return;

        applySettings(settings);
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, recipe, applySettings]);

  // Nicotine results are derived from the target values and nicotine base.
  // Full precision is kept internally; display formatting rounds later.
  const nicResults = useMemo<NicResults>(() => {
    if (
      nicConfig.strength <= 0 ||
      nicConfig.strength < targetNicStrength ||
      targetAmount <= 0
    ) {
      return EMPTY_NIC_RESULTS;
    }
    const amount = (targetNicStrength * targetAmount) / nicConfig.strength;
    const percentage = (amount / targetAmount) * 100;
    const pg = (nicConfig.pg / 100) * amount;
    const vg = (nicConfig.vg / 100) * amount;
    const weight = calculateWeight(amount, nicConfig.pg, nicConfig.vg);
    return { amount, percentage, pg, vg, weight };
  }, [nicConfig, targetNicStrength, targetAmount]);

  // The PG/VG that must be added to reach the target ratio.
  const pgRequired = useMemo(
    () =>
      (targetPg / 100) * targetAmount -
      nicResults.pg -
      totalFlavorPg(flavors),
    [targetPg, targetAmount, nicResults.pg, flavors],
  );

  const vgRequired = useMemo(
    () =>
      (targetVg / 100) * targetAmount -
      nicResults.vg -
      totalFlavorVg(flavors),
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
      hasDraftRef.current = true;
      const validatedValue = validatePgVgValue(value);
      setTargetPg(ingredient === "vg" ? 100 - validatedValue : validatedValue);
      setTargetVg(ingredient === "vg" ? validatedValue : 100 - validatedValue);
    },
    [],
  );

  const handleChangeTargetNicStrength = useCallback(
    (value: string | number) => {
      hasDraftRef.current = true;
      setTargetNicStrength(roundToTwoDecimalPlaces(parseNumberInput(value)));
    },
    [],
  );

  const handleChangeTargetAmount = useCallback((value: string | number) => {
    hasDraftRef.current = true;
    const roundedValue = roundToTwoDecimalPlaces(parseNumberInput(value));
    setTargetAmount(roundedValue);
    setFlavors((current) => buildFlavors(current, roundedValue));
  }, []);

  const handleChangeNicConfigPgVg = useCallback(
    (value: string | number, ingredient: "pg" | "vg" = "pg") => {
      hasDraftRef.current = true;
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
      hasDraftRef.current = true;
      const parsedValue = parseNumberInput(value);
      setNicConfig((current) => ({
        ...current,
        strength: parsedValue > 1000 ? 1000 : Math.round(parsedValue),
      }));
    },
    [],
  );

  const handleChangeFlavorName = useCallback((index: number, value: string) => {
    hasDraftRef.current = true;
    setFlavors((current) =>
      current.map((flavor, flavorIndex) =>
        flavorIndex === index ? { ...flavor, name: value } : flavor,
      ),
    );
  }, []);

  const handleChangeFlavorPercentage = useCallback(
    (index: number, value: string | number) => {
      hasDraftRef.current = true;
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
      hasDraftRef.current = true;
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
    hasDraftRef.current = true;
    setFlavors((current) =>
      current.filter((_, flavorIndex) => flavorIndex !== index),
    );
  }, []);

  const handleAddFlavor = useCallback(() => {
    hasDraftRef.current = true;
    setFlavors((current) => {
      // Saved flavor defaults apply to every newly added flavor. Guests and
      // accounts without saved settings keep the neutral 100% PG / 0% base.
      const defaults = savedSettingsRef.current?.flavor;
      const flavor: FlavorInput = {
        name: `Flavor ${current.length + 1}`,
        pg: defaults?.base.pg ?? 100,
        vg: defaults?.base.vg ?? 0,
        percentage: defaults?.percentage ?? 0,
      };
      return [...current, buildFlavors([flavor], targetAmount)[0]];
    });
  }, [targetAmount]);

  // Never hide nicotine that is active in the current calculation, for
  // example a saved recipe opened while zero-nicotine defaults are enabled.
  const showNicotine = !zeroNicotineMode || targetNicStrength > 0;

  // Deliberate action for replacing the current draft with saved defaults;
  // settings loading must never do this implicitly.
  const handleApplyDefaults = useCallback(() => {
    const settings = savedSettingsRef.current;
    if (!settings) return;
    applySettings(settings);
  }, [applySettings]);

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
    showNicotine,
    hasSavedDefaults,
    handleApplyDefaults,
    units,
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
