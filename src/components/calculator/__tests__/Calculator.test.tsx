import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    providers: { google: true, twitter: true },
    refresh: vi.fn(),
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

import Calculator from "../Calculator";

const { getByTestId, getByText } = screen;

const app = <Calculator />;

beforeEach(() => {
  localStorage.clear();
});

describe("Calculator", () => {
  it("renders the Target Ejuice form correctly", () => {
    render(app);
    expect(getByText(/Base:/i)).toBeInTheDocument();
    expect(getByText(/Strength:/i)).toBeInTheDocument();
    expect(getByText(/Amount:/i)).toBeInTheDocument();

    const targetPgInput = getByTestId("targetPgInput");
    const targetVgInput = getByTestId("targetVgInput");
    const targetNicStrengthInput = getByTestId("targetNicStrengthInput");
    const targetAmountInput = getByTestId("targetAmountInput");

    expect(targetPgInput).toHaveAttribute("type", "number");
    expect(targetPgInput).toHaveValue(30);
    expect(targetVgInput).toHaveAttribute("type", "number");
    expect(targetVgInput).toHaveValue(70);
    expect(targetNicStrengthInput).toHaveAttribute("type", "number");
    expect(targetNicStrengthInput).toHaveValue(6);
    expect(targetAmountInput).toHaveAttribute("type", "number");
    expect(targetAmountInput).toHaveValue(30);
  });

  it("renders the Ingredients section correctly", () => {
    render(app);
    expect(getByText("Nic. (100mg, 100/0)")).toBeInTheDocument();
    expect(getByText("PG")).toBeInTheDocument();
    expect(getByText("VG")).toBeInTheDocument();
    expect(getByTestId("flavor1ConfigBtn")).toBeInTheDocument();
    expect(getByTestId("flavor1PercentIncBtn")).toBeInTheDocument();
    expect(getByTestId("flavor1PercentDecBtn")).toBeInTheDocument();
    expect(getByTestId("flavor1DeleteBtn")).toBeInTheDocument();
    expect(getByTestId("flavorAddBtn")).toBeInTheDocument();
    expect(getByText("1.86g")).toBeInTheDocument();
    expect(getByText("5.91g")).toBeInTheDocument();
    expect(getByText("26.46g")).toBeInTheDocument();
    expect(getByText("1.55g")).toBeInTheDocument();
  });
});

describe("Nicotine config", () => {
  it("toggle renders", () => {
    render(app);
    expect(getByTestId("nicConfigBtn")).toBeInTheDocument();
  });

  it("button click renders the nic config", () => {
    render(app);
    fireEvent.click(getByTestId("nicConfigBtn"));
    const strengthInput = getByTestId("nicConfigStrengthInput");
    expect(strengthInput).toHaveAttribute("type", "number");
    expect(strengthInput).toHaveValue(100);
  });

  it("ratio number controls work correctly", () => {
    render(app);
    fireEvent.click(getByTestId("nicConfigBtn"));
    const pgInput = getByTestId("nicConfigPgInput");
    const vgInput = getByTestId("nicConfigVgInput");
    fireEvent.click(getByTestId("nicConfigPgDecBtn"));
    expect(pgInput).toHaveValue(95);
    expect(vgInput).toHaveValue(5);
    fireEvent.click(getByTestId("nicConfigPgIncBtn"));
    expect(pgInput).toHaveValue(100);
    expect(vgInput).toHaveValue(0);
  });

  it("strength number controls work correctly", () => {
    render(app);
    fireEvent.click(getByTestId("nicConfigBtn"));
    const strengthInput = getByTestId("nicConfigStrengthInput");
    fireEvent.click(getByTestId("nicConfigStrengthIncBtn"));
    expect(strengthInput).toHaveValue(105);
    fireEvent.click(getByTestId("nicConfigStrengthDecBtn"));
    expect(strengthInput).toHaveValue(100);
  });
});

