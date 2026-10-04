"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import ConfigButton from "@/components/ui/ConfigButton";
import { formatMeasurement, isResultsInvalid, roundToTwoDecimalPlaces } from "@/lib/helpers";
import Flavor from "./Flavor";
import NicConfig from "./NicConfig";
import type { CalculatorController } from "./useCalculator";

export default function Ingredients({
  calculator,
}: {
  calculator: CalculatorController;
}) {
  const {
    nicConfig,
    nicResults,
    targetNicStrength,
    targetAmount,
    pgRequired,
    vgRequired,
    flavors,
    showNicotine,
    units,
    handleAddFlavor,
  } = calculator;

  const [nicConfigOpen, setNicConfigOpen] = useState(false);

  const pgPercentage =
    targetAmount > 0
      ? roundToTwoDecimalPlaces((pgRequired / targetAmount) * 100)
      : 0;
  const vgPercentage =
    targetAmount > 0
      ? roundToTwoDecimalPlaces((vgRequired / targetAmount) * 100)
      : 0;

  const pgWeight = roundToTwoDecimalPlaces(pgRequired * 1.036);
  const vgWeight = roundToTwoDecimalPlaces(vgRequired * 1.26);

  const isNicInvalid = isResultsInvalid(
    nicResults.percentage,
    nicResults.amount,
    nicResults.weight,
  );
  const isPgInvalid = isResultsInvalid(pgPercentage, pgRequired, pgWeight);
  const isVgInvalid = isResultsInvalid(vgPercentage, vgRequired, vgWeight);

  // The error is derived from the current values, so no state/effect needed.
  const error =
    isNicInvalid || isPgInvalid || isVgInvalid
      ? "The formula is not possible with the current values you have entered."
      : nicConfig.strength < targetNicStrength
        ? `Your desired strength of ${targetNicStrength}mg is not possible with this nicotine base. You will need to use a nicotine base liquid with a higher strength.`
        : "";

  const amountCells = (amount: number, weight: number) => {
    if (units === "weight") {
      return (
        <>
          <div />
          <div>
            <span>{`${formatMeasurement(weight)}g`}</span>
          </div>
        </>
      );
    }
    if (units === "volume") {
      return (
        <>
          <div />
          <div>
            <span>{`${formatMeasurement(amount)}mL`}</span>
          </div>
        </>
      );
    }
    return (
      <>
        <div>
          <span>{`${formatMeasurement(amount)}mL`}</span>
        </div>
        <div>
          <span>{`${formatMeasurement(weight)}g`}</span>
        </div>
      </>
    );
  };

  const rowClass = (invalid: boolean) =>
    `row grid grid-cols-[4fr_1fr_1fr_1fr] items-center gap-4 [&>div:first-child]:justify-self-start ${
      invalid ? "text-brand-red" : ""
    }`;

  return (
    <div>
      <h3 className="mt-4">Ingredients</h3>
      <hr />
      {error && (
        <>
          <div data-testid="errorMessage" className="error-message">
            {error}
          </div>
          <hr />
        </>
      )}
      {showNicotine && (
        <>
          <div className={rowClass(isNicInvalid)}>
            <div className="flex items-center">
              <ConfigButton
                testId="nicConfigBtn"
                toggle={() => setNicConfigOpen((open) => !open)}
                label="Configure nicotine"
              />
              <span>
                Nic. ({`${nicConfig.strength}mg, ${nicConfig.pg}/${nicConfig.vg}`}
                )
              </span>
            </div>
            <div>
              <span>{`${roundToTwoDecimalPlaces(nicResults.percentage)}%`}</span>
            </div>
            {amountCells(nicResults.amount, nicResults.weight)}
          </div>
          {nicConfigOpen && <NicConfig calculator={calculator} />}
          <hr />
        </>
      )}
      <div className={rowClass(isPgInvalid)}>
        <div>
          <span className="base-ingredient">PG</span>
        </div>
        <div>
          <span>{`${pgPercentage}%`}</span>
        </div>
        {amountCells(pgRequired, pgWeight)}
      </div>
      <hr />
      <div className={rowClass(isVgInvalid)}>
        <div>
          <span className="base-ingredient">VG</span>
        </div>
        <div>
          <span>{`${vgPercentage}%`}</span>
        </div>
        {amountCells(vgRequired, vgWeight)}
      </div>
      <hr />
      {flavors.map((_flavor, index) => (
        <Flavor key={index} index={index} calculator={calculator} />
      ))}
      <button
        data-testid="flavorAddBtn"
        type="button"
        className="ml-2 text-base"
        onClick={handleAddFlavor}
      >
        <FontAwesomeIcon icon={faPlus} />
        <span className="ml-2">Add Flavor</span>
      </button>
      <hr />
    </div>
  );
}
