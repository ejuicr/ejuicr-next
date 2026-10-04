// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import {
  clearRateLimits,
  enforceRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

function captureError(fn: () => void): ApiError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("Expected an ApiError to be thrown.");
}

describe("enforceRateLimit", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const rule = { limit: 3, windowMs: 60_000 };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      enforceRateLimit("key", rule);
    }
  });

  it("throws 429 with Retry-After once the window is full", () => {
    const rule = { limit: 2, windowMs: 60_000 };
    enforceRateLimit("key", rule);
    enforceRateLimit("key", rule);

    const error = captureError(() => enforceRateLimit("key", rule));

    expect(error.status).toBe(429);
    expect(error.headers).toEqual({ "Retry-After": "60" });
  });

  it("starts a fresh window after expiry", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    enforceRateLimit("key", rule);
    expect(() => enforceRateLimit("key", rule)).toThrow(ApiError);

    vi.advanceTimersByTime(60_001);
    enforceRateLimit("key", rule);
  });

  it("keeps keys independent", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    enforceRateLimit("a", rule);
    enforceRateLimit("b", rule);

    expect(() => enforceRateLimit("a", rule)).toThrow(ApiError);
    expect(() => enforceRateLimit("b", rule)).toThrow(ApiError);
  });
});

describe("getClientIp", () => {
  it("uses the first forwarded address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });

    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });

    expect(getClientIp(request)).toBe("9.9.9.9");
  });

  it("uses a placeholder when no address is present", () => {
    expect(getClientIp(new Request("http://localhost"))).toBe("unknown");
  });
});
