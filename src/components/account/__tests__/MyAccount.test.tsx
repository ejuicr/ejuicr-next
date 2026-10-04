import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  setUser: vi.fn(),
  logout: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  user: {
    _id: "user-1",
    email: "oauth@example.com",
    authProvider: "google",
    hasPassword: false,
    hasGoogleLinked: true,
    hasTwitterLinked: false,
  } as PublicUser,
}));

vi.mock("@/lib/client-api", () => ({
  api: { get: mocks.get, post: mocks.post, delete: mocks.delete },
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: mocks.user,
    setUser: mocks.setUser,
    logout: mocks.logout,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

import type { PublicUser } from "@/types";
import MyAccount from "../MyAccount";

describe("MyAccount set password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/user/me" ? { ...mocks.user } : { count: 2 },
      ),
    );
    mocks.post.mockResolvedValue({ message: "Your password has been set." });
  });

  it("posts to the authenticated set-password endpoint", async () => {
    render(<MyAccount />);

    fireEvent.change(await screen.findByPlaceholderText("Password"), {
      target: { value: "brand-new-password" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
      target: { value: "brand-new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set Password" }));

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith("/api/user/set-password", {
        password: "brand-new-password",
      }),
    );
    expect(mocks.post).not.toHaveBeenCalledWith("/api/user", expect.anything());
    expect(mocks.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ hasPassword: true }),
    );
    expect(
      await screen.findByText("Your password has been set."),
    ).toBeInTheDocument();
  });

  it("falls back to an available linked profile picture", async () => {
    mocks.user = {
      ...mocks.user,
      authProvider: "google",
      hasTwitterLinked: true,
      twitterPicture: "https://example.com/twitter.png",
    };

    render(<MyAccount />);

    expect(
      await screen.findByAltText("Your Twitter profile picture"),
    ).toHaveAttribute("src", "https://example.com/twitter.png");
  });
});
