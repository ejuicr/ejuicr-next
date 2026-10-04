// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findOneAndUpdate: vi.fn(),
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
  User: { findOneAndUpdate: mocks.findOneAndUpdate },
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
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("sets a hashed password, revokes other sessions, and refreshes this cookie", async () => {
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      email: "oauth@example.com",
      password: undefined,
      sessionVersion: 3,
    });
    mocks.findOneAndUpdate.mockResolvedValue({
      _id: "user-1",
      sessionVersion: 4,
    });

    const response = await POST(
      jsonRequest({ password: "brand-new-password" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Your password has been set.");

    const [filter, update, options] = mocks.findOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      { $set: { password: string }; $inc: { sessionVersion: number } },
      Record<string, unknown>,
    ];
    // The "no password yet" and session-version preconditions are enforced by
    // the write filter, not only by the earlier read.
    expect(filter).toEqual({
      _id: "user-1",
      sessionVersion: 3,
      password: { $in: [null, ""] },
    });
    expect(update.$set.password).not.toBe("brand-new-password");
    expect(await bcrypt.compare("brand-new-password", update.$set.password)).toBe(
      true,
    );
    expect(update.$inc).toEqual({ sessionVersion: 1 });
    expect(options).toEqual({ returnDocument: "after" });

    expect(mocks.signToken).toHaveBeenCalledWith({
      _id: "user-1",
      sessionVersion: 4,
    });
    expect(mocks.setAuthCookie).toHaveBeenCalledWith("signed-token");
  });

  it("does not mint a session when a concurrent request won the race", async () => {
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      email: "oauth@example.com",
      password: undefined,
      sessionVersion: 0,
    });
    // Another request set the password (and bumped the version) after this
    // request authenticated, so the conditional write matches nothing.
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const response = await POST(
      jsonRequest({ password: "brand-new-password" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(409);
    expect(body.message).toMatch(/changed while your request was in flight/i);
    expect(mocks.signToken).not.toHaveBeenCalled();
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
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
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
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

    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
