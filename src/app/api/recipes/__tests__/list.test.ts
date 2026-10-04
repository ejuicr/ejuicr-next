// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  find: vi.fn(),
  select: vi.fn(),
  lean: vi.fn(),
  countDocuments: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/models/recipe", () => ({
  Recipe: { find: mocks.find, countDocuments: mocks.countDocuments },
}));

import { ApiError } from "@/lib/api";
import { GET } from "../route";

function listRequest(query = ""): Request {
  return new Request(`http://localhost/api/recipes${query}`);
}

describe("GET /api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ _id: "user-1" });
    mocks.find.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ lean: mocks.lean });
    mocks.lean.mockResolvedValue([
      { _id: "r1", name: "Mango Mix", updatedAt: "2026-01-01" },
    ]);
  });

  it("requires an authenticated session", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, "Not authorized."));

    const response = await GET(listRequest(), undefined);

    expect(response.status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("returns a summary projection instead of full recipes", async () => {
    const response = await GET(listRequest(), undefined);
    const body = (await response.json()) as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(body).toEqual([
      { _id: "r1", name: "Mango Mix", updatedAt: "2026-01-01" },
    ]);
    expect(mocks.find).toHaveBeenCalledWith({ author: "user-1" });
    expect(mocks.select).toHaveBeenCalledWith("name updatedAt");
  });

  it("returns only a count when asked", async () => {
    mocks.countDocuments.mockResolvedValue(3);

    const response = await GET(listRequest("?count=1"), undefined);
    const body = (await response.json()) as { count: number };

    expect(response.status).toBe(200);
    expect(body).toEqual({ count: 3 });
    expect(mocks.countDocuments).toHaveBeenCalledWith({ author: "user-1" });
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
