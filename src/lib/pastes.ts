import { sql } from "@/lib/db";
import { ID_LENGTHS, randomId } from "@/lib/ids";
import { createEditToken, hashPassword, hashToken, tokensMatch, verifyPassword } from "@/lib/secrets";
import {
  ConflictError,
  parseCustomId,
  parseDuration,
  parseMaxViews,
  parseOptionalText,
  ValidationError,
} from "@/lib/validation";

export const MAX_CONTENT_BYTES = 512 * 1024;

export type Paste = {
  id: string;
  content: string;
  filename: string | null;
  language: string | null;
  createdAt: string;
  expiresAt: string | null;
  maxViews: number | null;
  views: number;
  remainingViews: number | null;
};

export type ReadFailure = "not_found" | "expired" | "password_required" | "wrong_password";

export type ReadResult =
  | { ok: true; paste: Paste }
  | { ok: false; reason: ReadFailure };

export async function createPaste(body: Record<string, unknown>) {
  const content = typeof body.content === "string" ? body.content : "";

  if (content.length === 0) {
    throw new ValidationError("content is required and must not be empty");
  }
  if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
    throw new ValidationError(`content must be ${MAX_CONTENT_BYTES / 1024} KB or less`, 413);
  }

  const filename = parseOptionalText(body.filename, "filename", 200);
  const language = parseOptionalText(body.language, "language", 40);

  const expiresAt =
    body.expiresIn == null || body.expiresIn === ""
      ? null
      : new Date(Date.now() + parseDuration(body.expiresIn) * 1000);

  const maxViews =
    body.maxViews == null || body.maxViews === "" ? null : parseMaxViews(body.maxViews);

  const passwordHash =
    typeof body.password === "string" && body.password.length > 0
      ? await hashPassword(body.password)
      : null;

  const editToken = createEditToken();

  const insert = (id: string) => sql`
    INSERT INTO pastes (id, content, filename, language, expires_at, max_views, password_hash, edit_token_hash)
    VALUES (${id}, ${content}, ${filename}, ${language}, ${expiresAt}, ${maxViews}, ${passwordHash}, ${editToken.hash})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;

  if (body.customId != null && body.customId !== "") {
    const id = parseCustomId(body.customId);
    const rows = await insert(id);

    if (rows.length === 0) {
      throw new ConflictError(`the URL "${id}" is already taken`);
    }
    return { id, expiresAt, maxViews, filename, language, editToken: editToken.token };
  }

  const length = body.idStyle === "long" ? ID_LENGTHS.long : ID_LENGTHS.short;

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomId(length);
    const rows = await insert(id);

    if (rows.length > 0) {
      return { id, expiresAt, maxViews, filename, language, editToken: editToken.token };
    }
  }

  throw new Error("could not allocate a free id");
}

export async function consumePaste(id: string, password?: string | null): Promise<ReadResult> {
  const [guard] = await sql`
    SELECT password_hash, expires_at, max_views, views
      FROM pastes
     WHERE id = ${id}
  `;

  if (!guard) return { ok: false, reason: "not_found" };

  const dead =
    (guard.expires_at !== null && new Date(guard.expires_at) <= new Date()) ||
    (guard.max_views !== null && guard.views >= guard.max_views);

  if (dead) {
    await discardContent(id);
    return { ok: false, reason: "expired" };
  }

  if (guard.password_hash !== null) {
    if (!password) return { ok: false, reason: "password_required" };
    if (!(await verifyPassword(password, guard.password_hash))) {
      return { ok: false, reason: "wrong_password" };
    }
  }

  const rows = await sql`
    UPDATE pastes
       SET views = views + 1
     WHERE id = ${id}
       AND (expires_at IS NULL OR expires_at > now())
       AND (max_views  IS NULL OR views < max_views)
    RETURNING id, content, filename, language, created_at, expires_at, max_views, views
  `;

  if (rows.length === 0) {
    await discardContent(id);
    return { ok: false, reason: "expired" };
  }

  const row = rows[0];

  if (row.max_views !== null && row.views >= row.max_views) {
    await discardContent(id);
  }

  return {
    ok: true,
    paste: {
      id: row.id,
      content: row.content,
      filename: row.filename,
      language: row.language,
      createdAt: new Date(row.created_at).toISOString(),
      expiresAt: row.expires_at === null ? null : new Date(row.expires_at).toISOString(),
      maxViews: row.max_views,
      views: row.views,
      remainingViews: row.max_views === null ? null : row.max_views - row.views,
    },
  };
}

async function discardContent(id: string) {
  await sql`UPDATE pastes SET content = '' WHERE id = ${id} AND content <> ''`;
}

export async function authorize(id: string, token: string | null) {
  const [row] = await sql`SELECT edit_token_hash FROM pastes WHERE id = ${id}`;

  if (!row) return "not_found" as const;
  if (!token || !row.edit_token_hash) return "forbidden" as const;

  return tokensMatch(hashToken(token), row.edit_token_hash) ? "ok" as const : "forbidden" as const;
}

export async function updatePaste(id: string, body: Record<string, unknown>) {
  const content = typeof body.content === "string" ? body.content : null;

  if (content !== null && Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
    throw new ValidationError(`content must be ${MAX_CONTENT_BYTES / 1024} KB or less`, 413);
  }
  if (content !== null && content.length === 0) {
    throw new ValidationError("content must not be empty");
  }

  const filename = body.filename === undefined ? null : parseOptionalText(body.filename, "filename", 200);
  const language = body.language === undefined ? null : parseOptionalText(body.language, "language", 40);

  const expiresAt =
    body.expiresIn == null || body.expiresIn === ""
      ? null
      : new Date(Date.now() + parseDuration(body.expiresIn) * 1000);

  const maxViews =
    body.maxViews == null || body.maxViews === "" ? null : parseMaxViews(body.maxViews);

  const [row] = await sql`
    UPDATE pastes
       SET content    = COALESCE(${content}, content),
           filename   = CASE WHEN ${body.filename === undefined} THEN filename ELSE ${filename} END,
           language   = CASE WHEN ${body.language === undefined} THEN language ELSE ${language} END,
           expires_at = CASE WHEN ${body.expiresIn === undefined} THEN expires_at ELSE ${expiresAt} END,
           max_views  = CASE WHEN ${body.maxViews === undefined} THEN max_views ELSE ${maxViews} END
     WHERE id = ${id}
    RETURNING id, filename, language, expires_at, max_views, views
  `;

  return {
    id: row.id,
    filename: row.filename,
    language: row.language,
    expiresAt: row.expires_at === null ? null : new Date(row.expires_at).toISOString(),
    maxViews: row.max_views,
    views: row.views,
  };
}

export async function deletePaste(id: string) {
  await sql`DELETE FROM pastes WHERE id = ${id}`;
}
