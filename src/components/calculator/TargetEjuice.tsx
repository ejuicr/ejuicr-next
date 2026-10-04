"use client";

import InputBorder from "@/components/ui/InputBorder";
import NumberControls from "@/components/ui/NumberControls";
import type { CalculatorController } from "./useCalculator";

export default function TargetEjuice({
  calculator,
}: {
  calculator: CalculatorController;
}) {
  const {
    targetPg,
    targetVg,
    handleChangeTargetPgVg,
    targetNicStrength,
    handleChangeTargetNicStrength,
    targetAmount,
    handleChangeTargetAmount,
    zeroNicotineMode,
  } = calculator;

  return (
    <>
      <h3>Target Ejuice</h3>
      <hr />
      <div className="row">
        <h5>Base:</h5>
        <div>
          <span className="label-left">PG/VG</span>
          <InputBorder>
            <input
              data-testid="targetPgInput"
              type="number"
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
              data-testid="targetVgInput"
              type="number"
              value={String(targetVg)}
              min="0"
              max="100"
              onChange={(event) =>
                handleChangeTargetPgVg(event.target.value, "vg")
              }
            />
          </InputBorder>
        </div>
        <NumberControls
          value={targetPg}
          step={5}
          onChange={(value) => handleChangeTargetPgVg(value, "pg")}
        />
      </div>
      <hr />
      {!zeroNicotineMode && (
        <>
          <div className="row">
            <h5>Strength:</h5>
            <div>
              <InputBorder>
                <input
                  data-testid="targetNicStrengthInput"
                  type="number"
                  value={String(targetNicStrength)}
                  min="0"
                  onChange={(event) =>
                    handleChangeTargetNicStrength(event.target.value)
                  }
                />
              </InputBorder>
              <span className="label-right">mg/mL</span>
            </div>
            <NumberControls
              value={targetNicStrength}
              step={1}
              min={0}
              onChange={handleChangeTargetNicStrength}
            />
          </div>
          <hr />
        </>
      )}
      <div className="row">
        <h5>Amount:</h5>
        <div>
          <InputBorder>
            <input
              data-testid="targetAmountInput"
              type="number"
              className="wide"
              value={String(targetAmount)}
              min="0"
              onChange={(event) =>
                handleChangeTargetAmount(event.target.value)
              }
            />
          </InputBorder>
          <span className="label-right">mL</span>
        </div>
        <NumberControls
          value={targetAmount}
          step={10}
          min={0}
          onChange={handleChangeTargetAmount}
        />
      </div>
      <hr />
    </>
  );
}
