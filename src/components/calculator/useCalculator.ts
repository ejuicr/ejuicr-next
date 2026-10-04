"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  calculateResults,
  clampPercentage,
  createDefaultFlavors,
  flavorInputsFromRecipe,
  getCalculatorStatus,
  parseCalculatorDraft,
  serializeCalculatorDraft,
} from "@/lib/calculator";
import { api } from "@/lib/client-api";
import {
  parseNumberInput,
  roundToTwoDecimalPlaces,
  validatePgVgValue,
} from "@/lib/helpers";
import type { FlavorInput, NicConfig, Recipe, SettingsData } from "@/types";

export const CALCULATOR_STORAGE_KEY = "calculator";

/** The settings endpoint returns `{}` until the user has saved defaults. */
function hasSettings(value: unknown): value is SettingsData {
  return typeof value === "object" && value !== null && "base" in value;
}

/**
 * Calculator state and handlers.
 *
 * Only inputs live in state; nicotine, flavor, and carrier results are pure
 * derivations via `calculateResults`. When a `recipe` is passed the calculator
 * initialises from it. Callers must remount the calculator when switching
 * recipes (see `key` usage in `RecipeLoader`); this keeps the initialisation
 * simple and avoids state syncing effects.
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
  const [flavors, setFlavors] = useState<FlavorInput[]>(() =>
    recipe ? flavorInputsFromRecipe(recipe) : createDefaultFlavors(),
  );
  // A recipe with zero strength is a zero-nicotine recipe; otherwise the
  // calculator starts with nicotine visible until settings say otherwise.
  const [zeroNicotineMode, setZeroNicotineMode] = useState(() =>
    recipe ? recipe.strength <= 0 : false,
  );
  const [units, setUnits] = useState<SettingsData["units"]>("both");
  // Account whose saved settings are currently loaded. Comparing this with
  // the signed-in account derives whether defaults are available, so logging
  // out or switching accounts hides them without clearing state in an effect.
  const [savedDefaultsFor, setSavedDefaultsFor] = useState<string | null>(null);

  // Tracks whether the current values came from an existing draft or from
  // edits made before settings loaded; either outranks saved defaults.
  const hasDraftRef = useRef(false);
  const savedSettingsRef = useRef<{
    accountId: string;
    settings: SettingsData;
  } | null>(null);

  const accountId = user?._id ?? null;
  const hasSavedDefaults =
    accountId !== null && savedDefaultsFor === accountId;

  const { nicResults, flavors: flavorResults, pgRequired, vgRequired } =
    useMemo(
      () =>
        calculateResults({
          targetPg,
          targetVg,
          targetNicStrength,
          targetAmount,
          nicConfig,
          flavors,
        }),
      [targetPg, targetVg, targetNicStrength, targetAmount, nicConfig, flavors],
    );

  const {
    nicPercentage,
    pgPercentage,
    vgPercentage,
    pgWeight,
    vgWeight,
    nicInvalid,
    pgInvalid,
    vgInvalid,
    error,
  } = useMemo(
    () =>
      getCalculatorStatus(
        {
          targetPg,
          targetVg,
          targetNicStrength,
          targetAmount,
          nicConfig,
          flavors,
        },
        { nicResults, flavors: flavorResults, pgRequired, vgRequired },
      ),
    [
      targetPg,
      targetVg,
      targetNicStrength,
      targetAmount,
      nicConfig,
      flavors,
      nicResults,
      flavorResults,
      pgRequired,
      vgRequired,
    ],
  );

  // Restore persisted inputs on first mount. This has to run after mount so
  // the server-rendered defaults keep matching the first client render
  // (localStorage is not available during SSR). Stored data is validated and
  // only inputs are applied; results are recalculated from them.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
  useEffect(() => {
    if (recipe) return;
    try {
      const raw = localStorage.getItem(CALCULATOR_STORAGE_KEY);
      if (!raw) return;
      const draft = parseCalculatorDraft(JSON.parse(raw));
      if (!draft) return;
      // Any stored state is an existing draft and outranks user defaults.
      hasDraftRef.current = true;
      if (draft.targetPg !== undefined) setTargetPg(draft.targetPg);
      if (draft.targetVg !== undefined) setTargetVg(draft.targetVg);
      if (draft.targetNicStrength !== undefined)
        setTargetNicStrength(draft.targetNicStrength);
      if (draft.targetAmount !== undefined)
        setTargetAmount(draft.targetAmount);
      if (draft.nicConfig) setNicConfig(draft.nicConfig);
      if (draft.flavors !== undefined) setFlavors(draft.flavors);
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
    setFlavors([
      {
        name: "Flavor 1",
        pg: settings.flavor.base.pg,
        vg: settings.flavor.base.vg,
        percentage: settings.flavor.percentage,
      },
    ]);
  }, []);

  // Load the signed-in user's saved settings. The loaded account is recorded
  // only after a request succeeds, so a same-account auth refresh while the
  // request is pending starts a fresh request instead of permanently
  // cancelling the only one. Defaults for an old account are never offered or
  // applied to another account because every use checks the account ID.
  const settingsAccount = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (settingsAccount.current === user._id) return;

    const requestedAccountId = user._id;
    let cancelled = false;
    (async () => {
      try {
        const settings = await api.get<unknown>("/api/settings");
        if (cancelled) return;

        // Mark the account as loaded only after the request succeeds; a
        // failed request stays retryable on the next auth refresh.
        settingsAccount.current = requestedAccountId;
        if (!hasSettings(settings)) return;

        savedSettingsRef.current = {
          accountId: requestedAccountId,
          settings,
        };
        setSavedDefaultsFor(requestedAccountId);

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

  // Persist inputs only; results are always recalculated on load.
  useEffect(() => {
    if (recipe) return;
    try {
      localStorage.setItem(
        CALCULATOR_STORAGE_KEY,
        serializeCalculatorDraft({
          targetPg,
          targetVg,
          targetNicStrength,
          targetAmount,
          nicConfig,
          flavors,
        }),
      );
    } catch (error) {
      // Private browsing or a full quota can make storage unavailable; the
      // calculator still works, it just cannot persist.
      console.warn("Failed to save calculator values.", error);
    }
  }, [
    recipe,
    targetPg,
    targetVg,
    targetNicStrength,
    targetAmount,
    nicConfig,
    flavors,
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
    setTargetAmount(roundToTwoDecimalPlaces(parseNumberInput(value)));
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
      const roundedValue = clampPercentage(
        roundToTwoDecimalPlaces(parseNumberInput(value)),
      );
      setFlavors((current) =>
        current.map((flavor, flavorIndex) =>
          flavorIndex === index
            ? { ...flavor, percentage: roundedValue }
            : flavor,
        ),
      );
    },
    [],
  );

  const handleChangeFlavorPgVg = useCallback(
    (index: number, value: string | number, ingredient: "pg" | "vg" = "pg") => {
      hasDraftRef.current = true;
      const validatedValue = validatePgVgValue(value);
      setFlavors((current) =>
        current.map((flavor, flavorIndex) =>
          flavorIndex === index
            ? {
                ...flavor,
                pg:
                  ingredient === "vg" ? 100 - validatedValue : validatedValue,
                vg:
                  ingredient === "vg" ? validatedValue : 100 - validatedValue,
              }
            : flavor,
        ),
      );
    },
    [],
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
      // Saved flavor defaults apply to every newly added flavor, but only
      // while the account they belong to is still signed in. Guests and
      // accounts without saved settings keep the neutral 100% PG / 0% base.
      const saved = savedSettingsRef.current;
      const defaults =
        saved && saved.accountId === accountId ? saved.settings.flavor : null;
      const flavor: FlavorInput = {
        name: `Flavor ${current.length + 1}`,
        pg: defaults?.base.pg ?? 100,
        vg: defaults?.base.vg ?? 0,
        percentage: defaults?.percentage ?? 0,
      };
      return [...current, flavor];
    });
  }, [accountId]);

  // Never hide nicotine that is active in the current calculation, for
  // example a saved recipe opened while zero-nicotine defaults are enabled.
  const showNicotine = !zeroNicotineMode || targetNicStrength > 0;

  // Deliberate action for replacing the current draft with saved defaults;
  // settings loading must never do this implicitly.
  const handleApplyDefaults = useCallback(() => {
    const saved = savedSettingsRef.current;
    if (!saved || saved.accountId !== accountId) return;
    applySettings(saved.settings);
  }, [accountId, applySettings]);

  return {
    targetPg,
    targetVg,
    targetNicStrength,
    targetAmount,
    nicConfig,
    nicResults,
    flavors: flavorResults,
    pgRequired,
    vgRequired,
    nicPercentage,
    pgPercentage,
    vgPercentage,
    pgWeight,
    vgWeight,
    nicInvalid,
    pgInvalid,
    vgInvalid,
    error,
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
