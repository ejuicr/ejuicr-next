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
    showNicotine,
  } = calculator;

  return (
    <>
      <h2 className="text-[2.25rem]">Target Ejuice</h2>
      <hr />
      <div className="row">
        <h5>Base:</h5>
        <div>
          <span className="label-left">PG/VG</span>
          <InputBorder>
            <input
              data-testid="targetPgInput"
              type="number"
              aria-label="Target PG percentage"
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
              aria-label="Target VG percentage"
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
          label="target PG percentage"
          value={targetPg}
          step={5}
          onChange={(value) => handleChangeTargetPgVg(value, "pg")}
        />
      </div>
      <hr />
      {showNicotine && (
        <>
          <div className="row">
            <h5>Strength:</h5>
            <div>
              <InputBorder>
                <input
                  data-testid="targetNicStrengthInput"
                  type="number"
                  aria-label="Target nicotine strength"
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
              label="target nicotine strength"
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
              aria-label="Target amount"
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
          label="target amount"
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