describe("Flavor config", () => {
  it("button click renders the flavor config", () => {
    render(app);
    fireEvent.click(getByTestId("flavor1ConfigBtn"));
    expect(getByTestId("flavor1ConfigPgInput")).toBeInTheDocument();
    expect(getByTestId("flavor1ConfigVgInput")).toBeInTheDocument();
  });

  it("ratio number controls work correctly", () => {
    render(app);
    fireEvent.click(getByTestId("flavor1ConfigBtn"));
    const pgInput = getByTestId("flavor1ConfigPgInput");
    const vgInput = getByTestId("flavor1ConfigVgInput");
    fireEvent.click(getByTestId("flavor1ConfigPgDecBtn"));
    fireEvent.click(getByTestId("flavor1ConfigPgDecBtn"));
    expect(pgInput).toHaveValue(90);
    expect(vgInput).toHaveValue(10);
    fireEvent.click(getByTestId("flavor1ConfigPgIncBtn"));
    expect(pgInput).toHaveValue(95);
    expect(vgInput).toHaveValue(5);
  });
});

describe("Flavor", () => {
  it("number controls work correctly", () => {
    render(app);
    const percentInput = getByTestId("flavor1PercentInput");
    fireEvent.click(getByTestId("flavor1PercentIncBtn"));
    expect(percentInput).toHaveValue(5.5);
    fireEvent.click(getByTestId("flavor1PercentDecBtn"));
    expect(percentInput).toHaveValue(5);
  });

  it("clamps percentages to the valid range", () => {
    render(app);
    const percentInput = getByTestId("flavor1PercentInput");
    fireEvent.change(percentInput, { target: { value: "150" } });
    expect(percentInput).toHaveValue(100);
    fireEvent.change(percentInput, { target: { value: "-5" } });
    expect(percentInput).toHaveValue(0);
  });

  it("'add' button displays a new flavor row", () => {
    render(app);
    fireEvent.click(getByTestId("flavorAddBtn"));
    expect(getByTestId("flavor2NameInput")).toBeInTheDocument();
  });

  it("'delete' button removes a flavor row", () => {
    render(app);
    fireEvent.click(getByTestId("flavorAddBtn"));
    const deleteButton = getByTestId("flavor2DeleteBtn");
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);
    expect(deleteButton).not.toBeInTheDocument();
  });
});

describe("Nicotine", () => {
  it("is calculated correctly", () => {
    render(app);
    const input = getByTestId("targetNicStrengthInput");
    expect(input).toHaveValue(6);
    fireEvent.change(input, { target: { value: 4 } });
    expect(input).toHaveValue(4);
    expect(getByText("1.2mL")).toBeInTheDocument();
    expect(getByText("1.24g")).toBeInTheDocument();
  });
});

describe("Flavors", () => {
  it("are calculated correctly", () => {
    render(app);
    const input = getByTestId("flavor1PercentInput");
    expect(input).toHaveValue(5);
    fireEvent.change(input, { target: { value: 3 } });
    expect(input).toHaveValue(3);
    expect(getByText("0.9mL")).toBeInTheDocument();
    expect(getByText("0.93g")).toBeInTheDocument();
  });
});

describe("PG", () => {
  it("is calculated correctly from the target base ratio", () => {
    render(app);
    const input = getByTestId("targetPgInput");
    expect(input).toHaveValue(30);
    fireEvent.change(input, { target: { value: 50 } });
    expect(input).toHaveValue(50);
    expect(getByText("11.7mL")).toBeInTheDocument();
    expect(getByText("12.12g")).toBeInTheDocument();
  });

  it("is calculated correctly from the nicotine ratio", () => {
    render(app);
    fireEvent.click(getByTestId("nicConfigBtn"));
    fireEvent.change(getByTestId("nicConfigPgInput"), {
      target: { value: 50 },
    });
    expect(getByText("6.6mL")).toBeInTheDocument();
    expect(getByText("6.84g")).toBeInTheDocument();
  });

  it("is calculated correctly from the flavor ratio", () => {
    render(app);
    fireEvent.click(getByTestId("flavor1ConfigBtn"));
    fireEvent.change(getByTestId("flavor1ConfigPgInput"), {
      target: { value: 50 },
    });
    expect(getByText("6.45mL")).toBeInTheDocument();
    expect(getByText("6.68g")).toBeInTheDocument();
  });
});

