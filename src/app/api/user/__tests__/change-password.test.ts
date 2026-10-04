// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  setAuthCookie: vi.fn(),
  signToken: vi.fn(() => "signed-token"),
  findOneAndUpdate: vi.fn(),
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
import { POST } from "../change-password/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/user/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signToken.mockReturnValue("signed-token");
  });

  it("requires an authenticated session", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, "Not authorized."));

    const response = await POST(
      jsonRequest({ password: "current-password", newPassword: "new-password" }),
      undefined,
    );

    expect(response.status).toBe(401);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid new passwords before comparing", async () => {
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      password: "stored-hash",
    });

    for (const newPassword of [undefined, null, 123456, "short", "a".repeat(251)]) {
      const response = await POST(
        jsonRequest({ password: "current-password", newPassword }),
        undefined,
      );
      expect(response.status).toBe(400);
    }

    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects non-string current passwords", async () => {
    const passwordHash = await bcrypt.hash("current-password", 10);
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      password: passwordHash,
    });

    const response = await POST(
      jsonRequest({ password: 123456, newPassword: "new-password" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("Incorrect password.");
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects an incorrect current password", async () => {
    const passwordHash = await bcrypt.hash("current-password", 10);
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      password: passwordHash,
    });

    const response = await POST(
      jsonRequest({ password: "wrong-password", newPassword: "new-password" }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("stores a hashed password, revokes other sessions, and refreshes this cookie", async () => {
    const passwordHash = await bcrypt.hash("current-password", 10);
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      password: passwordHash,
      sessionVersion: 2,
    });
    mocks.findOneAndUpdate.mockResolvedValue({
      _id: "user-1",
      sessionVersion: 3,
    });

    const response = await POST(
      jsonRequest({ password: "current-password", newPassword: "new-password" }),
      undefined,
    );

    expect(response.status).toBe(200);

    const [filter, update, options] = mocks.findOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      { $set: { password: string }; $inc: { sessionVersion: number } },
      Record<string, unknown>,
    ];
    // The credential state that authorized the change is part of the write
    // filter, so a concurrent reset/change cannot be overwritten.
    expect(filter).toEqual({
      _id: "user-1",
      sessionVersion: 2,
      password: passwordHash,
    });
    expect(update.$set.password).not.toBe("new-password");
    expect(await bcrypt.compare("new-password", update.$set.password)).toBe(
      true,
    );
    expect(update.$inc).toEqual({ sessionVersion: 1 });
    expect(options).toEqual({ returnDocument: "after" });

    expect(mocks.signToken).toHaveBeenCalledWith({
      _id: "user-1",
      sessionVersion: 3,
    });
    expect(mocks.setAuthCookie).toHaveBeenCalledWith("signed-token");
  });

  it("does not mint a session when the credentials changed mid-request", async () => {
    const passwordHash = await bcrypt.hash("current-password", 10);
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      password: passwordHash,
      sessionVersion: 2,
    });
    // A password reset completed after this request compared the old
    // password, so the conditional write matches nothing.
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const response = await POST(
      jsonRequest({ password: "current-password", newPassword: "new-password" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(409);
    expect(body.message).toMatch(/changed while your request was in flight/i);
    expect(mocks.signToken).not.toHaveBeenCalled();
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });
});
