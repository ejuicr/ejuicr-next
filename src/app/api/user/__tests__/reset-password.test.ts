// @vitest-environment node
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findOne: vi.fn(),
  sendMail: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/mailer", () => ({
  getMailer: () => ({ sendMail: mocks.sendMail }),
}));
vi.mock("@/lib/models/user", () => ({
  User: { findOne: mocks.findOne, updateOne: mocks.updateOne },
}));
vi.mock("@/lib/url", () => ({ getAppUrl: () => "http://localhost" }));

import { POST } from "../reset-password/route";
import { clearRateLimits } from "@/lib/rate-limit";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/user/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimits();
    process.env.JWT_SECRET = "test-secret";
  });

  it("rejects missing or non-string emails before lookup", async () => {
    for (const body of [{}, { email: null }, { email: 42 }, { email: "   " }]) {
      const response = await POST(jsonRequest(body), undefined);
      expect(response.status).toBe(400);
    }

    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("rejects malformed emails before lookup", async () => {
    const response = await POST(
      jsonRequest({ email: "not-an-email" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("Email is invalid.");
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("returns a generic response for an unknown account without sending mail", async () => {
    mocks.findOne.mockResolvedValue(null);

    const response = await POST(
      jsonRequest({ email: "nobody@example.com" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe(
      "If an account exists for that email, a reset link has been sent.",
    );
    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("stores a single-use nonce and sends a purpose-bound reset link", async () => {
    mocks.findOne.mockResolvedValue({
      _id: "user-1",
      email: "member@example.com",
    });
    mocks.sendMail.mockResolvedValue(undefined);

    const response = await POST(
      jsonRequest({ email: "member@example.com" }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe(
      "If an account exists for that email, a reset link has been sent.",
    );
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);

    const mail = mocks.sendMail.mock.calls[0][0] as {
      to: string;
      text: string;
    };
    expect(mail.to).toBe("member@example.com");

    const match = /update-password\/([A-Za-z0-9_-]+)/.exec(mail.text);
    expect(match).not.toBeNull();
    const decoded = jwt.verify(
      Buffer.from(match![1], "base64url").toString(),
      "test-secret",
    ) as { id: string; purpose: string; nonce: string };

    expect(decoded.id).toBe("user-1");
    expect(decoded.purpose).toBe("password-reset");
    expect(decoded.nonce).toEqual(expect.any(String));

    // The stored nonce must be the one embedded in the token.
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: "user-1" },
      { passwordResetNonce: decoded.nonce },
    );
  });

  it("rate limits repeated reset requests for the same email", async () => {
    mocks.findOne.mockResolvedValue(null);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await POST(
        jsonRequest({ email: "nobody@example.com" }),
        undefined,
      );
      expect(response.status).toBe(200);
    }

    const limited = await POST(
      jsonRequest({ email: "nobody@example.com" }),
      undefined,
    );

    expect(limited.status).toBe(429);
  });
});
