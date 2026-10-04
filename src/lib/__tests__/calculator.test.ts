import { describe, expect, it } from "vitest";
import {
  CALCULATOR_STORAGE_VERSION,
  calculateResults,
  clampPercentage,
  flavorInputsFromRecipe,
  getCalculatorStatus,
  parseCalculatorDraft,
  serializeCalculatorDraft,
} from "@/lib/calculator";
import type { CalculatorInput, Recipe } from "@/types";

const baseInput: CalculatorInput = {
  targetPg: 30,
  targetVg: 70,
  targetNicStrength: 6,
  targetAmount: 30,
  nicConfig: { strength: 100, pg: 100, vg: 0 },
  flavors: [{ name: "Flavor 1", pg: 100, vg: 0, percentage: 5 }],
};

describe("calculateResults", () => {
  it("derives nicotine, flavor, and carrier results from inputs", () => {
    const results = calculateResults(baseInput);

    expect(results.nicResults.amount).toBeCloseTo(1.8);
    expect(results.nicResults.percentage).toBeCloseTo(6);
    expect(results.nicResults.pg).toBeCloseTo(1.8);
    expect(results.nicResults.vg).toBeCloseTo(0);
    expect(results.nicResults.weight).toBeCloseTo(1.8648);

    expect(results.flavors).toHaveLength(1);
    expect(results.flavors[0].amount).toBeCloseTo(1.5);
    expect(results.flavors[0].pgAmount).toBeCloseTo(1.5);
    expect(results.flavors[0].weight).toBeCloseTo(1.554);

    expect(results.pgRequired).toBeCloseTo(5.7);
    expect(results.vgRequired).toBeCloseTo(21);
  });

  it("returns empty nicotine results when the base is weaker than the target", () => {
    const results = calculateResults({
      ...baseInput,
      nicConfig: { strength: 3, pg: 100, vg: 0 },
    });

    expect(results.nicResults).toEqual({
      amount: 0,
      percentage: 0,
      pg: 0,
      vg: 0,
      weight: 0,
    });
  });

  it("handles a zero target amount", () => {
    const results = calculateResults({
      ...baseInput,
      targetAmount: 0,
      flavors: [],
    });

    expect(results.nicResults.amount).toBe(0);
    expect(results.pgRequired).toBe(0);
    expect(results.vgRequired).toBe(0);
  });

  it("keeps full precision for small batches", () => {
    const results = calculateResults({
      ...baseInput,
      targetAmount: 0.1,
      flavors: [],
    });

    expect(results.nicResults.amount).toBeCloseTo(0.006);
    expect(results.nicResults.percentage).toBeCloseTo(6);
  });
});

describe("getCalculatorStatus", () => {
  it("flags a mixture whose nicotine base is weaker than the target", () => {
    const input: CalculatorInput = {
      ...baseInput,
      nicConfig: { strength: 3, pg: 100, vg: 0 },
    };

    expect(getCalculatorStatus(input, calculateResults(input)).error).toMatch(
      /not possible/i,
    );
  });

  it("reports no error for a valid mixture", () => {
    const status = getCalculatorStatus(baseInput, calculateResults(baseInput));

    expect(status.error).toBe("");
    expect(status.pgPercentage).toBeCloseTo(19);
  });

  it("flags a target ratio that does not add up to 100", () => {
    const input: CalculatorInput = { ...baseInput, targetPg: 80, targetVg: 80 };
    const status = getCalculatorStatus(input, calculateResults(input));

    expect(status.error).not.toBe("");
    expect(status.pgInvalid).toBe(true);
    expect(status.vgInvalid).toBe(true);
  });

  it("flags a nicotine or flavor carrier ratio that does not add up to 100", () => {
    const nicInput: CalculatorInput = {
      ...baseInput,
      nicConfig: { strength: 100, pg: 80, vg: 80 },
    };
    expect(
      getCalculatorStatus(nicInput, calculateResults(nicInput)).error,
    ).not.toBe("");

    const flavorInput: CalculatorInput = {
      ...baseInput,
      flavors: [{ name: "Broken", pg: 40, vg: 40, percentage: 5 }],
    };
    expect(
      getCalculatorStatus(flavorInput, calculateResults(flavorInput)).error,
    ).not.toBe("");
  });

  it("conserves the target volume for valid mixtures", () => {
    const input: CalculatorInput = {
      ...baseInput,
      nicConfig: { strength: 48, pg: 50, vg: 50 },
      flavors: [
        { name: "Mango", pg: 70, vg: 30, percentage: 8 },
        { name: "Menthol", pg: 0, vg: 100, percentage: 2 },
      ],
    };
    const results = calculateResults(input);
    const total =
      results.nicResults.amount +
      results.flavors.reduce((sum, flavor) => sum + flavor.amount, 0) +
      results.pgRequired +
      results.vgRequired;

    expect(total).toBeCloseTo(input.targetAmount, 10);
    expect(getCalculatorStatus(input, results).error).toBe("");
  });

  it("flags non-finite results", () => {
    const input: CalculatorInput = {
      ...baseInput,
      targetAmount: Number.POSITIVE_INFINITY,
    };
    const status = getCalculatorStatus(input, calculateResults(input));

    expect(status.error).not.toBe("");
  });
});

