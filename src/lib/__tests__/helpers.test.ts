import { describe, expect, it } from "vitest";
import {
  calculateWeight,
  capitalizeFirstLetter,
  formatMeasurement,
  isNormalizedRatio,
  isResultsInvalid,
  parseNumberInput,
  roundToTwoDecimalPlaces,
  totalFlavorPercentage,
  totalFlavorPg,
  totalFlavorVg,
  validateEmail,
  validatePassword,
  validatePgVgValue,
} from "@/lib/helpers";

describe("roundToTwoDecimalPlaces", () => {
  it("rounds to two decimal places", () => {
    expect(roundToTwoDecimalPlaces(1.234)).toBe(1.23);
    expect(roundToTwoDecimalPlaces(1.235)).toBe(1.24);
    expect(roundToTwoDecimalPlaces(1.8)).toBe(1.8);
  });

  it("rounds small scientific-notation values without turning them into NaN", () => {
    expect(roundToTwoDecimalPlaces(1e-7)).toBe(0);
    expect(roundToTwoDecimalPlaces(-1e-7)).toBe(0);
    expect(roundToTwoDecimalPlaces(0.005)).toBe(0.01);
  });

  it("keeps large scientific-notation values finite", () => {
    expect(roundToTwoDecimalPlaces(1e21)).toBe(1e21);
    expect(Number.isFinite(roundToTwoDecimalPlaces(1e300))).toBe(true);
    expect(roundToTwoDecimalPlaces(Number.MAX_VALUE)).toBe(Number.MAX_VALUE);
  });

  it("passes non-finite values through so callers can detect them", () => {
    expect(Number.isNaN(roundToTwoDecimalPlaces(Number.NaN))).toBe(true);
    expect(roundToTwoDecimalPlaces(Number.POSITIVE_INFINITY)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("formatMeasurement", () => {
  it("rounds to two decimals for display", () => {
    expect(formatMeasurement(1.234)).toBe("1.23");
    expect(formatMeasurement(1.2)).toBe("1.2");
    expect(formatMeasurement(0)).toBe("0");
  });

  it("marks positive amounts below display precision", () => {
    expect(formatMeasurement(0.004)).toBe("<0.01");
    expect(formatMeasurement(0.006)).toBe("0.01");
    expect(formatMeasurement(-0.006)).toBe("-0.01");
  });
});

describe("parseNumberInput", () => {
  it("returns 0 for negative values", () => {
    expect(parseNumberInput(-5)).toBe(0);
    expect(parseNumberInput("-5")).toBe(0);
  });

  it("removes leading zeros", () => {
    expect(parseNumberInput("0.5")).toBe(0.5);
    expect(parseNumberInput("007")).toBe(7);
  });

  it("returns 0 for non-numeric values", () => {
    expect(parseNumberInput("")).toBe(0);
    expect(parseNumberInput("abc")).toBe(0);
  });
});

describe("validatePgVgValue", () => {
  it("clamps values between 0 and 100 and rounds to integers", () => {
    expect(validatePgVgValue(120)).toBe(100);
    expect(validatePgVgValue(-20)).toBe(0);
    expect(validatePgVgValue("")).toBe(0);
    expect(validatePgVgValue(49.6)).toBe(50);
  });
});

describe("flavor totals", () => {
  const flavors = [
    { percentage: 5, pgAmount: 1.5, vgAmount: 0 },
    { percentage: 2, pgAmount: 0, vgAmount: 0.6 },
  ];

  it("sums percentages", () => {
    expect(totalFlavorPercentage(flavors)).toBe(7);
  });

  it("sums pg amounts", () => {
    expect(totalFlavorPg(flavors)).toBe(1.5);
  });

  it("sums vg amounts", () => {
    expect(totalFlavorVg(flavors)).toBe(0.6);
  });
});

describe("isResultsInvalid", () => {
  it("is true when any value is negative", () => {
    expect(isResultsInvalid(-1, 1, 1)).toBe(true);
    expect(isResultsInvalid(1, -1, 1)).toBe(true);
    expect(isResultsInvalid(1, 1, -1)).toBe(true);
    expect(isResultsInvalid(1, 1, 1)).toBe(false);
  });

  it("is true when any value is not finite", () => {
    expect(isResultsInvalid(Number.NaN, 1, 1)).toBe(true);
    expect(isResultsInvalid(1, Number.POSITIVE_INFINITY, 1)).toBe(true);
    expect(isResultsInvalid(1, 1, Number.NEGATIVE_INFINITY)).toBe(true);
  });
});

describe("isNormalizedRatio", () => {
  it("accepts ratios that add up to 100 within tolerance", () => {
    expect(isNormalizedRatio(30, 70)).toBe(true);
    expect(isNormalizedRatio(0, 100)).toBe(true);
    expect(isNormalizedRatio(33.33, 66.67)).toBe(true);
  });

  it("rejects sums away from 100 and non-finite values", () => {
    expect(isNormalizedRatio(80, 80)).toBe(false);
    expect(isNormalizedRatio(50, 40)).toBe(false);
    expect(isNormalizedRatio(Number.NaN, 70)).toBe(false);
    expect(isNormalizedRatio(30, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("rejects out-of-range values even when they add up to 100", () => {
    expect(isNormalizedRatio(105, -5)).toBe(false);
    expect(isNormalizedRatio(-5, 105)).toBe(false);
  });
});

describe("calculateWeight", () => {
  it("uses pg and vg densities", () => {
    expect(calculateWeight(10, 100, 0)).toBeCloseTo(10.36);
    expect(calculateWeight(10, 0, 100)).toBeCloseTo(12.6);
    expect(calculateWeight(10, 50, 50)).toBeCloseTo(11.48);
  });
});

describe("validateEmail", () => {
  it("accepts valid addresses and rejects invalid ones", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("nope")).toBe(false);
    expect(validateEmail("nope@")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("enforces the minimum length and bcrypt's 72-byte limit", () => {
    expect(validatePassword("12345")).toMatch(/too short/i);
    expect(validatePassword("secret")).toBe(true);
    expect(validatePassword("a".repeat(72))).toBe(true);
    expect(validatePassword("a".repeat(73))).toMatch(/too long/i);
    expect(validatePassword("é".repeat(37))).toMatch(/too long/i);
  });
});

describe("capitalizeFirstLetter", () => {
  it("capitalizes the first character", () => {
    expect(capitalizeFirstLetter("google")).toBe("Google");
  });
});
