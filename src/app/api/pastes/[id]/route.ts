import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const rows = await sql`
    UPDATE pastes
       SET views = views + 1
     WHERE id = ${id}
       AND (expires_at IS NULL OR expires_at > now())
       AND (max_views  IS NULL OR views < max_views)
    RETURNING id, content, created_at, expires_at, max_views, views
  `;

  if (rows.length === 0) {
    const [existing] = await sql`SELECT id FROM pastes WHERE id = ${id}`;

    return existing
      ? Response.json({ error: "this paste has expired" }, { status: 410 })
      : Response.json({ error: "paste not found" }, { status: 404 });
  }

  const paste = rows[0];

  return Response.json({
    id: paste.id,
    content: paste.content,
    createdAt: paste.created_at,
    expiresAt: paste.expires_at,
    maxViews: paste.max_views,
    views: paste.views,
    remainingViews: paste.max_views === null ? null : paste.max_views - paste.views,
  });
}