describe("VG", () => {
  it("is calculated correctly from the target base ratio", () => {
    render(app);
    const input = getByTestId("targetVgInput");
    expect(input).toHaveValue(70);
    fireEvent.change(input, { target: { value: 30 } });
    expect(input).toHaveValue(30);
    expect(getByText("9mL")).toBeInTheDocument();
    expect(getByText("11.34g")).toBeInTheDocument();
  });

  it("is calculated correctly from the nicotine ratio", () => {
    render(app);
    fireEvent.click(getByTestId("nicConfigBtn"));
    fireEvent.change(getByTestId("nicConfigVgInput"), {
      target: { value: 100 },
    });
    expect(getByText("19.2mL")).toBeInTheDocument();
    expect(getByText("24.19g")).toBeInTheDocument();
  });

  it("is calculated correctly from the flavor ratio", () => {
    render(app);
    fireEvent.click(getByTestId("flavor1ConfigBtn"));
    fireEvent.change(getByTestId("flavor1ConfigVgInput"), {
      target: { value: 100 },
    });
    expect(getByText("19.5mL")).toBeInTheDocument();
    expect(getByText("24.57g")).toBeInTheDocument();
  });
});

describe("Error message", () => {
  it("renders when the base nic strength is less than the target strength", () => {
    render(app);
    fireEvent.click(getByTestId("nicConfigBtn"));
    fireEvent.change(getByTestId("nicConfigStrengthInput"), {
      target: { value: 3 },
    });
    expect(getByTestId("errorMessage")).toBeInTheDocument();
  });

  it("renders when the target pg/vg ratio is not possible", () => {
    render(app);
    const targetPgInput = getByTestId("targetPgInput");
    const targetVgInput = getByTestId("targetVgInput");
    expect(targetPgInput).toHaveValue(30);
    fireEvent.change(targetPgInput, { target: { value: 0 } });
    expect(targetVgInput).toHaveValue(100);
    expect(getByTestId("errorMessage")).toBeInTheDocument();
  });
});

describe("Precision", () => {
  it("rounds only for display and keeps the true nicotine percentage", () => {
    render(app);
    fireEvent.click(getByTestId("flavor1DeleteBtn"));
    fireEvent.change(getByTestId("targetAmountInput"), {
      target: { value: "0.1" },
    });

    // 6 mg/mL * 0.1 mL / 100 mg/mL = 0.006 mL. The displayed amount is
    // rounded, but the percentage uses the exact amount: 6%, not 10%.
    expect(getByText("6%")).toBeInTheDocument();
    expect(getByText("0.01mL")).toBeInTheDocument();
  });

  it("marks positive amounts below display precision", () => {
    render(app);
    fireEvent.click(getByTestId("flavor1DeleteBtn"));
    fireEvent.change(getByTestId("targetAmountInput"), {
      target: { value: "0.05" },
    });

    expect(getByText("<0.01mL")).toBeInTheDocument();
  });
});

describe("Saved draft", () => {
  it("restores a valid empty flavor list", () => {
    localStorage.setItem(
      "calculator",
      JSON.stringify({ targetNicStrength: 4, flavors: [] }),
    );

    render(app);

    expect(getByTestId("targetNicStrengthInput")).toHaveValue(4);
    expect(getByTestId("flavorAddBtn")).toBeInTheDocument();
    expect(screen.queryByTestId("flavor1PercentInput")).not.toBeInTheDocument();
  });
});
