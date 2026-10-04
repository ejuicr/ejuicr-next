import { describe, expect, it } from "vitest";
import {
  calculateWeight,
  capitalizeFirstLetter,
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
  it("enforces length limits", () => {
    expect(validatePassword("12345")).toMatch(/too short/i);
    expect(validatePassword("a".repeat(251))).toMatch(/too long/i);
    expect(validatePassword("secret")).toBe(true);
  });
});

describe("capitalizeFirstLetter", () => {
  it("capitalizes the first character", () => {
    expect(capitalizeFirstLetter("google")).toBe("Google");
  });
});
