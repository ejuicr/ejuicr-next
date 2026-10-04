// @vitest-environment node
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/models/user", () => ({
  User: { findOneAndUpdate: mocks.findOneAndUpdate },
}));

import { POST } from "../reset-password/[token]/route";

function encodeToken(payload: Record<string, unknown>): string {
  return Buffer.from(
    jwt.sign(payload, "test-secret", { expiresIn: "1h" }),
  ).toString("base64url");
}

function resetToken(nonce = "nonce-1"): string {
  return encodeToken({ id: "user-1", purpose: "password-reset", nonce });
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/user/reset-password/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext(token: string) {
  return { params: Promise.resolve({ token }) };
}

describe("POST /api/user/reset-password/:token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("rejects invalid or expired tokens", async () => {
    const response = await POST(
      jsonRequest({ password: "new-password" }),
      routeContext("not-a-token"),
    );

    expect(response.status).toBe(400);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects tokens minted for another purpose", async () => {
    for (const token of [
      encodeToken({ id: "user-1", nonce: "nonce-1" }),
      encodeToken({ id: "user-1", nonce: "nonce-1", purpose: "session" }),
    ]) {
      const response = await POST(
        jsonRequest({ password: "new-password" }),
        routeContext(token),
      );
      expect(response.status).toBe(400);
    }

    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid passwords before consuming the token", async () => {
    const token = resetToken();

    for (const password of [undefined, null, 123456, "short", "a".repeat(251)]) {
      const response = await POST(
        jsonRequest({ password }),
        routeContext(token),
      );
      expect(response.status).toBe(400);
    }

    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("atomically consumes the nonce, stores a hash, and revokes sessions", async () => {
    mocks.findOneAndUpdate.mockResolvedValue({ _id: "user-1" });

    const response = await POST(
      jsonRequest({ password: "new-password" }),
      routeContext(resetToken()),
    );

    expect(response.status).toBe(200);

    const [filter, update, options] = mocks.findOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      {
        $set: { password: string; passwordResetNonce: null };
        $inc: { sessionVersion: number };
      },
      Record<string, unknown>,
    ];
    expect(filter).toEqual({ _id: "user-1", passwordResetNonce: "nonce-1" });
    expect(update.$set.password).not.toBe("new-password");
    expect(await bcrypt.compare("new-password", update.$set.password)).toBe(
      true,
    );
    expect(update.$set.passwordResetNonce).toBeNull();
    expect(update.$inc).toEqual({ sessionVersion: 1 });
    expect(options).toEqual({ returnDocument: "after" });
  });

  it("rejects a link that was already used or superseded", async () => {
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const response = await POST(
      jsonRequest({ password: "new-password" }),
      routeContext(resetToken()),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/already been used/i);
  });
});
