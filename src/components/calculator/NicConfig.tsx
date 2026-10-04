"use client";

import InputBorder from "@/components/ui/InputBorder";
import NumberControls from "@/components/ui/NumberControls";
import type { CalculatorController } from "./useCalculator";

export default function NicConfig({
  calculator,
}: {
  calculator: CalculatorController;
}) {
  const {
    nicConfig,
    handleChangeNicConfigStrength,
    handleChangeNicConfigPgVg,
  } = calculator;

  return (
    <div className="config-wrapper">
      <div className="row">
        <div>
          <span>PG/VG ratio</span>
        </div>
        <div>
          <InputBorder>
            <input
              data-testid="nicConfigPgInput"
              type="number"
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
              data-testid="nicConfigVgInput"
              type="number"
              value={String(nicConfig.vg)}
              min="0"
              max="100"
              onChange={(event) =>
                handleChangeNicConfigPgVg(event.target.value, "vg")
              }
            />
          </InputBorder>
        </div>
        <div>
          <NumberControls
            incrementTestId="nicConfigPgIncBtn"
            decrementTestId="nicConfigPgDecBtn"
            value={nicConfig.pg}
            step={5}
            onChange={(value) => handleChangeNicConfigPgVg(value, "pg")}
          />
        </div>
      </div>
      <hr />
      <div className="row">
        <div>
          <span>Strength</span>
        </div>
        <div>
          <InputBorder>
            <input
              data-testid="nicConfigStrengthInput"
              type="number"
              className="wide"
              value={String(nicConfig.strength)}
              min="0"
              onChange={(event) =>
                handleChangeNicConfigStrength(event.target.value)
              }
            />
          </InputBorder>
          <span className="label-right">mg/mL</span>
        </div>
        <div>
          <NumberControls
            incrementTestId="nicConfigStrengthIncBtn"
            decrementTestId="nicConfigStrengthDecBtn"
            value={nicConfig.strength}
            step={5}
            min={0}
            onChange={handleChangeNicConfigStrength}
          />
        </div>
      </div>
    </div>
  );
}
