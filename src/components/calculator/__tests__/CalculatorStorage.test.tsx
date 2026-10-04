import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    providers: { google: false, twitter: false },
    refresh: vi.fn(),
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/lib/client-api", () => ({
  api: { get: mocks.get, post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { CALCULATOR_STORAGE_VERSION } from "@/lib/calculator";
import Calculator from "../Calculator";

describe("Calculator storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores malformed stored values and keeps the defaults", () => {
    localStorage.setItem(
      "calculator",
      JSON.stringify({
        targetPg: 500,
        targetAmount: "lots",
        nicConfig: { strength: -5 },
        flavors: "nope",
      }),
    );

    render(<Calculator />);

    expect(screen.getByTestId("targetAmountInput")).toHaveValue(30);
    expect(screen.getByTestId("targetPgInput")).toHaveValue(30);
    fireEvent.click(screen.getByTestId("nicConfigBtn"));
    expect(screen.getByTestId("nicConfigStrengthInput")).toHaveValue(100);
  });

  it("recomputes results instead of trusting stored derived values", () => {
    localStorage.setItem(
      "calculator",
      JSON.stringify({
        targetAmount: 30,
        flavors: [
          {
            name: "Stored",
            pg: 100,
            vg: 0,
            percentage: 5,
            amount: 9999,
            pgAmount: 9999,
            vgAmount: 9999,
            weight: 9999,
          },
        ],
      }),
    );

    render(<Calculator />);

    expect(screen.getByTestId("flavor1PercentInput")).toHaveValue(5);
    expect(screen.getByText("1.5mL")).toBeInTheDocument();
    expect(screen.queryByText("9999mL")).not.toBeInTheDocument();
  });

  it("persists only inputs with an explicit version", () => {
    render(<Calculator />);

    const stored = JSON.parse(
      localStorage.getItem("calculator") ?? "null",
    ) as Record<string, unknown>;

    expect(stored.version).toBe(CALCULATOR_STORAGE_VERSION);
    expect(stored).not.toHaveProperty("nicResults");
    expect(stored).not.toHaveProperty("pgRequired");
    expect(stored).not.toHaveProperty("vgRequired");
    expect(stored.flavors).toEqual([
      { name: "Flavor 1", pg: 100, vg: 0, percentage: 5 },
    ]);
  });

  it("keeps working when saving to storage fails", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    render(<Calculator />);
    fireEvent.change(screen.getByTestId("targetAmountInput"), {
      target: { value: "45" },
    });

    expect(screen.getByTestId("targetAmountInput")).toHaveValue(45);
    expect(console.warn).toHaveBeenCalled();
  });

  it("keeps working when reading from storage fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    render(<Calculator />);

    expect(screen.getByTestId("targetAmountInput")).toHaveValue(30);
    expect(console.error).toHaveBeenCalled();
  });
});
