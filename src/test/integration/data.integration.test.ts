// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  signToken: vi.fn(() => "signed-token"),
  fetchTwitterProfile: vi.fn(),
  getTwitterCredentials: vi.fn(),
  tokenCookie: "token-1" as string | undefined,
  secretCookie: "secret-1" as string | undefined,
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

import { GET as twitterCallback } from "@/app/api/auth/twitter/callback/route";
import { POST as createRecipe } from "@/app/api/recipes/route";
import { POST as saveSettings } from "@/app/api/settings/route";
import { DELETE as deleteAccount } from "@/app/api/user/route";
import { Recipe } from "@/lib/models/recipe";
import { Settings } from "@/lib/models/settings";
import { User } from "@/lib/models/user";

function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const recipeBody = {
  name: "Race Mix",
  strength: 6,
  base: { pg: 30, vg: 70 },
  amount: 30,
  ingredients: {
    nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
    flavors: [{ name: "Mango", percentage: 8, base: { pg: 100, vg: 0 } }],
  },
};

const settingsBody = {
  theme: "dark",
  units: "both",
  base: { pg: 30, vg: 70 },
  strength: 6,
  amount: 30,
  zeroNicotineMode: false,
  nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
  flavor: { percentage: 5, base: { pg: 100, vg: 0 } },
};

describe("dependent writes and account deletion (database-backed)", () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Recipe.deleteMany({}),
      Settings.deleteMany({}),
    ]);
    vi.clearAllMocks();
    mocks.signToken.mockReturnValue("signed-token");
    mocks.getTwitterCredentials.mockReturnValue({
      consumerKey: "key",
      consumerSecret: "secret",
    });
    mocks.tokenCookie = "token-1";
    mocks.secretCookie = "secret-1";
  });

  it("keeps one recipe when two identical creates race", async () => {
    const user = await User.create({ email: "recipes@example.com" });
    mocks.requireUser.mockResolvedValue(user);

    const [first, second] = await Promise.all([
      createRecipe(jsonRequest("/api/recipes", recipeBody), undefined),
      createRecipe(
        jsonRequest("/api/recipes", { ...recipeBody, name: "race mix" }),
        undefined,
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await Recipe.countDocuments({ author: user._id })).toBe(1);
  });

  it("keeps a single settings document when two first saves race", async () => {
    const user = await User.create({ email: "settings@example.com" });
    mocks.requireUser.mockResolvedValue(user);

    const [first, second] = await Promise.all([
      saveSettings(jsonRequest("/api/settings", settingsBody), undefined),
      saveSettings(jsonRequest("/api/settings", settingsBody), undefined),
    ]);

    for (const response of [first, second]) {
      expect([200, 409]).toContain(response.status);
    }
    expect(await Settings.countDocuments({ user: user._id })).toBe(1);
  });

  it("leaves no orphan when a recipe create overlaps account deletion", async () => {
    const user = await User.create({ email: "delete-race@example.com" });
    mocks.requireUser.mockResolvedValue(user);

    const [deletion, creation] = await Promise.all([
      deleteAccount(
        jsonRequest("/api/user", {}, "DELETE"),
        undefined,
      ),
      createRecipe(jsonRequest("/api/recipes", recipeBody), undefined),
    ]);

    expect(deletion.status).toBe(200);
    expect([201, 409]).toContain(creation.status);
    expect(await User.findById(user._id)).toBeNull();
    expect(await Recipe.countDocuments({ author: user._id })).toBe(0);
    expect(await Settings.countDocuments({ user: user._id })).toBe(0);
  });

  it("compensates a recipe write authenticated before deletion finished", async () => {
    const user = await User.create({ email: "stale-write@example.com" });
    mocks.requireUser.mockResolvedValue(user);

    const deletion = await deleteAccount(
      jsonRequest("/api/user", {}, "DELETE"),
      undefined,
    );
    expect(deletion.status).toBe(200);

    const creation = await createRecipe(
      jsonRequest("/api/recipes", recipeBody),
      undefined,
    );
    expect(creation.status).toBe(409);
    expect(await Recipe.countDocuments({ author: user._id })).toBe(0);
  });

  it("compensates a settings write authenticated before deletion finished", async () => {
    const user = await User.create({ email: "stale-settings@example.com" });
    mocks.requireUser.mockResolvedValue(user);

    const deletion = await deleteAccount(
      jsonRequest("/api/user", {}, "DELETE"),
      undefined,
    );
    expect(deletion.status).toBe(200);

    const save = await saveSettings(
      jsonRequest("/api/settings", settingsBody),
      undefined,
    );
    expect(save.status).toBe(409);
    expect(await Settings.countDocuments({ user: user._id })).toBe(0);
  });
});

describe("Twitter identity resolution (database-backed)", () => {
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

  function callbackRequest(): Request {
    return new Request(
      "http://localhost/api/auth/twitter/callback?oauth_token=token-1&oauth_verifier=verifier-1",
    );
  }

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Recipe.deleteMany({}),
      Settings.deleteMany({}),
    ]);
    vi.clearAllMocks();
    mocks.signToken.mockReturnValue("signed-token");
    mocks.getTwitterCredentials.mockReturnValue({
      consumerKey: "key",
      consumerSecret: "secret",
    });
    mocks.tokenCookie = "token-1";
    mocks.secretCookie = "secret-1";
  });

  it("resolves an established link by provider ID even when the email matches another account", async () => {
    const linked = await User.create({
      email: "linked@example.com",
      twitterId: "twitter-1",
    });
    const emailMatch = await User.create({ email: "member@example.com" });
    mocks.fetchTwitterProfile.mockResolvedValue(profile());

    const response = await twitterCallback(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(mocks.signToken).toHaveBeenCalledWith({
      _id: linked._id.toString(),
      sessionVersion: 0,
    });
    // The email-matched account was not touched or reused.
    const untouched = await User.findById(emailMatch._id);
    expect(untouched?.twitterId ?? "").toBe("");
  });

  it("records an identity conflict instead of moving an existing link", async () => {
    const owner = await User.create({
      email: "member@example.com",
      twitterId: "twitter-other",
    });
    mocks.fetchTwitterProfile.mockResolvedValue(profile({ id: "twitter-new" }));

    const response = await twitterCallback(callbackRequest(), undefined);

    expect(response.headers.get("location")).toBe(
      "http://localhost/?authError=twitter-conflict",
    );
    const stored = await User.findById(owner._id);
    expect(stored?.twitterId).toBe("twitter-other");
    expect(await User.countDocuments({})).toBe(1);
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
  });

  it("lets only one of two concurrent identities claim the same email", async () => {
    const account = await User.create({ email: "member@example.com" });
    mocks.fetchTwitterProfile
      .mockResolvedValueOnce(profile({ id: "twitter-a" }))
      .mockResolvedValueOnce(profile({ id: "twitter-b" }));

    const [first, second] = await Promise.all([
      twitterCallback(callbackRequest(), undefined),
      twitterCallback(callbackRequest(), undefined),
    ]);

    const locations = [
      first.headers.get("location"),
      second.headers.get("location"),
    ].sort();
    expect(locations).toEqual([
      "http://localhost/",
      "http://localhost/?authError=twitter-conflict",
    ]);

    const stored = await User.findById(account._id);
    expect(["twitter-a", "twitter-b"]).toContain(stored?.twitterId);
    expect(await User.countDocuments({})).toBe(1);
    expect(mocks.setAuthCookie).toHaveBeenCalledTimes(1);
  });
});
