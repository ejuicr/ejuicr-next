// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/models/recipe", () => ({
  Recipe: { findOne: mocks.findOne, create: mocks.create },
}));

import { POST } from "../route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const allowedBody = {
  name: "  New Mix  ",
  strength: 6,
  base: { pg: 30, vg: 70 },
  amount: 30,
  ingredients: {
    nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
    flavors: [{ name: "Mango", percentage: 8, base: { pg: 100, vg: 0 } }],
  },
};

describe("POST /api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ _id: "user-1" });
    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockImplementation(async (doc: unknown) => doc);
  });

  it("creates an allowlisted recipe owned by the session user", async () => {
    const response = await POST(
      jsonRequest({
        ...allowedBody,
        _id: "injected-id",
        author: "attacker-id",
        $set: { author: "attacker-id" },
      }),
      undefined,
    );

    expect(response.status).toBe(201);
    expect(mocks.findOne).toHaveBeenCalledWith({
      author: "user-1",
      name: "New Mix",
    });

    const created = mocks.create.mock.calls[0][0] as Record<string, unknown>;
    expect(created).toEqual({
      name: "New Mix",
      strength: 6,
      base: { pg: 30, vg: 70 },
      amount: 30,
      ingredients: {
        nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
        flavors: [{ name: "Mango", percentage: 8, base: { pg: 100, vg: 0 } }],
      },
      author: "user-1",
    });
    expect(created).not.toHaveProperty("_id");
    expect(created).not.toHaveProperty("$set");
  });

  it("rejects blank titles and invalid shapes before querying", async () => {
    for (const body of [
      { name: "   " },
      { base: { pg: 30 } },
      [],
      42,
    ]) {
      const response = await POST(jsonRequest(body), undefined);
      expect(response.status).toBe(400);
    }

    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses duplicate titles for the same user", async () => {
    mocks.findOne.mockResolvedValue({ _id: "existing" });

    const response = await POST(jsonRequest(allowedBody), undefined);

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
