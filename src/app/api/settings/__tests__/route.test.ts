// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/models/settings", () => ({
  Settings: {
    findOne: mocks.findOne,
    create: mocks.create,
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
  });

  it("requires an authenticated session", async () => {
    const { ApiError } = await import("@/lib/api");
    mocks.requireUser.mockRejectedValue(new ApiError(401, "Not authorized."));

    const response = await POST(jsonRequest(allowedBody), undefined);

    expect(response.status).toBe(401);
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates settings owned by the session user with an allowlisted payload", async () => {
    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockImplementation(async (doc: unknown) => doc);

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

    const created = mocks.create.mock.calls[0][0] as Record<string, unknown>;
    expect(created).toEqual({ ...allowedBody, user: "user-1" });
    expect(created).not.toHaveProperty("_id");
    expect(created).not.toHaveProperty("$set");
  });

  it("updates existing settings with an allowlisted payload and validators", async () => {
    mocks.findOne.mockResolvedValue({ _id: "settings-1", user: "user-1" });
    mocks.findOneAndUpdate.mockResolvedValue({ _id: "settings-1" });

    const response = await POST(
      jsonRequest({
        ...allowedBody,
        theme: "light",
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
    expect(update).toEqual({ ...allowedBody, theme: "light" });
    expect(update).not.toHaveProperty("user");
    expect(update).not.toHaveProperty("_id");
    expect(update).not.toHaveProperty("$set");
    expect(options).toEqual({ returnDocument: "after", runValidators: true });
  });

  it("rejects updates with no editable fields", async () => {
    mocks.findOne.mockResolvedValue({ _id: "settings-1", user: "user-1" });

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
      [],
      "settings",
    ]) {
      const response = await POST(jsonRequest(body), undefined);
      expect(response.status).toBe(400);
    }

    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
