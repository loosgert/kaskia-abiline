import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isDbUnavailable } from "@/lib/db";
import { adminTexts, errorTexts } from "@/lib/texts";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Wraps a route handler: maps database outages and unexpected errors to friendly JSON errors.
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isDbUnavailable(error)) return jsonError(errorTexts.dbDown, 503);
      console.error(error);
      return jsonError(adminTexts.error, 500);
    }
  };
}

// Same as handle, but answers 401 unless the request carries a valid owner cookie.
export function handleAdmin<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return handle(async (...args: A) => {
    if (!(await isAdmin())) return jsonError("Unauthorized", 401);
    return fn(...args);
  });
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
