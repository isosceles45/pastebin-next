import { sql } from "@/lib/db";
import { randomId } from "@/lib/ids";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const content = typeof body?.content === "string" ? body.content : "";
  if (content.length === 0) {
    return Response.json(
      { error: "content is required and must not be empty" },
      { status: 400 },
    );
  }

  const id = randomId();
  await sql`INSERT INTO pastes (id, content) VALUES (${id}, ${content})`;

  const origin = new URL(request.url).origin;
  return Response.json({ id, url: `${origin}/${id}` }, { status: 201 });
}
