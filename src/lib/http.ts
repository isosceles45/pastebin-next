import type { ReadFailure } from "@/lib/pastes";

export function passwordFrom(request: Request): string | null {
  return (
    new URL(request.url).searchParams.get("password") ??
    request.headers.get("x-paste-password")
  );
}

export function tokenFrom(request: Request): string | null {
  const header = request.headers.get("authorization");

  return (
    new URL(request.url).searchParams.get("token") ??
    request.headers.get("x-edit-token") ??
    (header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null)
  );
}

export const READ_FAILURES: Record<ReadFailure, { status: number; error: string }> = {
  not_found: { status: 404, error: "paste not found" },
  expired: { status: 410, error: "this paste has expired" },
  password_required: { status: 401, error: "this paste needs a password" },
  wrong_password: { status: 401, error: "incorrect password" },
};
