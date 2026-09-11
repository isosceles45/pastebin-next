import { sql } from "@/lib/db";
import { parseDuration, parseMaxViews, ValidationError } from "@/lib/expiry";
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

  let expiresAt: Date | null = null;
  let maxViews: number | null = null;

  try {
    if (body.expiresIn != null && body.expiresIn !== "") {
      expiresAt = new Date(Date.now() + parseDuration(body.expiresIn) * 1000);
    }
    if (body.maxViews != null && body.maxViews !== "") {
      maxViews = parseMaxViews(body.maxViews);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const id = randomId();

  await sql`
    INSERT INTO pastes (id, content, expires_at, max_views)
    VALUES (${id}, ${content}, ${expiresAt}, ${maxViews})
  `;

  const origin = new URL(request.url).origin;

  return Response.json(
    {
      id,
      url: `${origin}/${id}`,
      expiresAt,
      maxViews,
    },
    { status: 201 },
  );
}
