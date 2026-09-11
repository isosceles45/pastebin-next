import { sql } from "@/lib/db";

export type Paste = {
  id: string;
  content: string;
  createdAt: string;
  expiresAt: string | null;
  maxViews: number | null;
  views: number;
  remainingViews: number | null;
};

export type ReadResult =
  | { ok: true; paste: Paste }
  | { ok: false; reason: "not_found" | "expired" };

export async function consumePaste(id: string): Promise<ReadResult> {
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

    if (existing) {
      await discardContent(id);
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "not_found" };
  }

  const row = rows[0];
  const spent = row.max_views !== null && row.views >= row.max_views;

  if (spent) {
    await discardContent(id);
  }

  return {
    ok: true,
    paste: {
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      maxViews: row.max_views,
      views: row.views,
      remainingViews: row.max_views === null ? null : row.max_views - row.views,
    },
  };
}

async function discardContent(id: string) {
  await sql`UPDATE pastes SET content = '' WHERE id = ${id} AND content <> ''`;
}
