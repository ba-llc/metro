import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

const statusByCode: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function err(code: ApiErrorCode, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status: statusByCode[code] },
  );
}

/**
 * Wraps a route handler body: converts ApiError / ZodError into the standard
 * error envelope and logs unexpected failures.
 */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message);
    if (e instanceof ZodError) {
      const first = e.errors[0];
      const path = first?.path.join(".");
      return err(
        "VALIDATION",
        first ? `${path ? `${path}: ` : ""}${first.message}` : "Invalid input",
      );
    }
    console.error("[api] unhandled error", e);
    return err("INTERNAL", "Something went wrong");
  }
}
