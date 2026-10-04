"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faToggleOn } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import InfoTooltip from "@/components/ui/InfoTooltip";
import InputBorder from "@/components/ui/InputBorder";
import { ErrorMessage, SuccessMessage } from "@/components/ui/Messages";
import NumberControls from "@/components/ui/NumberControls";
import PageHeading from "@/components/ui/PageHeading";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";
import {
  parseNumberInput,
  roundToTwoDecimalPlaces,
  validatePgVgValue,
} from "@/lib/helpers";
import type { MixingUnits, SettingsData } from "@/types";

function FormRow({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-2">
      <div>{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function SettingsForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mixingUnits, setMixingUnits] = useState<MixingUnits>("both");
  const [targetPg, setTargetPg] = useState(30);
  const [targetVg, setTargetVg] = useState(70);
  const [targetNicStrength, setTargetNicStrength] = useState(6);
  const [targetAmount, setTargetAmount] = useState(30);
  const [zeroNicotineMode, setZeroNicotineMode] = useState(false);
  const [nicConfig, setNicConfig] = useState({
    strength: 100,
    pg: 100,
    vg: 0,
  });
  const [flavorConfig, setFlavorConfig] = useState({
    percentage: 5,
    pg: 100,
    vg: 0,
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get<SettingsData | Record<string, never>>("/api/settings")
      .then((data) => {
        if (cancelled || !("base" in data)) return;
        setTheme(data.theme);
        setMixingUnits(data.units);
        setTargetPg(data.base.pg);
        setTargetVg(data.base.vg);
        setTargetNicStrength(data.strength);
        setTargetAmount(data.amount);
        setZeroNicotineMode(data.zeroNicotineMode);
        setNicConfig({
          strength: data.nicotine.strength,
          pg: data.nicotine.base.pg,
          vg: data.nicotine.base.vg,
        });
        setFlavorConfig({
          percentage: data.flavor.percentage,
          pg: data.flavor.base.pg,
          vg: data.flavor.base.vg,
        });
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Failed to load settings.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeTargetPgVg = (
    value: string | number,
    ingredient: "pg" | "vg" = "pg",
  ) => {
    const validatedValue = validatePgVgValue(value);
    setTargetPg(ingredient === "vg" ? 100 - validatedValue : validatedValue);
    setTargetVg(ingredient === "vg" ? validatedValue : 100 - validatedValue);
  };

  const handleChangeTargetNicStrength = (value: string | number) => {
    setTargetNicStrength(roundToTwoDecimalPlaces(parseNumberInput(value)));
  };

  const handleChangeTargetAmount = (value: string | number) => {
    setTargetAmount(roundToTwoDecimalPlaces(parseNumberInput(value)));
  };

  const handleChangeNicConfigStrength = (value: string | number) => {
    const parsedValue = parseNumberInput(value);
    setNicConfig((current) => ({
      ...current,
      strength: parsedValue > 1000 ? 1000 : Math.round(parsedValue),
    }));
  };

  const handleChangeNicConfigPgVg = (
    value: string | number,
    ingredient: "pg" | "vg" = "pg",
  ) => {
    const validatedValue = validatePgVgValue(value);
    setNicConfig((current) => ({
      ...current,
      pg: ingredient === "vg" ? 100 - validatedValue : validatedValue,
      vg: ingredient === "vg" ? validatedValue : 100 - validatedValue,
    }));
  };

  const handleChangeFlavorConfigPercentage = (value: string | number) => {
    const parsedValue = parseNumberInput(value);
    setFlavorConfig((current) => ({
      ...current,
      percentage: parsedValue > 100 ? 100 : roundToTwoDecimalPlaces(parsedValue),
    }));
  };

  const handleChangeFlavorConfigPgVg = (
    value: string | number,
    ingredient: "pg" | "vg" = "pg",
  ) => {
    const validatedValue = validatePgVgValue(value);
    setFlavorConfig((current) => ({
      ...current,
      pg: ingredient === "vg" ? 100 - validatedValue : validatedValue,
      vg: ingredient === "vg" ? validatedValue : 100 - validatedValue,
    }));
  };

  const handleClickSaveSettings = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);

    const newSettings = {
      theme,
      units: mixingUnits,
      base: {
        pg: targetPg,
        vg: targetVg,
      },
      strength: targetNicStrength,
      amount: targetAmount,
      zeroNicotineMode,
      nicotine: {
        strength: nicConfig.strength,
        base: {
          pg: nicConfig.pg,
          vg: nicConfig.vg,
        },
      },
      flavor: {
        percentage: flavorConfig.percentage,
        base: {
          pg: flavorConfig.pg,
          vg: flavorConfig.vg,
        },
      },
    };

    try {
      await api.post("/api/settings", newSettings);
      setSuccess("Your settings have been saved.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to save settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleClass = (checked: boolean) =>
    clsx(
      "ml-1 text-[2rem]",
      checked ? "text-brand-green" : "rotate-180 text-brand-red",
    );

  return (
    <div>
      <PageHeading>Settings</PageHeading>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <h2 className="mt-10 text-[1.75rem]">Appearance</h2>
          <hr />
          <FormRow label={<label htmlFor="mixing-units">Mixing units:</label>}>
            <select
              id="mixing-units"
              value={mixingUnits}
              onChange={(event) =>
                setMixingUnits(event.target.value as MixingUnits)
              }
              className="rounded-[3px] border-[0.125em] border-brand-cyan bg-surface px-2 py-1 text-base text-cream outline-none focus:border-brand-pink"
            >
              <option value="both">Both</option>
              <option value="volume">Volume (mL)</option>
              <option value="weight">Weight (g)</option>
            </select>
          </FormRow>
          <hr />
          <h2 className="mt-10 text-[1.75rem]">Target Ejuice</h2>
          <hr />
          <FormRow label="Default base:">
            <span className="label-left">PG/VG</span>
            <InputBorder>
              <input
                type="number"
                aria-label="Default target PG percentage"
                value={String(targetPg)}
                min="0"
                max="100"
                onChange={(event) =>
                  handleChangeTargetPgVg(event.target.value, "pg")
                }
              />
            </InputBorder>
            <span className="label-between">/</span>
            <InputBorder>
              <input
                type="number"
                aria-label="Default target VG percentage"
                value={String(targetVg)}
                min="0"
                max="100"
                onChange={(event) =>
                  handleChangeTargetPgVg(event.target.value, "vg")
                }
              />
            </InputBorder>
            <NumberControls
              label="default target PG percentage"
              value={targetPg}
              step={5}
              onChange={(value) => handleChangeTargetPgVg(value, "pg")}
            />
          </FormRow>
          <hr />
          <FormRow label="Default strength:">
            <InputBorder>
              <input
                type="number"
                aria-label="Default target nicotine strength"
                value={String(targetNicStrength)}
                min="0"
                onChange={(event) =>
                  handleChangeTargetNicStrength(event.target.value)
                }
              />
            </InputBorder>
            <span className="label-right">mg/mL</span>
            <NumberControls
              label="default target nicotine strength"
              value={targetNicStrength}
              step={1}
              min={0}
              onChange={handleChangeTargetNicStrength}
            />
          </FormRow>
          <hr />
          <FormRow label="Default amount:">
            <InputBorder>
              <input
                type="number"
                className="wide"
                aria-label="Default target amount"
                value={String(targetAmount)}
                min="0"
                onChange={(event) =>
                  handleChangeTargetAmount(event.target.value)
                }
              />
            </InputBorder>
            <span className="label-right">mL</span>
            <NumberControls
              label="default target amount"
              value={targetAmount}
              step={10}
              min={0}
              onChange={handleChangeTargetAmount}
            />
          </FormRow>
          <hr />
          <h2 className="mt-10 text-[1.75rem]">Nicotine</h2>
          <hr />
          <FormRow
            label={
              <span>
                Zero Nicotine Mode:{" "}
                <InfoTooltip content="Removes all nicotine options from the calculator when enabled." />
              </span>
            }
          >
            <span className="label-left">
              {zeroNicotineMode ? "Enabled" : "Disabled"}
            </span>
            <Button
              variant="ghost"
              role="switch"
              aria-checked={zeroNicotineMode}
              aria-label="Toggle zero nicotine mode"
              onClick={() => setZeroNicotineMode((value) => !value)}
            >
              <FontAwesomeIcon
                icon={faToggleOn}
                className={toggleClass(zeroNicotineMode)}
              />
            </Button>
          </FormRow>
          <hr />
          <FormRow label="Default strength (undiluted):">
            <InputBorder>
              <input
                type="number"
                className="wide"
                aria-label="Default nicotine base strength"
                value={String(nicConfig.strength)}
                min="0"
                onChange={(event) =>
                  handleChangeNicConfigStrength(event.target.value)
                }
              />
            </InputBorder>
            <span className="label-right">mg/mL</span>
            <NumberControls
              label="default nicotine base strength"
              value={nicConfig.strength}
              step={5}
              min={0}
              onChange={handleChangeNicConfigStrength}
            />
          </FormRow>
          <hr />
          <FormRow label="Default base:">
            <span className="label-left">PG/VG</span>
            <InputBorder>
              <input
                type="number"
                aria-label="Default nicotine base PG percentage"
                value={String(nicConfig.pg)}
                min="0"
                max="100"
                onChange={(event) =>
                  handleChangeNicConfigPgVg(event.target.value, "pg")
                }
              />
            </InputBorder>
            <span className="label-between">/</span>
            <InputBorder>
              <input
                type="number"
                aria-label="Default nicotine base VG percentage"
                value={String(nicConfig.vg)}
                min="0"
                max="100"
                onChange={(event) =>
                  handleChangeNicConfigPgVg(event.target.value, "vg")
                }
              />
            </InputBorder>
            <NumberControls
              label="default nicotine base PG percentage"
              value={nicConfig.pg}
              step={5}
              onChange={(value) => handleChangeNicConfigPgVg(value, "pg")}
            />
          </FormRow>
          <hr />
          <h2 className="mt-10 text-[1.75rem]">Flavors</h2>
          <hr />
          <FormRow label="Default base:">
            <span className="label-left">PG/VG</span>
            <InputBorder>
              <input
                type="number"
                aria-label="Default flavor base PG percentage"
                value={String(flavorConfig.pg)}
                min="0"
                max="100"
                onChange={(event) =>
                  handleChangeFlavorConfigPgVg(event.target.value, "pg")
                }
              />
            </InputBorder>
            <span className="label-between">/</span>
            <InputBorder>
              <input
                type="number"
                aria-label="Default flavor base VG percentage"
                value={String(flavorConfig.vg)}
                min="0"
                max="100"
                onChange={(event) =>
                  handleChangeFlavorConfigPgVg(event.target.value, "vg")
                }
              />
            </InputBorder>
            <NumberControls
              label="default flavor base PG percentage"
              value={flavorConfig.pg}
              step={5}
              onChange={(value) => handleChangeFlavorConfigPgVg(value, "pg")}
            />
          </FormRow>
          <hr />
          <FormRow label="Default percentage:">
            <InputBorder>
              <input
                type="number"
                aria-label="Default flavor percentage"
                value={String(flavorConfig.percentage)}
                min="0"
                onChange={(event) =>
                  handleChangeFlavorConfigPercentage(event.target.value)
                }
              />
            </InputBorder>
            <span className="label-right">%</span>
            <NumberControls
              label="default flavor percentage"
              value={flavorConfig.percentage}
              step={0.5}
              min={0}
              onChange={handleChangeFlavorConfigPercentage}
            />
          </FormRow>
          <hr />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
          {isSaving && <Spinner />}
          {!isSaving && (
            <div className="flex flex-row-reverse px-2 pt-4">
              <button
                type="button"
                className="btn-green text-base"
                onClick={handleClickSaveSettings}
              >
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Save Settings
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
