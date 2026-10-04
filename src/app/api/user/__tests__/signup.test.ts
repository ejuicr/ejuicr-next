// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findUserByEmail: vi.fn(),
  create: vi.fn(),
  findByIdAndDelete: vi.fn(),
  requireUser: vi.fn(),
  setAuthCookie: vi.fn(),
  signToken: vi.fn(() => "signed-token"),
  clearAuthCookie: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({
  findUserByEmail: mocks.findUserByEmail,
  requireUser: mocks.requireUser,
  setAuthCookie: mocks.setAuthCookie,
  signToken: mocks.signToken,
  clearAuthCookie: mocks.clearAuthCookie,
}));
vi.mock("@/lib/models/user", () => ({
  User: {
    create: mocks.create,
    findByIdAndDelete: mocks.findByIdAndDelete,
  },
}));

import { POST } from "../route";
import { clearRateLimits } from "@/lib/rate-limit";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user (signup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimits();
    mocks.signToken.mockReturnValue("signed-token");
  });

  it("rejects signup for an existing provider-only account without claiming it", async () => {
    mocks.findUserByEmail.mockResolvedValue({
      _id: { toString: () => "oauth-user" },
      email: "oauth@example.com",
      password: undefined,
    });

    const response = await POST(
      jsonRequest({
        email: "oauth@example.com",
        password: "attacker-password",
      }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("User already exists.");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.signToken).not.toHaveBeenCalled();
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("rejects signup for an existing password account", async () => {
    mocks.findUserByEmail.mockResolvedValue({
      _id: { toString: () => "existing-user" },
      email: "existing@example.com",
      password: "stored-hash",
    });

    const response = await POST(
      jsonRequest({
        email: "existing@example.com",
        password: "attacker-password",
      }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("creates a new account with a normalized email, hashes the password, and starts a session", async () => {
    mocks.findUserByEmail.mockResolvedValue(null);
    mocks.create.mockImplementation(
      async (doc: { email: string; password: string }) => ({
        _id: { toString: () => "new-user" },
        email: doc.email,
        password: doc.password,
      }),
    );

    const response = await POST(
      jsonRequest({
        email: "  New@Example.com ",
        password: "secret-password",
      }),
      undefined,
    );
    const body = (await response.json()) as { _id: string; email: string };

    expect(response.status).toBe(201);
    expect(body).toEqual({ _id: "new-user", email: "new@example.com" });
    expect(mocks.findUserByEmail).toHaveBeenCalledWith("New@Example.com");

    const created = mocks.create.mock.calls[0][0] as {
      email: string;
      password: string;
    };
    expect(created.email).toBe("new@example.com");
    expect(created.password).not.toBe("secret-password");
    expect(await bcrypt.compare("secret-password", created.password)).toBe(
      true,
    );
    expect(mocks.signToken).toHaveBeenCalledWith({
      _id: "new-user",
      sessionVersion: 0,
    });
    expect(mocks.setAuthCookie).toHaveBeenCalledWith("signed-token");
  });

  it("rejects non-string credentials before touching the database", async () => {
    for (const body of [
      { email: 123, password: "long-enough" },
      { email: "user@example.com", password: 123456 },
      { email: null, password: null },
      { email: "", password: "long-enough" },
      { password: "long-enough" },
    ]) {
      const response = await POST(jsonRequest(body), undefined);
      expect(response.status).toBe(400);
    }

    expect(mocks.findUserByEmail).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects malformed emails and out-of-range passwords", async () => {
    for (const body of [
      { email: "not-an-email", password: "long-enough" },
      { email: "user@example.com", password: "short" },
      { email: "user@example.com", password: "a".repeat(251) },
    ]) {
      const response = await POST(jsonRequest(body), undefined);
      expect(response.status).toBe(400);
    }

    expect(mocks.findUserByEmail).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const request = new Request("http://localhost/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });

    const response = await POST(request, undefined);

    expect(response.status).toBe(400);
  });

  it("returns 409 when a concurrent signup hits the unique index", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUserByEmail.mockResolvedValue(null);
    mocks.create.mockRejectedValue(
      Object.assign(new Error("E11000 duplicate key error"), { code: 11000 }),
    );

    const response = await POST(
      jsonRequest({ email: "new@example.com", password: "secret-password" }),
      undefined,
    );

    expect(response.status).toBe(409);
  });

  it("rate limits repeated signup attempts for the same email", async () => {
    mocks.findUserByEmail.mockResolvedValue({
      _id: { toString: () => "existing" },
      email: "oauth@example.com",
      password: undefined,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await POST(
        jsonRequest({
          email: "oauth@example.com",
          password: "secret-password",
        }),
        undefined,
      );
      expect(response.status).toBe(400);
    }

    const limited = await POST(
      jsonRequest({
        email: "oauth@example.com",
        password: "secret-password",
      }),
      undefined,
    );

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});
