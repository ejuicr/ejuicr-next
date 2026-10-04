// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  create: vi.fn(),
  setAuthCookie: vi.fn(),
  signToken: vi.fn(() => "signed-token"),
  fetchTwitterProfile: vi.fn(),
  getTwitterCredentials: vi.fn(),
  tokenCookie: "token-1" as string | undefined,
  secretCookie: "secret-1" as string | undefined,
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({
  setAuthCookie: mocks.setAuthCookie,
  signToken: mocks.signToken,
}));
vi.mock("@/lib/models/user", () => ({
  User: {
    findOne: mocks.findOne,
    findOneAndUpdate: mocks.findOneAndUpdate,
    create: mocks.create,
  },
}));
vi.mock("@/lib/oauth/twitter", () => ({
  fetchTwitterProfile: mocks.fetchTwitterProfile,
  getTwitterCredentials: mocks.getTwitterCredentials,
}));
vi.mock("@/lib/url", () => ({ getAppUrl: () => "http://localhost" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "ejuicr_twitter_token" && mocks.tokenCookie) {
        return { name, value: mocks.tokenCookie };
      }
      if (name === "ejuicr_twitter_secret" && mocks.secretCookie) {
        return { name, value: mocks.secretCookie };
      }
      return undefined;
    },
    delete: vi.fn(),
  }),
}));

import { GET } from "../route";

function callbackRequest(): Request {
  return new Request(
    "http://localhost/api/auth/twitter/callback?oauth_token=token-1&oauth_verifier=verifier-1",
  );
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: "twitter-1",
    email: "member@example.com",
    displayName: "Member",
    handle: "member",
    picture: "https://example.com/pic.png",
    ...overrides,
  };
}

function account(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => "user-1" },
    twitterId: "twitter-1",
    sessionVersion: 0,
    set: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("Twitter OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signToken.mockReturnValue("signed-token");
    mocks.tokenCookie = "token-1";
    mocks.secretCookie = "secret-1";
    mocks.getTwitterCredentials.mockReturnValue({
      consumerKey: "key",
      consumerSecret: "secret",
    });
    mocks.fetchTwitterProfile.mockResolvedValue(profile());
  });

  it("resolves an established link by provider ID even when the email belongs to another account", async () => {
    const linked = account();
    mocks.findOne.mockResolvedValue(linked);

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe("http://localhost/");
    // Only the immutable-ID lookup ran; the email was never consulted.
    expect(mocks.findOne).toHaveBeenCalledTimes(1);
    expect(mocks.findOne).toHaveBeenCalledWith({ twitterId: "twitter-1" });
    expect(linked.set).toHaveBeenCalledWith(
      expect.objectContaining({
        twitterId: "twitter-1",
        authProvider: "twitter",
      }),
    );
    expect(linked.save).toHaveBeenCalled();
    expect(mocks.signToken).toHaveBeenCalledWith({
      _id: "user-1",
      sessionVersion: 0,
    });
    expect(mocks.setAuthCookie).toHaveBeenCalledWith("signed-token");
  });

  it("links an unlinked email account with a conditional update", async () => {
    const existing = account({ twitterId: "" });
    mocks.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    mocks.findOneAndUpdate.mockResolvedValue(account());

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(mocks.findOne).toHaveBeenNthCalledWith(2, {
      email: "member@example.com",
    });

    const [filter, update] = mocks.findOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(filter).toEqual({
      _id: existing._id,
      $or: [
        { twitterId: { $exists: false } },
        { twitterId: null },
        { twitterId: "" },
        { twitterId: "twitter-1" },
      ],
    });
    expect(update).toEqual({
      $set: expect.objectContaining({ twitterId: "twitter-1" }),
    });
  });

  it("refuses to move an identity already linked to another account", async () => {
    const existing = account({ twitterId: "twitter-other" });
    mocks.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe(
      "http://localhost/?authError=twitter-conflict",
    );
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("reports a conflict when a concurrent claim wins the email link", async () => {
    const existing = account({ twitterId: "" });
    mocks.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe(
      "http://localhost/?authError=twitter-conflict",
    );
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("creates an account when neither the provider ID nor the email matches", async () => {
    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockResolvedValue(
      account({ _id: { toString: () => "new-user" } }),
    );

    const response = await GET(callbackRequest(), undefined);

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "member@example.com",
        twitterId: "twitter-1",
      }),
    );
    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(mocks.setAuthCookie).toHaveBeenCalled();
  });

  it("rejects a mismatched request token", async () => {
    mocks.tokenCookie = "other-token";

    const response = await GET(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe(
      "http://localhost/?authError=twitter",
    );
    expect(mocks.fetchTwitterProfile).not.toHaveBeenCalled();
  });
});
