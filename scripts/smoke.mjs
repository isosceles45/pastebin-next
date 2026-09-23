#!/usr/bin/env node
/**
 * End to end tests. Runs against a local server or a deployment:
 *
 *   pnpm smoke                              http://localhost:3000
 *   pnpm smoke https://example.vercel.app
 */

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const GREEN = "[32m";
const RED = "[31m";
const DIM = "[2m";
const RESET = "[0m";

let passed = 0;
const failures = [];

async function check(name, run) {
  try {
    await run();
    passed++;
    console.log(`  ${GREEN}pass${RESET}  ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  ${RED}FAIL${RESET}  ${name}`);
    console.log(`        ${RED}${error.message}${RESET}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, label) {
  assert(
    actual === expected,
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

const api = (path, init) => fetch(`${BASE}${path}`, init);

async function create(body) {
  const response = await api("/api/pastes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, data: await response.json() };
}

async function createOk(body) {
  const { response, data } = await create(body);
  assert(response.status === 201, `could not create a paste: ${JSON.stringify(data)}`);
  return data;
}

const status = (path, init) => api(path, init).then((response) => response.status);

console.log(`\nTesting ${BASE}\n`);
console.log(`${DIM}creating${RESET}`);

await check("returns 201 with an id, links and a one time edit token", async () => {
  const { response, data } = await create({ content: "hello world" });

  equal(response.status, 201, "status");
  assert(typeof data.id === "string" && data.id.length >= 8, `bad id: ${data.id}`);
  assert(data.url.endsWith(`/${data.id}`), "url does not point at the id");
  assert(data.rawUrl.endsWith(`/raw/${data.id}`), "rawUrl is wrong");
  assert(typeof data.editToken === "string" && data.editToken.length > 20, "no edit token");
  equal(data.expiresAt, null, "expiresAt defaults to no expiry");
  equal(data.maxViews, null, "maxViews defaults to unlimited");
});

await check("rejects empty content with 400", async () => {
  equal((await create({ content: "" })).response.status, 400, "status");
});

await check("rejects a non object body with 400", async () => {
  const response = await api("/api/pastes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not json at all",
  });
  equal(response.status, 400, "status");
});

await check("rejects content over 512 KB with 413", async () => {
  const { response } = await create({ content: "x".repeat(600 * 1024) });
  equal(response.status, 413, "status");
});

await check("accepts content just under the limit", async () => {
  const { response } = await create({ content: "x".repeat(400 * 1024) });
  equal(response.status, 201, "status");
});

await check("stores filename and language", async () => {
  const created = await createOk({
    content: "print('hi')",
    filename: "demo.py",
    language: "python",
  });
  const paste = await (await api(`/api/pastes/${created.id}`)).json();

  equal(paste.filename, "demo.py", "filename");
  equal(paste.language, "python", "language");
});

console.log(`\n${DIM}reading${RESET}`);

await check("returns the exact bytes that were stored", async () => {
  const content = "line one\nline two\n\ttabbed\n";
  const created = await createOk({ content });
  const response = await api(`/raw/${created.id}`);

  equal(response.status, 200, "status");
  assert(
    response.headers.get("content-type").startsWith("text/plain"),
    `wrong content-type: ${response.headers.get("content-type")}`,
  );
  equal(await response.text(), content, "body");
});

await check("survives unicode and emoji unchanged", async () => {
  const content = "héllo — 日本語 — \u{1F680}";
  const created = await createOk({ content });

  equal(await (await api(`/raw/${created.id}`)).text(), content, "body");
});

await check("never exposes the edit token when reading", async () => {
  const created = await createOk({ content: "secret token check" });
  const paste = await (await api(`/api/pastes/${created.id}`)).json();

  assert(paste.editToken === undefined, "edit token is readable");
  assert(paste.passwordHash === undefined, "password hash is readable");
});

await check("returns 404 for an id that never existed", async () => {
  equal(await status("/api/pastes/nosuchpaste"), 404, "api");
  equal(await status("/raw/nosuchpaste"), 404, "raw");
});

console.log(`\n${DIM}expiry by views${RESET}`);

await check("a one read paste is gone after one read", async () => {
  const created = await createOk({ content: "burn me", maxViews: 1 });

  equal(await status(`/raw/${created.id}`), 200, "first read");
  equal(await status(`/raw/${created.id}`), 410, "second read");
});

await check("a three read paste allows exactly three reads", async () => {
  const created = await createOk({ content: "three", maxViews: 3 });

  for (let attempt = 1; attempt <= 3; attempt++) {
    equal(await status(`/raw/${created.id}`), 200, `read ${attempt}`);
  }
  equal(await status(`/raw/${created.id}`), 410, "fourth read");
});

await check("counts down the reads it has left", async () => {
  const created = await createOk({ content: "counting", maxViews: 3 });
  const first = await (await api(`/api/pastes/${created.id}`)).json();

  equal(first.views, 1, "views after one read");
  equal(first.remainingViews, 2, "remaining");
});

await check("twenty simultaneous readers cannot all take the last read", async () => {
  const created = await createOk({ content: "only one winner", maxViews: 1 });

  const results = await Promise.all(
    Array.from({ length: 20 }, () => status(`/raw/${created.id}`)),
  );
  const served = results.filter((code) => code === 200).length;

  equal(served, 1, `exactly one reader should win, got ${served}`);
});

await check("discards the text once a paste is spent", async () => {
  const created = await createOk({ content: "should not survive", maxViews: 1 });

  await api(`/raw/${created.id}`);
  const body = await (await api(`/raw/${created.id}`)).text();

  assert(!body.includes("should not survive"), "the text came back after being spent");
});

await check("rejects a max read count below one", async () => {
  equal((await create({ content: "x", maxViews: 0 })).response.status, 400, "zero");
  equal((await create({ content: "x", maxViews: 2.5 })).response.status, 400, "fractional");
});

console.log(`\n${DIM}expiry by time${RESET}`);

await check("a paste stops working once its deadline passes", async () => {
  const created = await createOk({ content: "short lived", expiresIn: "2s" });

  equal(await status(`/raw/${created.id}`), 200, "before the deadline");
  await new Promise((resolve) => setTimeout(resolve, 2600));
  equal(await status(`/raw/${created.id}`), 410, "after the deadline");
});

await check("reads duration units", async () => {
  for (const [input, seconds] of [
    ["600", 600],
    ["10m", 600],
    ["2h", 7200],
    ["7d", 604800],
  ]) {
    const created = await createOk({ content: `ttl ${input}`, expiresIn: input });
    const drift = (new Date(created.expiresAt) - Date.now()) / 1000;

    assert(
      Math.abs(drift - seconds) < 60,
      `${input} should be about ${seconds}s away, got ${Math.round(drift)}s`,
    );
  }
});

await check("rejects nonsense and out of range durations", async () => {
  equal((await create({ content: "x", expiresIn: "tomorrow" })).response.status, 400, "nonsense");
  equal((await create({ content: "x", expiresIn: "400d" })).response.status, 400, "over 30 days");
});

console.log(`\n${DIM}passwords${RESET}`);

await check("a protected paste needs the right password", async () => {
  const created = await createOk({ content: "classified", password: "hunter2", maxViews: 9 });

  equal(await status(`/raw/${created.id}`), 401, "no password");
  equal(await status(`/raw/${created.id}?password=wrong`), 401, "wrong password");
  equal(await status(`/raw/${created.id}?password=hunter2`), 200, "query parameter");
  equal(
    await status(`/raw/${created.id}`, { headers: { "x-paste-password": "hunter2" } }),
    200,
    "header",
  );
});

await check("a wrong guess does not spend a read", async () => {
  const created = await createOk({ content: "guarded", password: "pw", maxViews: 1 });

  equal(await status(`/raw/${created.id}?password=nope`), 401, "wrong guess");
  equal(await status(`/raw/${created.id}?password=pw`), 200, "the read is still available");
});

await check("the locked page does not leak the text", async () => {
  const marker = `MARKER_${Date.now()}`;
  const created = await createOk({ content: marker, password: "pw" });
  const html = await (await api(`/${created.id}`, { headers: { accept: "text/html" } })).text();

  assert(!html.includes(marker), "the protected text was rendered into the page");
});

console.log(`\n${DIM}custom links${RESET}`);

await check("uses a custom slug and refuses to reuse it", async () => {
  const slug = `smoke-${Date.now().toString(36)}`;
  const created = await createOk({ content: "custom", customId: slug });

  equal(created.id, slug, "id");
  equal(await (await api(`/raw/${slug}`)).text(), "custom", "body");
  equal((await create({ content: "clash", customId: slug })).response.status, 409, "duplicate");
});

await check("refuses reserved and malformed slugs", async () => {
  equal((await create({ content: "x", customId: "api" })).response.status, 400, "reserved");
  equal((await create({ content: "x", customId: "has spaces" })).response.status, 400, "spaces");
  equal((await create({ content: "x", customId: "ab" })).response.status, 400, "too short");
});

await check("makes a longer id on request", async () => {
  const short = await createOk({ content: "short id" });
  const long = await createOk({ content: "long id", idStyle: "long" });

  equal(short.id.length, 8, "short length");
  equal(long.id.length, 22, "long length");
});

console.log(`\n${DIM}managing${RESET}`);

await check("editing requires the edit token", async () => {
  const created = await createOk({ content: "before" });

  const rejected = await api(`/api/pastes/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-edit-token": "wrong" },
    body: JSON.stringify({ content: "hacked" }),
  });
  equal(rejected.status, 403, "wrong token");

  const accepted = await api(`/api/pastes/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-edit-token": created.editToken },
    body: JSON.stringify({ content: "after" }),
  });
  equal(accepted.status, 200, "right token");
  equal(await (await api(`/raw/${created.id}`)).text(), "after", "content was replaced");
});

await check("deleting requires the edit token and really removes the paste", async () => {
  const created = await createOk({ content: "delete me" });

  equal(
    await status(`/api/pastes/${created.id}`, {
      method: "DELETE",
      headers: { "x-edit-token": "wrong" },
    }),
    403,
    "wrong token",
  );
  equal(
    await status(`/api/pastes/${created.id}`, {
      method: "DELETE",
      headers: { "x-edit-token": created.editToken },
    }),
    200,
    "right token",
  );
  equal(await status(`/api/pastes/${created.id}`), 404, "after deleting");
});

console.log(`\n${DIM}pages${RESET}`);

await check("the browser page shows the paste", async () => {
  const created = await createOk({ content: "rendered in html" });
  const response = await api(`/${created.id}`, { headers: { accept: "text/html" } });

  equal(response.status, 200, "status");
  assert((await response.text()).includes("rendered in html"), "content missing from the page");
});

await check("an unknown address is a 404 page", async () => {
  equal(await status("/nosuchpaste", { headers: { accept: "text/html" } }), 404, "status");
});

console.log(
  `\n${failures.length === 0 ? GREEN : RED}${passed} passed, ${failures.length} failed${RESET}\n`,
);

if (failures.length > 0) {
  for (const name of failures) console.log(`  ${RED}x${RESET} ${name}`);
  console.log();
}

process.exit(failures.length === 0 ? 0 : 1);
