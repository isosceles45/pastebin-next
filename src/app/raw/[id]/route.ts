import { passwordFrom, READ_FAILURES } from "@/lib/http";
import { consumePaste } from "@/lib/pastes";

type Params = { params: Promise<{ id: string }> };

const TEXT = { "content-type": "text/plain; charset=utf-8" };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const result = await consumePaste(id, passwordFrom(request));

  if (!result.ok) {
    const failure = READ_FAILURES[result.reason];
    return new Response(`${failure.error}\n`, { status: failure.status, headers: TEXT });
  }

  const { paste } = result;

  return new Response(paste.content, {
    headers: paste.filename
      ? { ...TEXT, "content-disposition": `inline; filename="${paste.filename.replace(/"/g, "")}"` }
      : TEXT,
  });
}
