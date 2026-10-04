import mongoose from "mongoose";
import { NextResponse } from "next/server";

/** An error that maps to a specific HTTP status code. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public headers?: HeadersInit,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Convert any thrown error into a JSON response. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status, headers: error.headers },
    );
  }

  // request.json() throws SyntaxError for malformed bodies.
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // A duplicate-key failure can still happen when two requests race past an
  // application-level uniqueness check.
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  ) {
    return NextResponse.json(
      { message: "That value already exists." },
      { status: 409 },
    );
  }

  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json(
    { message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

type RouteHandler<Context> = (
  request: Request,
  context: Context,
) => Promise<Response>;

/** Wrap a route handler so thrown errors become JSON responses. */
export function apiHandler<Context = unknown>(
  handler: RouteHandler<Context>,
): RouteHandler<Context> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
