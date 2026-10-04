// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findUserByEmail: vi.fn(),
  setAuthCookie: vi.fn(),
  signToken: vi.fn(() => "signed-token"),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({
  findUserByEmail: mocks.findUserByEmail,
  setAuthCookie: mocks.setAuthCookie,
  signToken: mocks.signToken,
}));

import { POST } from "../route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signToken.mockReturnValue("signed-token");
  });

  it("points provider-only users to their provider and My Account, not signup", async () => {
    mocks.findUserByEmail.mockResolvedValue({
      _id: { toString: () => "oauth-user" },
      email: "oauth@example.com",
      password: undefined,
      authProvider: "google",
    });

    const response = await POST(
      jsonRequest({ email: "oauth@example.com", password: "anything" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/sign in with google instead/i);
    expect(body.message).toMatch(/set a password from my account/i);
    expect(body.message).not.toMatch(/sign up/i);
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("derives the provider from a linked account when authProvider is unset", async () => {
    mocks.findUserByEmail.mockResolvedValue({
      _id: { toString: () => "oauth-user" },
      email: "oauth@example.com",
      password: undefined,
      authProvider: "",
      googleId: "google-123",
    });

    const response = await POST(
      jsonRequest({ email: "oauth@example.com", password: "anything" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/sign in with google instead/i);
  });

  it("logs in an account with a password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    mocks.findUserByEmail.mockResolvedValue({
      _id: { toString: () => "member-1" },
      email: "member@example.com",
      password: passwordHash,
      authProvider: "",
    });

    const response = await POST(
      jsonRequest({ email: "member@example.com", password: "correct-password" }),
      undefined,
    );
    const body = (await response.json()) as { _id: string; email: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ _id: "member-1", email: "member@example.com" });
    expect(mocks.signToken).toHaveBeenCalledWith({
      _id: "member-1",
      sessionVersion: 0,
    });
    expect(mocks.setAuthCookie).toHaveBeenCalledWith("signed-token");
  });

  it("does not start a session for an unknown email", async () => {
    mocks.findUserByEmail.mockResolvedValue(null);

    const response = await POST(
      jsonRequest({ email: "nobody@example.com", password: "whatever" }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("rejects non-string or empty credentials before lookup", async () => {
    for (const body of [
      { email: 123, password: "whatever" },
      { email: "member@example.com", password: 123456 },
      { email: "member@example.com", password: "" },
      { email: "   ", password: "whatever" },
      {},
    ]) {
      const response = await POST(jsonRequest(body), undefined);
      expect(response.status).toBe(400);
    }

    expect(mocks.findUserByEmail).not.toHaveBeenCalled();
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("rejects malformed email addresses before lookup", async () => {
    const response = await POST(
      jsonRequest({ email: "not-an-email", password: "whatever" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("Email is invalid.");
    expect(mocks.findUserByEmail).not.toHaveBeenCalled();
  });
});
