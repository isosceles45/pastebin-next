import { consumePaste } from "@/lib/pastes";

type Params = { params: Promise<{ id: string }> };

const TEXT = { "content-type": "text/plain; charset=utf-8" };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const result = await consumePaste(id);

  if (!result.ok) {
    return result.reason === "expired"
      ? new Response("this paste has expired\n", { status: 410, headers: TEXT })
      : new Response("paste not found\n", { status: 404, headers: TEXT });
  }

  return new Response(result.paste.content, { headers: TEXT });
}
