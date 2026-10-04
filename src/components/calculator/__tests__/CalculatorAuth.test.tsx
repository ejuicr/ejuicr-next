import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  user: {
    _id: "user-1",
    email: "member@example.com",
    hasPassword: true,
    hasGoogleLinked: false,
    hasTwitterLinked: false,
  } as Record<string, unknown> | null,
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: mocks.user,
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

import Calculator from "../Calculator";
import type { Recipe, SettingsData } from "@/types";

const settings: SettingsData = {
  theme: "dark",
  units: "both",
  base: { pg: 30, vg: 70 },
  strength: 8,
  amount: 50,
  zeroNicotineMode: false,
  nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
  flavor: { percentage: 5, base: { pg: 100, vg: 0 } },
};

const recipe: Recipe = {
  _id: "recipe-1",
  name: "Mango Mix",
  author: "user-1",
  strength: 6,
  base: { pg: 30, vg: 70 },
  amount: 30,
  ingredients: {
    nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
    flavors: [{ name: "Mango", percentage: 8, base: { pg: 100, vg: 0 } }],
  },
};

const draft = {
  targetPg: 20,
  targetVg: 80,
  targetNicStrength: 3,
  targetAmount: 12,
  nicConfig: { strength: 100, pg: 100, vg: 0 },
  flavors: [
    {
      name: "Custom Flavor",
      pg: 100,
      vg: 0,
      percentage: 7,
      amount: 0.84,
      pgAmount: 0.84,
      vgAmount: 0,
      weight: 0.87,
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Calculator initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.user = {
      _id: "user-1",
      email: "member@example.com",
      hasPassword: true,
      hasGoogleLinked: false,
      hasTwitterLinked: false,
    };
  });

  it("keeps a saved recipe's active nicotine visible despite zero-nicotine defaults", async () => {
    const pending = deferred<unknown>();
    mocks.get.mockReturnValue(pending.promise);

    render(<Calculator recipe={recipe} />);
    await act(async () => {
      pending.resolve({ ...settings, zeroNicotineMode: true, strength: 0 });
    });

    expect(screen.getByTestId("targetNicStrengthInput")).toHaveValue(6);
    expect(screen.getByText(/Nic\. \(100mg, 100\/0\)/)).toBeInTheDocument();
    expect(screen.queryByTestId("applyDefaultsBtn")).not.toBeInTheDocument();
  });

  it("initializes a fresh calculator from saved defaults", async () => {
    const pending = deferred<unknown>();
    mocks.get.mockReturnValue(pending.promise);

    render(<Calculator />);
    expect(screen.getByTestId("targetAmountInput")).toHaveValue(30);

    await act(async () => {
      pending.resolve(settings);
    });

    expect(screen.getByTestId("targetAmountInput")).toHaveValue(50);
    expect(screen.getByTestId("targetNicStrengthInput")).toHaveValue(8);
    expect(screen.getByTestId("flavor1NameInput")).toHaveValue("Flavor 1");
  });

  it("hides nicotine for a fresh calculator when zero-nicotine defaults are enabled", async () => {
    const pending = deferred<unknown>();
    mocks.get.mockReturnValue(pending.promise);

    render(<Calculator />);
    await act(async () => {
      pending.resolve({ ...settings, zeroNicotineMode: true });
    });

    expect(screen.queryByTestId("targetNicStrengthInput")).not.toBeInTheDocument();
    expect(screen.queryByText(/Nic\./)).not.toBeInTheDocument();
  });

  it("does not let saved defaults overwrite a restored draft", async () => {
    localStorage.setItem("calculator", JSON.stringify(draft));
    const pending = deferred<unknown>();
    mocks.get.mockReturnValue(pending.promise);

    render(<Calculator />);
    await waitFor(() =>
      expect(screen.getByTestId("targetAmountInput")).toHaveValue(12),
    );

    await act(async () => {
      pending.resolve(settings);
    });

    expect(screen.getByTestId("targetAmountInput")).toHaveValue(12);
    expect(screen.getByTestId("flavor1NameInput")).toHaveValue("Custom Flavor");
    expect(screen.getByTestId("applyDefaultsBtn")).toBeInTheDocument();
  });

  it("preserves edits made while settings are loading", async () => {
    const pending = deferred<unknown>();
    mocks.get.mockReturnValue(pending.promise);

    render(<Calculator />);
    fireEvent.change(screen.getByTestId("targetAmountInput"), {
      target: { value: "45" },
    });

    await act(async () => {
      pending.resolve(settings);
    });

    expect(screen.getByTestId("targetAmountInput")).toHaveValue(45);
  });

  it("applies saved defaults only when the user asks", async () => {
    localStorage.setItem("calculator", JSON.stringify(draft));
    const pending = deferred<unknown>();
    mocks.get.mockReturnValue(pending.promise);

    render(<Calculator />);
    await waitFor(() =>
      expect(screen.getByTestId("targetAmountInput")).toHaveValue(12),
    );
    await act(async () => {
      pending.resolve(settings);
    });

    fireEvent.click(screen.getByTestId("applyDefaultsBtn"));

    expect(screen.getByTestId("targetAmountInput")).toHaveValue(50);
    expect(screen.getByTestId("flavor1NameInput")).toHaveValue("Flavor 1");
  });

  it("applies saved flavor defaults to newly added flavors", async () => {
    const pending = deferred<unknown>();
    mocks.get.mockReturnValue(pending.promise);

    render(<Calculator />);
    await act(async () => {
      pending.resolve({
        ...settings,
        flavor: { percentage: 7, base: { pg: 80, vg: 20 } },
      });
    });

    expect(screen.getByTestId("flavor1PercentInput")).toHaveValue(7);

    fireEvent.click(screen.getByTestId("flavorAddBtn"));
    expect(screen.getByTestId("flavor2PercentInput")).toHaveValue(7);

    fireEvent.click(screen.getByTestId("flavor2ConfigBtn"));
    expect(screen.getByTestId("flavor2ConfigPgInput")).toHaveValue(80);
    expect(screen.getByTestId("flavor2ConfigVgInput")).toHaveValue(20);
  });

  it("does not fetch settings or offer defaults when signed out", async () => {
    mocks.user = null;

    render(<Calculator />);
    await act(async () => {});

    expect(mocks.get).not.toHaveBeenCalled();
    expect(screen.queryByTestId("applyDefaultsBtn")).not.toBeInTheDocument();
  });

  it("still loads defaults when auth refreshes with a new object for the same account", async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    mocks.get
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender } = render(<Calculator />);
    // Authentication refresh replaces the user object but not the account.
    mocks.user = { ...(mocks.user as Record<string, unknown>) };
    rerender(<Calculator />);

    // The first request is cancelled by the refresh when its response lands;
    // the replacement request must not be skipped.
    await act(async () => {
      first.resolve({ ...settings, amount: 40 });
    });
    await act(async () => {
      second.resolve({ ...settings, amount: 50 });
    });

    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("targetAmountInput")).toHaveValue(50);
    expect(screen.getByTestId("applyDefaultsBtn")).toBeInTheDocument();
  });

  it("retries settings loading after a failure", async () => {
    const failed = deferred<unknown>();
    const retried = deferred<unknown>();
    mocks.get
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(retried.promise);

    const { rerender } = render(<Calculator />);
    await act(async () => {
      failed.reject(new Error("network unavailable"));
    });
    expect(screen.queryByTestId("applyDefaultsBtn")).not.toBeInTheDocument();

    mocks.user = { ...(mocks.user as Record<string, unknown>) };
    rerender(<Calculator />);
    await act(async () => {
      retried.resolve(settings);
    });

    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("targetAmountInput")).toHaveValue(50);
  });

  it("ignores a late response for a previous account", async () => {
    const first = deferred<unknown>();
    mocks.get.mockReturnValueOnce(first.promise);

    const { rerender } = render(<Calculator />);

    mocks.user = {
      _id: "user-2",
      email: "other@example.com",
      hasPassword: true,
      hasGoogleLinked: false,
      hasTwitterLinked: false,
    };
    const second = deferred<unknown>();
    mocks.get.mockReturnValueOnce(second.promise);
    rerender(<Calculator />);

    expect(mocks.get).toHaveBeenCalledTimes(2);

    await act(async () => {
      first.resolve({ ...settings, amount: 40 });
    });
    // The first account's late response must not reach this account.
    expect(screen.getByTestId("targetAmountInput")).toHaveValue(30);

    await act(async () => {
      second.resolve({ ...settings, amount: 20 });
    });
    expect(screen.getByTestId("targetAmountInput")).toHaveValue(20);
  });

  it("clears saved defaults on logout without replacing active inputs", async () => {
    mocks.get.mockResolvedValue(settings);

    const { rerender } = render(<Calculator />);
    await waitFor(() =>
      expect(screen.getByTestId("targetAmountInput")).toHaveValue(50),
    );
    expect(screen.getByTestId("applyDefaultsBtn")).toBeInTheDocument();

    // A flavor added while signed in inherits the account's flavor default.
    fireEvent.click(screen.getByTestId("flavorAddBtn"));
    expect(screen.getByTestId("flavor2PercentInput")).toHaveValue(5);

    mocks.user = null;
    rerender(<Calculator />);

    expect(screen.queryByTestId("applyDefaultsBtn")).not.toBeInTheDocument();
    // Active inputs survive logout...
    expect(screen.getByTestId("targetAmountInput")).toHaveValue(50);
    // ...but new flavors no longer inherit the previous account's defaults.
    fireEvent.click(screen.getByTestId("flavorAddBtn"));
    expect(screen.getByTestId("flavor3PercentInput")).toHaveValue(0);
  });

  it("clears the previous account's defaults when the account changes", async () => {
    mocks.get.mockResolvedValueOnce(settings);

    const { rerender } = render(<Calculator />);
    await waitFor(() =>
      expect(screen.getByTestId("targetAmountInput")).toHaveValue(50),
    );
    expect(screen.getByTestId("applyDefaultsBtn")).toBeInTheDocument();

    mocks.user = {
      _id: "user-2",
      email: "other@example.com",
      hasPassword: true,
      hasGoogleLinked: false,
      hasTwitterLinked: false,
    };
    const pending = deferred<unknown>();
    mocks.get.mockReturnValueOnce(pending.promise);
    rerender(<Calculator />);

    // The previous account's defaults are withheld while the new load runs.
    expect(screen.queryByTestId("applyDefaultsBtn")).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve({ ...settings, amount: 20 });
    });
    expect(screen.getByTestId("targetAmountInput")).toHaveValue(20);
    expect(screen.getByTestId("applyDefaultsBtn")).toBeInTheDocument();
  });

  it("disables saving while the formula is not possible", async () => {
    const pending = deferred<unknown>();
    mocks.get.mockReturnValue(pending.promise);

    render(<Calculator />);

    fireEvent.click(screen.getByTestId("nicConfigBtn"));
    fireEvent.change(screen.getByTestId("nicConfigStrengthInput"), {
      target: { value: "3" },
    });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.change(screen.getByTestId("nicConfigStrengthInput"), {
      target: { value: "100" },
    });
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
