import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/client-api", () => {
  class ApiClientError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "ApiClientError";
    }
  }
  return {
    ApiClientError,
    api: { get: mocks.get, post: mocks.post, put: vi.fn(), delete: vi.fn() },
  };
});

import type { ReactNode } from "react";
import { ApiClientError } from "@/lib/client-api";
import AuthProvider, { useAuth } from "../AuthProvider";

const user = {
  _id: "user-1",
  email: "member@example.com",
  hasPassword: true,
  hasGoogleLinked: false,
  hasTwitterLinked: false,
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider providers={{ google: false, twitter: false }}>
      {children}
    </AuthProvider>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(user);
  });

  it("treats a 401 from refresh as a valid signed-out state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toMatchObject({ _id: "user-1" });

    mocks.get.mockRejectedValueOnce(new ApiClientError(401, "Not authorized."));
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.user).toBeNull();
  });

  it("propagates transient refresh failures to callers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocks.get.mockRejectedValueOnce(new ApiClientError(500, "Server error"));

    await act(async () => {
      await expect(result.current.refresh()).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
  });

  it("clears local state but reports failed logout requests", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocks.post.mockRejectedValueOnce(new ApiClientError(500, "Server error"));

    await act(async () => {
      await expect(result.current.logout()).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });

    expect(result.current.user).toBeNull();
  });
});
