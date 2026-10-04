// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/models/user", () => ({
  User: { findOneAndUpdate: mocks.findOneAndUpdate },
}));

import { ApiError } from "@/lib/api";
import { DELETE as unlinkGoogle } from "../google/route";
import { DELETE as unlinkTwitter } from "../twitter/route";

function deleteRequest(provider: "google" | "twitter"): Request {
  return new Request(`http://localhost/api/user/${provider}`, {
    method: "DELETE",
  });
}

describe("account unlinking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      _id: "user-1",
      authProvider: "google",
    });
    mocks.findOneAndUpdate.mockResolvedValue({ _id: "user-1" });
  });

  it("requires an authenticated session", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, "Not authorized."));

    const response = await unlinkGoogle(deleteRequest("google"), undefined);

    expect(response.status).toBe(401);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("unlinks Google only while a password or Twitter link remains", async () => {
    const response = await unlinkGoogle(deleteRequest("google"), undefined);

    expect(response.status).toBe(200);

    const [filter, update] = mocks.findOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(filter).toEqual({
      _id: "user-1",
      $or: [
        { password: { $type: "string", $ne: "" } },
        { twitterId: { $type: "string", $ne: "" } },
      ],
    });
    expect(update).toEqual({
      googleId: "",
      googlePicture: "",
      googleDisplayName: "",
      authProvider: "",
    });
  });

  it("unlinks Twitter only while a password or Google link remains", async () => {
    await unlinkTwitter(deleteRequest("twitter"), undefined);

    const [filter, update] = mocks.findOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(filter).toEqual({
      _id: "user-1",
      $or: [
        { password: { $type: "string", $ne: "" } },
        { googleId: { $type: "string", $ne: "" } },
      ],
    });
    expect(update).toMatchObject({
      twitterId: "",
      twitterHandle: "",
      twitterPicture: "",
      twitterDisplayName: "",
    });
  });

  it("refuses to remove the last sign-in method", async () => {
    mocks.findOneAndUpdate.mockResolvedValue(null);

    for (const [provider, handler] of [
      ["google", unlinkGoogle],
      ["twitter", unlinkTwitter],
    ] as const) {
      const response = await handler(deleteRequest(provider), undefined);
      const body = (await response.json()) as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toMatch(/keep at least one way to sign in/i);
    }
  });
});
