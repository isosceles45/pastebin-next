import { createPaste, MAX_CONTENT_BYTES } from "@/lib/pastes";
import { ConflictError, ValidationError } from "@/lib/validation";

export async function POST(request: Request) {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_CONTENT_BYTES * 2) {
    return Response.json({ error: "request body is too large" }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return Response.json({ error: "expected a JSON object" }, { status: 400 });
  }

  try {
    const created = await createPaste(body);
    const origin = new URL(request.url).origin;

    return Response.json(
      {
        id: created.id,
        url: `${origin}/${created.id}`,
        rawUrl: `${origin}/raw/${created.id}`,
        manageUrl: `${origin}/${created.id}?token=${created.editToken}`,
        editToken: created.editToken,
        filename: created.filename,
        language: created.language,
        expiresAt: created.expiresAt,
        maxViews: created.maxViews,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
