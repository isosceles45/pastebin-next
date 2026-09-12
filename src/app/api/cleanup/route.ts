import { sql } from "@/lib/db";

const GRACE_PERIOD = "7 days";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "not allowed" }, { status: 403 });
  }

  const deleted = await sql`
    DELETE FROM pastes
     WHERE created_at < now() - ${GRACE_PERIOD}::interval
       AND ((expires_at IS NOT NULL AND expires_at <= now())
            OR (max_views IS NOT NULL AND views >= max_views))
    RETURNING id
  `;

  return Response.json({ deleted: deleted.length });
}