describe("clampPercentage", () => {
  it("keeps percentages within 0-100", () => {
    expect(clampPercentage(150)).toBe(100);
    expect(clampPercentage(-5)).toBe(0);
    expect(clampPercentage(42.5)).toBe(42.5);
  });
});

describe("flavorInputsFromRecipe", () => {
  it("maps recipe flavors to plain inputs", () => {
    const recipe: Recipe = {
      _id: "r1",
      name: "Mango Mix",
      author: "u1",
      strength: 6,
      base: { pg: 30, vg: 70 },
      amount: 30,
      ingredients: {
        nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
        flavors: [
          { name: "Mango", percentage: 8, base: { pg: 70, vg: 30 } },
        ],
      },
    };

    expect(flavorInputsFromRecipe(recipe)).toEqual([
      { name: "Mango", pg: 70, vg: 30, percentage: 8 },
    ]);
  });
});

describe("parseCalculatorDraft", () => {
  it("round-trips a versioned input-only draft", () => {
    const stored = JSON.parse(serializeCalculatorDraft(baseInput)) as Record<
      string,
      unknown
    >;

    expect(stored.version).toBe(CALCULATOR_STORAGE_VERSION);
    expect(parseCalculatorDraft(stored)).toEqual(baseInput);
  });

  it("accepts legacy drafts without a version", () => {
    expect(
      parseCalculatorDraft({ targetAmount: 50, flavors: [] }),
    ).toEqual({ targetAmount: 50, flavors: [] });
  });

  it("ignores derived fields and recomputes them later", () => {
    const draft = parseCalculatorDraft({
      targetAmount: 30,
      nicResults: { amount: 999 },
      pgRequired: 999,
      vgRequired: 999,
      flavors: [
        {
          name: "Stored",
          pg: 100,
          vg: 0,
          percentage: 5,
          amount: 999,
          pgAmount: 999,
          vgAmount: 999,
          weight: 999,
        },
      ],
    });

    expect(draft).toEqual({
      targetAmount: 30,
      flavors: [{ name: "Stored", pg: 100, vg: 0, percentage: 5 }],
    });
  });

  it("drops invalid values instead of trusting them", () => {
    const draft = parseCalculatorDraft({
      targetPg: "30",
      targetVg: 120,
      targetNicStrength: -1,
      targetAmount: Number.POSITIVE_INFINITY,
      nicConfig: { strength: -5, pg: 100, vg: 0 },
      flavors: "nope",
    });

    expect(draft).toBeNull();
  });

  it("filters invalid flavor entries but keeps valid ones", () => {
    const draft = parseCalculatorDraft({
      flavors: [
        { name: "Good", pg: 100, vg: 0, percentage: 5 },
        { name: 123, pg: 100, vg: 0, percentage: 5 },
        { name: "Too much", pg: 100, vg: 0, percentage: 150 },
        null,
      ],
    });

    expect(draft).toEqual({
      flavors: [{ name: "Good", pg: 100, vg: 0, percentage: 5 }],
    });
  });

  it("rejects unknown format versions and non-objects", () => {
    expect(parseCalculatorDraft({ version: 99, targetAmount: 30 })).toBeNull();
    expect(parseCalculatorDraft(null)).toBeNull();
    expect(parseCalculatorDraft("draft")).toBeNull();
    expect(parseCalculatorDraft([])).toBeNull();
  });

  it("drops target PG/VG when the pair does not add up to 100", () => {
    // The reproduced failure: a version-2 draft with 80/80, zero target
    // nicotine, no flavors, and a 30 mL target used to restore a 160%-carrier
    // mixture while reporting no error.
    const draft = parseCalculatorDraft({
      version: CALCULATOR_STORAGE_VERSION,
      targetPg: 80,
      targetVg: 80,
      targetNicStrength: 0,
      targetAmount: 30,
      nicConfig: { strength: 100, pg: 100, vg: 0 },
      flavors: [],
    });

    expect(draft).toEqual({
      targetNicStrength: 0,
      targetAmount: 30,
      nicConfig: { strength: 100, pg: 100, vg: 0 },
      flavors: [],
    });
    expect(draft).not.toHaveProperty("targetPg");
    expect(draft).not.toHaveProperty("targetVg");

    // Nothing usable remains when the draft only carries the bad pair.
    expect(
      parseCalculatorDraft({ targetPg: 80, targetVg: 80 }),
    ).toBeNull();
  });

  it("drops nicotine and flavor ratios that do not add up to 100", () => {
    const draft = parseCalculatorDraft({
      nicConfig: { strength: 100, pg: 80, vg: 80 },
      flavors: [
        { name: "Bad carrier", pg: 60, vg: 60, percentage: 5 },
        { name: "Good", pg: 100, vg: 0, percentage: 5 },
      ],
    });

    expect(draft).toEqual({
      flavors: [{ name: "Good", pg: 100, vg: 0, percentage: 5 }],
    });
  });

  it("keeps a target pair that adds up to 100 within tolerance", () => {
    expect(
      parseCalculatorDraft({ targetPg: 33.33, targetVg: 66.67 }),
    ).toEqual({ targetPg: 33.33, targetVg: 66.67 });
  });
});
