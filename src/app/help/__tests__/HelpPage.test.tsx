import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ support: "", feedback: "" }));

vi.mock("@/lib/config", () => ({
  get SUPPORT_EMAIL() {
    return mocks.support;
  },
  get FEEDBACK_EMAIL() {
    return mocks.feedback;
  },
}));

import HelpPage from "../page";

describe("HelpPage", () => {
  beforeEach(() => {
    mocks.support = "";
    mocks.feedback = "";
  });

  it("omits mail links that are not configured", () => {
    render(<HelpPage />);

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.getAllByRole("link", { name: "@ejuicr" }).length).toBeGreaterThan(0);
  });

  it("renders configured mail links", () => {
    mocks.support = "support@example.com";
    mocks.feedback = "feedback@example.com";

    render(<HelpPage />);

    expect(
      screen.getByRole("link", { name: "support@example.com" }),
    ).toHaveAttribute("href", "mailto:support@example.com");
    expect(
      screen.getByRole("link", { name: "feedback@example.com" }),
    ).toHaveAttribute("href", "mailto:feedback@example.com");
  });
});
