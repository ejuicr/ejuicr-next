// @vitest-environment node
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
  cookie: undefined as string | undefined,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mocks.cookie ? { value: mocks.cookie } : undefined),
  }),
}));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/models/user", () => ({
  User: { findOne: mocks.findOne, findById: mocks.findById },
}));

import { findUserByEmail, getCurrentUser, signToken } from "@/lib/auth";

describe("findUserByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers an exact match and stops there", async () => {
    mocks.findOne.mockResolvedValueOnce({
      _id: "legacy-user",
      email: "User@Example.com",
    });

    const user = await findUserByEmail("User@Example.com");

    expect(user).toMatchObject({ email: "User@Example.com" });
    expect(mocks.findOne).toHaveBeenCalledTimes(1);
    expect(mocks.findOne).toHaveBeenCalledWith({ email: "User@Example.com" });
  });

  it("falls back to the lowercase form for legacy mixed-case accounts", async () => {
    mocks.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        _id: "normalized-user",
        email: "user@example.com",
      });

    const user = await findUserByEmail("User@Example.com");

    expect(user).toMatchObject({ email: "user@example.com" });
    expect(mocks.findOne).toHaveBeenNthCalledWith(2, {
      email: "user@example.com",
    });
  });

  it("does not query twice when the address is already lowercase", async () => {
    mocks.findOne.mockResolvedValueOnce(null);

    expect(await findUserByEmail("user@example.com")).toBeNull();
    expect(mocks.findOne).toHaveBeenCalledTimes(1);
  });

  it("trims surrounding whitespace", async () => {
    mocks.findOne.mockResolvedValueOnce({ _id: "user", email: "a@b.com" });

    await findUserByEmail("  a@b.com  ");

    expect(mocks.findOne).toHaveBeenCalledWith({ email: "a@b.com" });
  });
});

describe("session tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    mocks.cookie = undefined;
  });

  it("signs tokens with a session purpose and version", () => {
    const decoded = jwt.verify(
      signToken({ _id: "user-1", sessionVersion: 3 }),
      "test-secret",
    ) as Record<string, unknown>;

    expect(decoded).toMatchObject({
      _id: "user-1",
      sessionVersion: 3,
      purpose: "session",
    });
  });

  it("accepts a session whose version matches the account", async () => {
    mocks.cookie = signToken({ _id: "user-1", sessionVersion: 2 });
    mocks.findById.mockResolvedValue({ _id: "user-1", sessionVersion: 2 });

    await expect(getCurrentUser()).resolves.toMatchObject({ _id: "user-1" });
  });

  it("rejects a session whose version is stale", async () => {
    mocks.cookie = signToken({ _id: "user-1", sessionVersion: 1 });
    mocks.findById.mockResolvedValue({ _id: "user-1", sessionVersion: 2 });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("keeps legacy sessions valid for accounts that never bumped the version", async () => {
    mocks.cookie = jwt.sign({ _id: "user-1" }, "test-secret");
    mocks.findById.mockResolvedValue({ _id: "user-1" });

    await expect(getCurrentUser()).resolves.toMatchObject({ _id: "user-1" });
  });

  it("rejects a token minted for a non-session purpose", async () => {
    mocks.cookie = jwt.sign(
      { _id: "user-1", purpose: "password-reset" },
      "test-secret",
    );
    mocks.findById.mockResolvedValue({ _id: "user-1" });

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
