// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  findOne: vi.fn(),
  collation: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/models/recipe", () => ({
  Recipe: {
    findOne: mocks.findOne,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));

import { PUT } from "../route";

const routeContext = {
  params: Promise.resolve({ id: "recipe-1" }),
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/recipes/recipe-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const allowedBody = {
  name: "  Updated Mix  ",
  strength: 6,
  base: { pg: 30, vg: 70 },
  amount: 30,
  ingredients: {
    nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
    flavors: [{ name: "Mango", percentage: 8, base: { pg: 100, vg: 0 } }],
  },
};

describe("PUT /api/recipes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ _id: "user-1" });
    mocks.findOne.mockReturnValue({ collation: mocks.collation });
    mocks.collation.mockResolvedValue(null);
  });

  it("requires an authenticated session", async () => {
    const { ApiError } = await import("@/lib/api");
    mocks.requireUser.mockRejectedValue(new ApiError(401, "Not authorized."));

    const response = await PUT(jsonRequest(allowedBody), routeContext);

    expect(response.status).toBe(401);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects payloads without any editable recipe fields", async () => {
    const response = await PUT(
      jsonRequest({
        _id: "other-id",
        author: "attacker-id",
        $set: { author: "attacker-id" },
      }),
      routeContext,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("No valid recipe fields to update.");
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("updates only the owner's recipe with an allowlisted payload", async () => {
    mocks.findOneAndUpdate.mockResolvedValue({ _id: "recipe-1" });

    const response = await PUT(
      jsonRequest({
        ...allowedBody,
        _id: "injected-id",
        author: "attacker-id",
        createdAt: "2020-01-01",
        $set: { author: "attacker-id" },
      }),
      routeContext,
    );

    expect(response.status).toBe(200);

    expect(mocks.findOne).toHaveBeenCalledWith({
      _id: { $ne: "recipe-1" },
      author: "user-1",
      name: "Updated Mix",
    });
    expect(mocks.collation).toHaveBeenCalledWith({
      locale: "en",
      strength: 2,
    });

    const [filter, update, options] = mocks.findOneAndUpdate.mock
      .calls[0] as [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>];
    expect(filter).toEqual({ _id: "recipe-1", author: "user-1" });
    expect(update).toEqual({
      name: "Updated Mix",
      strength: 6,
      base: { pg: 30, vg: 70 },
      amount: 30,
      ingredients: {
        nicotine: { strength: 100, base: { pg: 100, vg: 0 } },
        flavors: [{ name: "Mango", percentage: 8, base: { pg: 100, vg: 0 } }],
      },
    });
    expect(update).not.toHaveProperty("author");
    expect(update).not.toHaveProperty("_id");
    expect(update).not.toHaveProperty("$set");
    expect(options).toEqual({ returnDocument: "after", runValidators: true });
  });

  it("refuses to rename a recipe to an existing title", async () => {
    mocks.collation.mockResolvedValue({ _id: "other-recipe" });

    const response = await PUT(jsonRequest(allowedBody), routeContext);

    expect(response.status).toBe(400);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the owner-scoped query matches nothing", async () => {
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const response = await PUT(jsonRequest(allowedBody), routeContext);

    expect(response.status).toBe(404);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "recipe-1", author: "user-1" },
      expect.anything(),
      expect.anything(),
    );
  });

  it("rejects invalid recipe shapes before touching the database", async () => {
    for (const body of [
      { name: "ok", base: { pg: 30 } },
      { ingredients: { flavors: [] } },
      { name: "ok", amount: "30" },
      [],
      "recipe",
    ]) {
      const response = await PUT(jsonRequest(body), routeContext);
      expect(response.status).toBe(400);
    }

    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects a partial update that would introduce an impossible ratio", async () => {
    const response = await PUT(
      jsonRequest({ base: { pg: 80, vg: 80 } }),
      routeContext,
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/add up to 100/);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
