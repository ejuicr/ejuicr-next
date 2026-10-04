// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  setAuthCookie: vi.fn(),
  signToken: vi.fn(() => "signed-token"),
  exchangeGoogleCode: vi.fn(),
  fetchGoogleProfile: vi.fn(),
  getGoogleCredentials: vi.fn(),
  stateCookie: "state-123" as string | undefined,
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({
  setAuthCookie: mocks.setAuthCookie,
  signToken: mocks.signToken,
}));
vi.mock("@/lib/models/user", () => ({
  User: { findOne: mocks.findOne, create: mocks.create },
}));
vi.mock("@/lib/oauth/google", () => ({
  exchangeGoogleCode: mocks.exchangeGoogleCode,
  fetchGoogleProfile: mocks.fetchGoogleProfile,
  getGoogleCredentials: mocks.getGoogleCredentials,
}));
vi.mock("@/lib/url", () => ({ getAppUrl: () => "http://localhost" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "ejuicr_oauth_state" && mocks.stateCookie
        ? { name, value: mocks.stateCookie }
        : undefined,
    delete: vi.fn(),
  }),
}));

import { GET } from "../callback/route";

function callbackRequest(): Request {
  return new Request(
    "http://localhost/api/auth/google/callback?code=code-1&state=state-123",
  );
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    sub: "google-sub",
    email: "member@example.com",
    emailVerified: true,
    name: "Member",
    picture: "https://example.com/pic.png",
    ...overrides,
  };
}

describe("Google OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stateCookie = "state-123";
    mocks.getGoogleCredentials.mockReturnValue({
      clientId: "id",
      clientSecret: "secret",
    });
    mocks.exchangeGoogleCode.mockResolvedValue("access-token");
  });

  it("signs in an established link even when the provider email is unverified", async () => {
    mocks.fetchGoogleProfile.mockResolvedValue(
      profile({ emailVerified: false }),
    );
    const linkedUser = {
      _id: { toString: () => "user-1" },
      sessionVersion: 2,
      save: vi.fn().mockResolvedValue(undefined),
    };
    mocks.findOne.mockResolvedValue(linkedUser);

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(mocks.findOne).toHaveBeenCalledTimes(1);
    expect(mocks.findOne).toHaveBeenCalledWith({ googleId: "google-sub" });
    expect(linkedUser.save).toHaveBeenCalled();
    expect(mocks.signToken).toHaveBeenCalledWith({
      _id: "user-1",
      sessionVersion: 2,
    });
    expect(mocks.setAuthCookie).toHaveBeenCalledWith("signed-token");
  });

  it("attaches Google to an existing account only with a verified email", async () => {
    mocks.fetchGoogleProfile.mockResolvedValue(profile());
    const existing = {
      _id: { toString: () => "user-2" },
      sessionVersion: 0,
      save: vi.fn().mockResolvedValue(undefined),
    };
    mocks.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(mocks.findOne).toHaveBeenNthCalledWith(2, {
      email: "member@example.com",
    });
    expect(existing).toMatchObject({
      googleId: "google-sub",
      googleDisplayName: "Member",
    });
    expect(existing.save).toHaveBeenCalled();
  });

  it("refuses to use an unverified provider email", async () => {
    mocks.fetchGoogleProfile.mockResolvedValue(
      profile({ emailVerified: false }),
    );
    mocks.findOne.mockResolvedValue(null);

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe(
      "http://localhost/?authError=google-email-unverified",
    );
    // Only the provider-ID lookup happened; no email lookup or creation.
    expect(mocks.findOne).toHaveBeenCalledTimes(1);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("creates an account for a new verified Google identity", async () => {
    mocks.fetchGoogleProfile.mockResolvedValue(profile());
    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      _id: { toString: () => "new-user" },
      sessionVersion: 0,
    });

    const response = await GET(callbackRequest(), undefined);

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "member@example.com",
        googleId: "google-sub",
      }),
    );
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("rejects a mismatched OAuth state", async () => {
    mocks.stateCookie = "other-state";

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe(
      "http://localhost/?authError=google",
    );
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
  });
});
