import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ donation: "", feedback: "" }));

vi.mock("@/lib/config", () => ({
  get DONATION_LINK() {
    return mocks.donation;
  },
  get FEEDBACK_EMAIL() {
    return mocks.feedback;
  },
}));

import ContributePage from "../page";

describe("ContributePage", () => {
  beforeEach(() => {
    mocks.donation = "";
    mocks.feedback = "";
  });

  it("links to the current repository and issue tracker", () => {
    render(<ContributePage />);

    expect(screen.getByRole("link", { name: "Github" })).toHaveAttribute(
      "href",
      "https://github.com/ejuicr/ejuicr-next",
    );
    expect(screen.getByRole("link", { name: "issues page" })).toHaveAttribute(
      "href",
      "https://github.com/ejuicr/ejuicr-next/issues",
    );
  });

  it("omits the feedback email and donate link when unset", () => {
    render(<ContributePage />);

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(document.querySelector('a[href="#"]')).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Donate" }),
    ).not.toBeInTheDocument();
  });

  it("renders the configured donate link and feedback email", () => {
    mocks.donation = "https://example.com/donate";
    mocks.feedback = "feedback@example.com";

    render(<ContributePage />);

    expect(screen.getByRole("heading", { name: "Donate" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "here" })).toHaveAttribute(
      "href",
      "https://example.com/donate",
    );
    expect(
      screen.getByRole("link", { name: "feedback@example.com" }),
    ).toHaveAttribute("href", "mailto:feedback@example.com");
  });
});
