"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import ConfigButton from "@/components/ui/ConfigButton";
import { formatMeasurement } from "@/lib/helpers";
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
    flavors,
    showNicotine,
    units,
    handleAddFlavor,
  } = calculator;

  const [nicConfigOpen, setNicConfigOpen] = useState(false);

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
    `row grid grid-cols-[4fr_1fr_1fr_1fr] items-center gap-4 justify-items-end [&>div:first-child]:justify-self-start ${
      invalid ? "text-brand-red" : ""
    }`;

  return (
    <div>
      <h2 className="mt-[1em] text-[2.25rem]">Ingredients</h2>
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
          <div className={rowClass(nicInvalid)}>
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
              <span>{`${nicPercentage}%`}</span>
            </div>
            {amountCells(nicResults.amount, nicResults.weight)}
          </div>
          {nicConfigOpen && <NicConfig calculator={calculator} />}
          <hr />
        </>
      )}
      <div className={rowClass(pgInvalid)}>
        <div>
          <span className="base-ingredient">PG</span>
        </div>
        <div>
          <span>{`${pgPercentage}%`}</span>
        </div>
        {amountCells(pgRequired, pgWeight)}
      </div>
      <hr />
      <div className={rowClass(vgInvalid)}>
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
