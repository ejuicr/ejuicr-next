// @vitest-environment node
import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, handleApiError } from "@/lib/api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleApiError", () => {
  it("maps ApiError to its status and message", async () => {
    const response = handleApiError(new ApiError(401, "Not authorized."));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Not authorized.",
    });
  });

  it("maps malformed JSON to a 400 client error", async () => {
    const response = handleApiError(new SyntaxError("Unexpected token"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid JSON body.",
    });
  });

  it("maps duplicate-key failures to 409", async () => {
    const error = Object.assign(new Error("E11000 duplicate key error"), {
      code: 11000,
    });

    const response = handleApiError(error);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "That value already exists.",
    });
  });

  it("maps Mongoose validation errors to 400", async () => {
    const response = handleApiError(new mongoose.Error.ValidationError());

    expect(response.status).toBe(400);
  });

  it("keeps unexpected errors as 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = handleApiError(new Error("boom"));

    expect(response.status).toBe(500);
  });
});
