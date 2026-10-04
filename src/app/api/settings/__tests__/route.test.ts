// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  exists: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/models/settings", () => ({
  Settings: {
    exists: mocks.exists,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));

import { POST } from "../route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const allowedBody = {
  theme: "dark",
  units: "both",
  base: { pg: 30, vg: 70 },
  strength: 6,
  amount: 30,
  zeroNicotineMode: false,
  nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
  flavor: { percentage: 5, base: { pg: 100, vg: 0 } },
};

describe("POST /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ _id: "user-1" });
    mocks.findOneAndUpdate.mockResolvedValue({ _id: "settings-1" });
  });

  it("requires an authenticated session", async () => {
    const { ApiError } = await import("@/lib/api");
    mocks.requireUser.mockRejectedValue(new ApiError(401, "Not authorized."));

    const response = await POST(jsonRequest(allowedBody), undefined);

    expect(response.status).toBe(401);
    expect(mocks.exists).not.toHaveBeenCalled();
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("upserts with an allowlisted payload, validators, and insert defaults", async () => {
    const response = await POST(
      jsonRequest({
        ...allowedBody,
        _id: "injected-id",
        user: "attacker-id",
        $set: { user: "attacker-id" },
      }),
      undefined,
    );

    expect(response.status).toBe(200);

    const [filter, update, options] = mocks.findOneAndUpdate.mock
      .calls[0] as [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>];
    expect(filter).toEqual({ user: "user-1" });
    expect(update).toEqual({ $set: allowedBody });
    expect(update.$set).not.toHaveProperty("user");
    expect(update.$set).not.toHaveProperty("_id");
    expect(options).toEqual({
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    });
    // Non-empty payloads never need the existence probe.
    expect(mocks.exists).not.toHaveBeenCalled();
  });

  it("creates defaults for an empty first save", async () => {
    mocks.exists.mockResolvedValue(null);

    const response = await POST(jsonRequest({}), undefined);

    expect(response.status).toBe(200);
    expect(mocks.exists).toHaveBeenCalledWith({ user: "user-1" });
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { user: "user-1" },
      { $set: {} },
      expect.objectContaining({ upsert: true, setDefaultsOnInsert: true }),
    );
  });

  it("rejects an empty update when settings already exist", async () => {
    mocks.exists.mockResolvedValue({ _id: "settings-1" });

    const response = await POST(
      jsonRequest({ user: "attacker-id", $set: { user: "attacker-id" } }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("No valid settings fields to update.");
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid enums, types, and ranges before writing", async () => {
    for (const body of [
      { ...allowedBody, theme: "neon" },
      { ...allowedBody, units: "litres" },
      { ...allowedBody, zeroNicotineMode: "yes" },
      { ...allowedBody, amount: -5 },
      { ...allowedBody, nicotine: { strength: 100, base: { pg: 100 } } },
      { ...allowedBody, flavor: { percentage: 101, base: { pg: 100, vg: 0 } } },
      { ...allowedBody, base: { pg: 80, vg: 80 } },
      [],
      "settings",
    ]) {
      const response = await POST(jsonRequest(body), undefined);
      expect(response.status).toBe(400);
    }

    expect(mocks.exists).not.toHaveBeenCalled();
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
