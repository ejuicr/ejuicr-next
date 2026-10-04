// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  requireUser: vi.fn(),
  setAuthCookie: vi.fn(),
  signToken: vi.fn(() => "signed-token"),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
  setAuthCookie: mocks.setAuthCookie,
  signToken: mocks.signToken,
}));
vi.mock("@/lib/models/user", () => ({
  User: { findByIdAndUpdate: mocks.findByIdAndUpdate },
}));

import { ApiError } from "@/lib/api";
import { POST } from "../set-password/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/user/set-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/set-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signToken.mockReturnValue("signed-token");
  });

  it("requires an authenticated session", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, "Not authorized."));

    const response = await POST(
      jsonRequest({ password: "brand-new-password" }),
      undefined,
    );

    expect(response.status).toBe(401);
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("sets a hashed password, revokes other sessions, and refreshes this cookie", async () => {
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      email: "oauth@example.com",
      password: undefined,
    });
    mocks.findByIdAndUpdate.mockResolvedValue({
      _id: "user-1",
      sessionVersion: 1,
    });

    const response = await POST(
      jsonRequest({ password: "brand-new-password" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Your password has been set.");

    const [userId, update] = mocks.findByIdAndUpdate.mock.calls[0] as [
      string,
      { $set: { password: string }; $inc: { sessionVersion: number } },
    ];
    expect(userId).toBe("user-1");
    expect(update.$set.password).not.toBe("brand-new-password");
    expect(await bcrypt.compare("brand-new-password", update.$set.password)).toBe(
      true,
    );
    expect(update.$inc).toEqual({ sessionVersion: 1 });

    expect(mocks.signToken).toHaveBeenCalledWith({
      _id: "user-1",
      sessionVersion: 1,
    });
    expect(mocks.setAuthCookie).toHaveBeenCalledWith("signed-token");
  });

  it("refuses to overwrite a password that already exists", async () => {
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      email: "member@example.com",
      password: "existing-hash",
    });

    const response = await POST(
      jsonRequest({ password: "brand-new-password" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/already has a password/i);
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects missing or non-string passwords", async () => {
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      email: "oauth@example.com",
      password: undefined,
    });

    for (const password of [undefined, null, 123456, "short"]) {
      const response = await POST(jsonRequest({ password }), undefined);
      expect(response.status).toBe(400);
    }

    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
