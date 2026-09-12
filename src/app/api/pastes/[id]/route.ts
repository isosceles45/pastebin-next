import { passwordFrom, READ_FAILURES, tokenFrom } from "@/lib/http";
import { authorize, consumePaste, deletePaste, updatePaste } from "@/lib/pastes";
import { ValidationError } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const result = await consumePaste(id, passwordFrom(request));

  if (!result.ok) {
    const failure = READ_FAILURES[result.reason];
    return Response.json({ error: failure.error }, { status: failure.status });
  }

  return Response.json(result.paste);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const allowed = await authorize(id, tokenFrom(request));

  if (allowed !== "ok") {
    return allowed === "not_found"
      ? Response.json({ error: "paste not found" }, { status: 404 })
      : Response.json({ error: "a valid edit token is required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return Response.json({ error: "expected a JSON object" }, { status: 400 });
  }

  try {
    return Response.json(await updatePaste(id, body));
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const allowed = await authorize(id, tokenFrom(request));

  if (allowed !== "ok") {
    return allowed === "not_found"
      ? Response.json({ error: "paste not found" }, { status: 404 })
      : Response.json({ error: "a valid edit token is required" }, { status: 403 });
  }

  await deletePaste(id);

  return Response.json({ deleted: id });
}
