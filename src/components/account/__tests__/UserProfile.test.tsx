import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicUser } from "@/types";
import UserProfile from "../UserProfile";

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    _id: "user-1",
    email: "member@example.com",
    hasPassword: true,
    hasGoogleLinked: false,
    hasTwitterLinked: false,
    ...overrides,
  };
}

describe("UserProfile", () => {
  it("falls back to an available linked picture", () => {
    render(
      <UserProfile
        user={makeUser({
          authProvider: "google",
          googleDisplayName: "Member",
          twitterPicture: "https://example.com/twitter.png",
          hasTwitterLinked: true,
        })}
      />,
    );

    expect(
      screen.getByAltText("your Twitter profile picture"),
    ).toHaveAttribute("src", "https://example.com/twitter.png");
  });

  it("prefers the Google picture when both exist", () => {
    render(
      <UserProfile
        user={makeUser({
          authProvider: "twitter",
          twitterHandle: "member",
          twitterPicture: "https://example.com/twitter.png",
          googlePicture: "https://example.com/google.png",
        })}
      />,
    );

    expect(
      screen.getByAltText("your Google profile picture"),
    ).toHaveAttribute("src", "https://example.com/google.png");
  });

  it("omits the image when no picture exists", () => {
    render(<UserProfile user={makeUser()} />);

    expect(
      screen.queryByAltText(/profile picture/i),
    ).not.toBeInTheDocument();
  });
});
