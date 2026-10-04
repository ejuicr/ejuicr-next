// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireUser: vi.fn(),
  recipeDeleteMany: vi.fn(),
  settingsDeleteMany: vi.fn(),
  updateOne: vi.fn(),
  findByIdAndDelete: vi.fn(),
  clearAuthCookie: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
  clearAuthCookie: mocks.clearAuthCookie,
}));
vi.mock("@/lib/models/recipe", () => ({
  Recipe: { deleteMany: mocks.recipeDeleteMany },
}));
vi.mock("@/lib/models/settings", () => ({
  Settings: { deleteMany: mocks.settingsDeleteMany },
}));
vi.mock("@/lib/models/user", () => ({
  User: {
    updateOne: mocks.updateOne,
    findByIdAndDelete: mocks.findByIdAndDelete,
  },
}));

import { ApiError } from "@/lib/api";
import { DELETE } from "../route";

function deleteRequest(): Request {
  return new Request("http://localhost/api/user", { method: "DELETE" });
}

describe("DELETE /api/user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ _id: "user-1" });
    mocks.recipeDeleteMany.mockResolvedValue({});
    mocks.settingsDeleteMany.mockResolvedValue({});
    mocks.findByIdAndDelete.mockResolvedValue({ _id: "user-1" });
  });

  it("requires an authenticated session", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, "Not authorized."));

    const response = await DELETE(deleteRequest(), undefined);

    expect(response.status).toBe(401);
    expect(mocks.recipeDeleteMany).not.toHaveBeenCalled();
    expect(mocks.settingsDeleteMany).not.toHaveBeenCalled();
    expect(mocks.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("deletes recipes, settings, the account, and the session cookie", async () => {
    const response = await DELETE(deleteRequest(), undefined);

    expect(response.status).toBe(200);
    // The deletion mark is written before dependent cleanup so concurrent
    // writes can detect it.
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: "user-1" },
      { $set: { deleting: true } },
    );
    expect(mocks.updateOne.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.recipeDeleteMany.mock.invocationCallOrder[0],
    );
    expect(mocks.recipeDeleteMany).toHaveBeenCalledWith({ author: "user-1" });
    expect(mocks.settingsDeleteMany).toHaveBeenCalledWith({ user: "user-1" });
    expect(mocks.findByIdAndDelete).toHaveBeenCalledWith("user-1");
    expect(mocks.clearAuthCookie).toHaveBeenCalled();
  });

  it("keeps the account when dependent-data cleanup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.settingsDeleteMany.mockRejectedValue(new Error("database down"));

    const response = await DELETE(deleteRequest(), undefined);

    expect(response.status).toBe(500);
    expect(mocks.updateOne).toHaveBeenCalled();
    expect(mocks.findByIdAndDelete).not.toHaveBeenCalled();
    expect(mocks.clearAuthCookie).not.toHaveBeenCalled();
  });
});
