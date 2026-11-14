import { NextResponse } from "next/server";
export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 :
    message === "PROFILE_NOT_CONFIGURED" ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}
