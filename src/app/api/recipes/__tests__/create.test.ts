// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  accountAcceptingWrites: vi.fn(),
  findOne: vi.fn(),
  collation: vi.fn(),
  create: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/account", () => ({
  accountAcceptingWrites: mocks.accountAcceptingWrites,
}));
vi.mock("@/lib/models/recipe", () => ({
  Recipe: {
    findOne: mocks.findOne,
    create: mocks.create,
    deleteOne: mocks.deleteOne,
  },
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
    mocks.accountAcceptingWrites.mockResolvedValue(true);
    mocks.findOne.mockReturnValue({ collation: mocks.collation });
    mocks.collation.mockResolvedValue(null);
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
    expect(mocks.collation).toHaveBeenCalledWith({
      locale: "en",
      strength: 2,
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

  it("refuses duplicate titles for the same user, ignoring case", async () => {
    mocks.collation.mockResolvedValue({ _id: "existing" });

    const response = await POST(jsonRequest(allowedBody), undefined);

    expect(response.status).toBe(400);
    expect(mocks.collation).toHaveBeenCalledWith({
      locale: "en",
      strength: 2,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a recipe whose carrier ratio does not add up to 100", async () => {
    const response = await POST(
      jsonRequest({ ...allowedBody, base: { pg: 80, vg: 80 } }),
      undefined,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/add up to 100/);
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("removes its recipe when deletion started while the write was in flight", async () => {
    mocks.create.mockResolvedValue({ _id: "recipe-1", name: "New Mix" });
    mocks.accountAcceptingWrites.mockResolvedValue(false);

    const response = await POST(jsonRequest(allowedBody), undefined);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(409);
    expect(body.message).toMatch(/being deleted/i);
    expect(mocks.accountAcceptingWrites).toHaveBeenCalledWith("user-1");
    expect(mocks.deleteOne).toHaveBeenCalledWith({ _id: "recipe-1" });
  });
});
