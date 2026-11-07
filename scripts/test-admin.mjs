import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Miniflare } from "miniflare";
import { base, testSession } from "./test-session.mjs";
// Test privilege is passed only to a disposable loopback Worker, never production.
const adminCookie = await testSession(),
  memberCookie = await testSession();
const me = await (
  await fetch(base + "/api/me", { headers: { cookie: adminCookie } })
).json();
const testBase = "http://127.0.0.1";
const worker = new Miniflare({
  modules: true,
  scriptPath: path.resolve("dist/server/index.js"),
  compatibilityDate: "2026-05-15",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: { DB: "00000000-0000-4000-8000-000000000000" },
  d1Persist: path.resolve(".wrangler/state/v3/d1"),
  r2Buckets: { BUCKET: "site-creator-r2" },
  r2Persist: path.resolve(".wrangler/state/v3/r2"),
  bindings: { PROSAE_ADMIN_USER_ID: me.user.id },
});
async function call(
  path,
  {
    cookie = memberCookie,
    body,
    method = body ? "POST" : "GET",
    headers = {},
  } = {},
) {
  return worker.dispatchFetch(testBase + "/api/" + path, {
    method,
    headers: {
      cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
let bookId;
try {
  await worker.ready;
  assert.equal((await call("admin/catalog", { cookie: "" })).status, 401);
  assert.equal((await call("admin/catalog")).status, 403);
  assert.equal(
    (
      await call("admin/moderation/vento", {
        body: { action: "block", reason: "Teste sem autorização" },
      })
    ).status,
    403,
  );
  const role = await (await call("me", { cookie: adminCookie })).json();
  assert.equal(role.user.role, "admin");
  await call("profile", {
    body: { name: "Pessoa de teste", role: "admin" },
    method: "PUT",
  });
  assert.equal((await (await call("me")).json()).user.role, "member");
  async function upload(kind, path) {
    const r = await worker.dispatchFetch(
      testBase + "/api/upload?kind=" + kind,
      {
        method: "POST",
        headers: { cookie: memberCookie },
        body: fs.readFileSync(path),
      },
    );
    assert.equal(r.status, 200);
    return r.json();
  }
  const file = await upload("book", "public/samples/mar.epub"),
    cover = await upload("cover", "public/assets/onca.png");
  const data = {
    title: "Obra temporária de moderação",
    author: "Autor de teste",
    synopsis: "Uma obra para validar a administração.",
    genre: "Contos",
    file: file.id,
    cover: cover.id,
    online: true,
    download: true,
    rights: true,
    status: "published",
  };
  const created = await call("book", { body: data });
  assert.equal(created.status, 200);
  bookId = (await created.json()).id;
  assert.equal(
    (
      await call("admin/moderation/" + bookId, {
        cookie: adminCookie,
        body: { action: "block", reason: "abc" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("admin/moderation/" + bookId, {
        cookie: adminCookie,
        body: { action: "block", reason: "Teste de suspensão" },
        headers: { Origin: "https://invalid.example" },
      })
    ).status,
    403,
  );
  const suspended = await call("admin/moderation/" + bookId, {
    cookie: adminCookie,
    body: { action: "block", reason: "Teste de suspensão" },
  });
  assert.equal(suspended.status, 200, await suspended.text());
  const catalog = await (await call("catalog", { cookie: "" })).json();
  assert(!catalog.some((b) => b.id === bookId));
  for (const path of [
    "book/" + bookId,
    "file/" + bookId,
    "file/" + bookId + "?download=1",
  ])
    assert.equal((await call(path, { cookie: "" })).status, 404);
  assert.equal(
    (await call("read/" + bookId, { cookie: "", body: {} })).status,
    404,
  );
  assert.equal(
    (await call("book/" + bookId, { body: data, method: "PUT" })).status,
    403,
  );
  assert.equal(
    (
      await call("admin/moderation/" + bookId, {
        cookie: adminCookie,
        body: { action: "restore", reason: "Teste de liberação" },
      })
    ).status,
    200,
  );
  assert(
    (await (await call("catalog", { cookie: "" })).json()).some(
      (b) => b.id === bookId,
    ),
  );
  await call("book/" + bookId, { method: "DELETE" });
  await call("admin/moderation/" + bookId, {
    cookie: adminCookie,
    body: { action: "block", reason: "Validar retirada pelo autor" },
  });
  await call("admin/moderation/" + bookId, {
    cookie: adminCookie,
    body: { action: "restore", reason: "Preservar retirada pelo autor" },
  });
  assert(
    !(await (await call("catalog", { cookie: "" })).json()).some(
      (b) => b.id === bookId,
    ),
  );
  const panel = await (
    await call("admin/catalog", { cookie: adminCookie })
  ).json();
  assert(
    panel.events.some((e) => e.action === "block" && e.title === data.title),
  );
  console.log(
    "PASS: acesso administrativo, bloqueio de contas comuns, proteção contra promoção pelo cliente, suspensão, links diretos, republicação, liberação, histórico e retirada pelo autor.",
  );
} finally {
  if (bookId) {
    await call("admin/moderation/" + bookId, {
      cookie: adminCookie,
      body: { action: "restore", reason: "Encerramento do teste local" },
    }).catch(() => {});
    await call("book/" + bookId, { method: "DELETE" }).catch(() => {});
  }
  await worker.dispose();
}
