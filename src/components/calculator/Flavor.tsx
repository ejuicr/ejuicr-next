"use client";

import { useState } from "react";
import ConfigButton from "@/components/ui/ConfigButton";
import DeleteButton from "@/components/ui/DeleteButton";
import InputBorder from "@/components/ui/InputBorder";
import NumberControls from "@/components/ui/NumberControls";
import { formatMeasurement, isResultsInvalid } from "@/lib/helpers";
import FlavorConfig from "./FlavorConfig";
import type { CalculatorController } from "./useCalculator";

export default function Flavor({
  index,
  calculator,
}: {
  index: number;
  calculator: CalculatorController;
}) {
  const {
    flavors,
    units,
    handleChangeFlavorName,
    handleChangeFlavorPercentage,
    handleRemoveFlavor,
  } = calculator;
  const [flavorConfigOpen, setFlavorConfigOpen] = useState(false);

  const flavor = flavors[index];
  const { amount, weight, name, percentage } = flavor;
  const isInvalid = isResultsInvalid(percentage, amount, weight);

  const resultCells = () => {
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

  return (
    <>
      <div
        className={`row flavor-results mb-4 grid grid-cols-[6fr_1fr] items-center text-right justify-items-end [&>div:first-child]:w-full ${
          isInvalid ? "text-brand-red" : ""
        }`}
      >
        {resultCells()}
      </div>
      <div className="row flavor grid grid-cols-[4fr_1fr_2fr] items-center gap-2">
        <div className="flex">
          <ConfigButton
            testId={`flavor${index + 1}ConfigBtn`}
            toggle={() => setFlavorConfigOpen((open) => !open)}
            label="Configure flavor"
          />
          <InputBorder>
            <input
              data-testid={`flavor${index + 1}NameInput`}
              type="text"
              maxLength={60}
              aria-label={`Flavor ${index + 1} name`}
              value={name}
              onChange={(event) =>
                handleChangeFlavorName(index, event.target.value)
              }
            />
          </InputBorder>
        </div>
        <div className="flex items-center">
          <InputBorder>
            <input
              data-testid={`flavor${index + 1}PercentInput`}
              type="number"
              aria-label={`Flavor ${index + 1} percentage`}
              value={String(percentage)}
              min="0"
              max="100"
              onChange={(event) =>
                handleChangeFlavorPercentage(index, event.target.value)
              }
            />
          </InputBorder>
          <span className="label-right">%</span>
        </div>
        <div className="flex items-center justify-end">
          <NumberControls
            incrementTestId={`flavor${index + 1}PercentIncBtn`}
            decrementTestId={`flavor${index + 1}PercentDecBtn`}
            label={`flavor ${index + 1} percentage`}
            value={percentage}
            step={0.5}
            min={0}
            onChange={(value) => handleChangeFlavorPercentage(index, value)}
          />
          <DeleteButton
            testId={`flavor${index + 1}DeleteBtn`}
            index={index}
            handler={handleRemoveFlavor}
            label={`Delete flavor ${index + 1}`}
          />
        </div>
      </div>
      {flavorConfigOpen && (
        <FlavorConfig index={index} calculator={calculator} />
      )}
      <hr />
    </>
  );
}
