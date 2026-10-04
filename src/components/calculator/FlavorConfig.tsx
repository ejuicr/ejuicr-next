"use client";

import InputBorder from "@/components/ui/InputBorder";
import NumberControls from "@/components/ui/NumberControls";
import type { CalculatorController } from "./useCalculator";

export default function FlavorConfig({
  index,
  calculator,
}: {
  index: number;
  calculator: CalculatorController;
}) {
  const { flavors, handleChangeFlavorPgVg } = calculator;
  const flavor = flavors[index];

  return (
    <div className="config-wrapper">
      <div className="row">
        <div>
          <span>PG/VG ratio</span>
        </div>
        <div>
          <InputBorder>
            <input
              data-testid={`flavor${index + 1}ConfigPgInput`}
              type="number"
              min="0"
              max="100"
              value={String(flavor.pg)}
              onChange={(event) =>
                handleChangeFlavorPgVg(index, event.target.value, "pg")
              }
            />
          </InputBorder>
          <span className="label-between">/</span>
          <InputBorder>
            <input
              data-testid={`flavor${index + 1}ConfigVgInput`}
              type="number"
              min="0"
              max="100"
              value={String(flavor.vg)}
              onChange={(event) =>
                handleChangeFlavorPgVg(index, event.target.value, "vg")
              }
            />
          </InputBorder>
        </div>
        <div>
          <NumberControls
            incrementTestId={`flavor${index + 1}ConfigPgIncBtn`}
            decrementTestId={`flavor${index + 1}ConfigPgDecBtn`}
            value={flavor.pg}
            step={5}
            onChange={(value) => handleChangeFlavorPgVg(index, value, "pg")}
          />
        </div>
      </div>
    </div>
  );
}
