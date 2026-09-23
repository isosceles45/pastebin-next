# Pastebin

Store text, share a link. A paste can expire after a period of time, after a number of
reads, or both — and can be locked with a password.

Built with Next.js (App Router) and Postgres on Neon.

## Running it locally

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local     # then add your Neon connection string
pnpm migrate up                # create the table
pnpm dev
```

The app is on http://localhost:3000.

To check everything works, against a local server or a deployment:

```bash
pnpm smoke                               # http://localhost:3000
pnpm smoke https://your-app.vercel.app
```

## Deploying

1. Create a Postgres database on [Neon](https://neon.com) and copy the **pooled**
   connection string (the host contains `-pooler`).
2. Import the repository on [Vercel](https://vercel.com) and set `DATABASE_URL` to that
   string. Optionally set `CRON_SECRET` to a long random value.
3. Run `pnpm migrate up` once with `DATABASE_URL` pointing at the production database.

`vercel.json` schedules `/api/cleanup` daily.

## The data model

One table, one row per paste.

| column            | meaning                                            |
| ----------------- | -------------------------------------------------- |
| `id`              | the short string in the URL                         |
| `content`         | the text                                            |
| `filename`        | optional, shown in the header and `content-disposition` |
| `language`        | optional, drives syntax highlighting                |
| `expires_at`      | deadline, or `NULL` for no time limit               |
| `max_views`       | read budget, or `NULL` for unlimited                |
| `views`           | reads so far                                        |
| `password_hash`   | scrypt hash with a per-paste salt, or `NULL`        |
| `edit_token_hash` | SHA-256 of the token that permits edit and delete   |

`NULL` means "no limit" for both expiry rules, so a paste can have neither, either or both.

## API

### `POST /api/pastes`

```bash
curl -X POST https://your-app.vercel.app/api/pastes \
  -H 'content-type: application/json' \
  -d '{"content":"hello","expiresIn":"10m","maxViews":1}'
```

| field      | notes                                                              |
| ---------- | ------------------------------------------------------------------ |
| `content`  | required, up to 512 KB                                              |
| `expiresIn`| `600`, `10m`, `2h`, `7d`, `4w`. Up to 30 days. Omit for no expiry   |
| `maxViews` | whole number ≥ 1. Omit for unlimited                                |
| `password` | required to read the paste afterwards                               |
| `filename` | optional                                                            |
| `language` | optional, e.g. `python`                                             |
| `idStyle`  | `long` for a 22 character id instead of 8                           |
| `customId` | your own slug, 3–64 of `[A-Za-z0-9_-]`                              |

Returns `201` with `id`, `url`, `rawUrl`, `manageUrl` and `editToken`. **The edit token is
shown once** — it is stored only as a hash and cannot be recovered.

### `GET /api/pastes/:id`

JSON, including the content. Counts as a read.

### `GET /raw/:id`

The text as `text/plain`, suitable for piping. Counts as a read.

### `PATCH /api/pastes/:id` · `DELETE /api/pastes/:id`

Require the edit token, sent as `x-edit-token`, `Authorization: Bearer …` or `?token=`.
`PATCH` accepts `content`, `filename`, `language`, `expiresIn` and `maxViews`.

### Passwords

Supply as `?password=` or the `x-paste-password` header. The header is preferred — a query
string ends up in browser history and server logs.

### Status codes

| code  | meaning                                          |
| ----- | ------------------------------------------------ |
| `200` | here is the paste                                |
| `201` | created                                          |
| `400` | invalid input                                    |
| `401` | password missing or wrong                        |
| `403` | edit token missing or wrong                      |
| `404` | no paste has ever had this id                    |
| `409` | that custom slug is taken                        |
| `410` | the paste existed and is now expired or spent    |
| `413` | content too large                                |

`404` and `410` are deliberately different: "never existed" and "existed, now gone" are
different facts, and only the second confirms someone once had a link.

## Design notes

**Reading a paste is a single SQL statement.** The obvious implementation — read the row,
decide whether it is still alive, serve it, then increment the counter — has a race. Two
people opening a one-read paste at the same moment both see `views = 0`, both decide it is
alive, and both get the text. So the check and the increment are one statement:

```sql
UPDATE pastes
   SET views = views + 1
 WHERE id = $1
   AND (expires_at IS NULL OR expires_at > now())
   AND (max_views  IS NULL OR views < max_views)
RETURNING content, views, ...
```

Postgres locks the row, so the second reader re-evaluates `views < max_views` against the
updated value, matches nothing, and is refused. The test suite asserts this with twenty
simultaneous readers of a one-read paste: exactly one gets a `200`.

**Spent pastes keep their row but lose their text.** `content` is set to `''` while the row
remains, so the link keeps answering `410` rather than degrading to `404`, and the text
genuinely stops existing. A daily job deletes rows a week after they die.

**Expiry is stored as an absolute timestamp**, not a countdown, so the deadline is fixed at
creation and the comparison happens inside the database.

**Passwords use scrypt, edit tokens use SHA-256.** Passwords are low entropy and worth
brute forcing, so they get a deliberately slow, salted hash. An edit token is 24 random
bytes, so a fast hash is enough and scrypt would only waste time on every request. Both are
compared with `timingSafeEqual`.

**The password is checked before a read is spent**, so a wrong guess costs nothing.
Otherwise anyone could destroy a burn-after-reading paste by guessing wrong once.

**Syntax highlighting runs on the server**, so the browser receives finished HTML and never
downloads the highlighting library.

**The driver talks to Postgres over HTTP.** `@neondatabase/serverless` avoids holding a TCP
connection, which a serverless function cannot reliably do between invocations. Migrations
are the exception — they run once from a laptop or CI over an ordinary connection.

## Known limitations

- The manage link carries the edit token in a query string, so it can end up in browser
  history. The `x-edit-token` header avoids this and the API accepts it.
- An expired paste's HTML page answers `200` with a "this paste is gone" message; only the
  API returns a true `410`. A React server component cannot set an arbitrary status code.
- Unlocked content in the password gate is shown without syntax highlighting, because the
  browser receives raw text from the API rather than server-rendered HTML.
- Pastes are stored in plain text. The server can read them.

## Layout

```
migrations/            schema history, applied with pnpm migrate up
scripts/smoke.mjs      end to end tests, runs against any URL
src/app/               pages and API routes
src/lib/pastes.ts      create, read, update, delete
src/lib/validation.ts  input parsing and limits
src/lib/secrets.ts     password hashing and edit tokens
```
