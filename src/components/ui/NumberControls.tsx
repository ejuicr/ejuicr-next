"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { roundToTwoDecimalPlaces } from "@/lib/helpers";

interface NumberControlsProps {
  value: number;
  step: number;
  min?: number;
  onChange: (value: number) => void;
  incrementTestId?: string;
  decrementTestId?: string;
}

export default function NumberControls({
  value,
  step,
  min,
  onChange,
  incrementTestId,
  decrementTestId,
}: NumberControlsProps) {
  const increment = () => {
    onChange(roundToTwoDecimalPlaces(value + step));
  };

  const decrement = () => {
    const next = value - step;
    onChange(min !== undefined && next < min ? min : roundToTwoDecimalPlaces(next));
  };

  return (
    <div className="flex">
      <button
        data-testid={decrementTestId}
        type="button"
        aria-label="Decrease"
        onClick={decrement}
        className="mr-[5px] h-[35px] w-[35px] p-0"
      >
        <FontAwesomeIcon icon={faMinus} />
      </button>
      <button
        data-testid={incrementTestId}
        type="button"
        aria-label="Increase"
        onClick={increment}
        className="h-[35px] w-[35px] p-0"
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  );
}
