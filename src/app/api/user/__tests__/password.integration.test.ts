// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  signToken: vi.fn(() => "signed-token"),
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    requireUser: mocks.requireUser,
    setAuthCookie: mocks.setAuthCookie,
    clearAuthCookie: mocks.clearAuthCookie,
    signToken: mocks.signToken,
  };
});

import { POST as changePassword } from "@/app/api/user/change-password/route";
import { POST as resetPassword } from "@/app/api/user/reset-password/[token]/route";
import { POST as setPassword } from "@/app/api/user/set-password/route";
import { User } from "@/lib/models/user";
import { signResetPasswordToken } from "@/lib/auth";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function storedPassword(userId: string): Promise<string> {
  const user = await User.findById(userId);
  return user?.password ?? "";
}

describe("password mutation races (database-backed)", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    vi.clearAllMocks();
    mocks.signToken.mockReturnValue("signed-token");
  });

  it("lets only one of two concurrent initial-password requests win", async () => {
    const user = await User.create({ email: "race@example.com" });
    mocks.requireUser.mockResolvedValue(user);

    const [first, second] = await Promise.all([
      setPassword(
        jsonRequest("/api/user/set-password", { password: "first-password" }),
        undefined,
      ),
      setPassword(
        jsonRequest("/api/user/set-password", { password: "second-password" }),
        undefined,
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const winner = first.status === 200 ? "first-password" : "second-password";
    const loser = winner === "first-password" ? "second-password" : "first-password";
    const password = await storedPassword(user._id.toString());
    expect(await bcrypt.compare(winner, password)).toBe(true);
    expect(await bcrypt.compare(loser, password)).toBe(false);

    const stored = await User.findById(user._id);
    expect(stored?.sessionVersion).toBe(1);
    // The losing request did not mint a refreshed session.
    expect(mocks.setAuthCookie).toHaveBeenCalledTimes(1);
  });

  it("lets only one of two concurrent password changes with the same old password win", async () => {
    const originalHash = await bcrypt.hash("original-password", 10);
    const user = await User.create({
      email: "double-change@example.com",
      password: originalHash,
    });
    mocks.requireUser.mockResolvedValue(user);

    const [first, second] = await Promise.all([
      changePassword(
        jsonRequest("/api/user/change-password", {
          password: "original-password",
          newPassword: "first-new-password",
        }),
        undefined,
      ),
      changePassword(
        jsonRequest("/api/user/change-password", {
          password: "original-password",
          newPassword: "second-new-password",
        }),
        undefined,
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const winner =
      first.status === 200 ? "first-new-password" : "second-new-password";
    const password = await storedPassword(user._id.toString());
    expect(await bcrypt.compare(winner, password)).toBe(true);
    expect(await User.findById(user._id)).toMatchObject({ sessionVersion: 1 });
    expect(mocks.setAuthCookie).toHaveBeenCalledTimes(1);
  });

  it("cannot let a stale change overwrite a completed password reset", async () => {
    const originalHash = await bcrypt.hash("original-password", 10);
    const user = await User.create({
      email: "stale@example.com",
      password: originalHash,
      passwordResetNonce: "nonce-1",
    });

    // The change request authenticates against this snapshot; the reset
    // completes before the change's conditional write runs.
    const staleUser = await User.findById(user._id);
    mocks.requireUser.mockResolvedValue(staleUser);

    const token = Buffer.from(
      signResetPasswordToken({ id: user._id.toString(), nonce: "nonce-1" }),
    ).toString("base64url");
    const resetResponse = await resetPassword(
      jsonRequest(`/api/user/reset-password/${token}`, {
        password: "reset-password",
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(resetResponse.status).toBe(200);

    const response = await changePassword(
      jsonRequest("/api/user/change-password", {
        password: "original-password",
        newPassword: "stale-new-password",
      }),
      undefined,
    );
    expect(response.status).toBe(409);
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();

    const password = await storedPassword(user._id.toString());
    expect(await bcrypt.compare("reset-password", password)).toBe(true);
    expect(await bcrypt.compare("stale-new-password", password)).toBe(false);
  });
});
