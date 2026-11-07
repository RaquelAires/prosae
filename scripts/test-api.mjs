import assert from "node:assert/strict";
import fs from "node:fs";
import { base, testSession } from "./test-session.mjs";
const cookie = await testSession();
const headers = { cookie, "Content-Type": "application/json" };
const cat = await (await fetch(base + "/api/catalog")).json();
assert(cat.length >= 6);
assert.equal(
  (
    await fetch(base + "/api/upload?kind=book", {
      method: "POST",
      body: "invalid",
    })
  ).status,
  401,
);
assert.equal(
  (
    await fetch(base + "/api/upload?kind=book", {
      method: "POST",
      headers: { cookie },
      body: new Uint8Array([80, 75, 1, 2]),
    })
  ).status,
  400,
);
let testId;
try {
  const bytes = fs.readFileSync("public/samples/mar.epub");
  const file = await (
    await fetch(base + "/api/upload?kind=book", {
      method: "POST",
      headers: { cookie, "x-filename": "test.epub" },
      body: bytes,
    })
  ).json();
  assert(file.id);
  const cover = await (
    await fetch(base + "/api/upload?kind=cover", {
      method: "POST",
      headers: { cookie },
      body: fs.readFileSync("public/assets/onca.png"),
    })
  ).json();
  assert(cover.id);
  const data = {
    title: "Teste de integração Vue",
    author: "Autor de teste",
    synopsis: "Uma história temporária para testar a publicação em Vue.",
    genre: "Contos",
    file: file.id,
    cover: cover.id,
    online: true,
    download: true,
    rights: true,
    pages: 3,
  };
  const draft = await (
    await fetch(base + "/api/book", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...data, status: "draft" }),
    })
  ).json();
  assert(draft.id);
  testId = draft.id;
  assert(
    !(await (await fetch(base + "/api/catalog")).json()).some(
      (x) => x.id === testId,
    ),
  );
  assert.equal(
    (
      await fetch(base + "/api/book/" + testId, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...data, status: "published" }),
      })
    ).status,
    200,
  );
  const download = await fetch(base + "/api/file/" + testId + "?download=1");
  assert.equal(download.status, 200);
  assert.equal((await download.arrayBuffer()).byteLength, bytes.byteLength);
  assert.equal(
    (
      await fetch(base + "/api/shelf", {
        method: "POST",
        headers,
        body: JSON.stringify({
          book: testId,
          status: "Lendo",
          progress: 42,
          location: '{"index":1}',
          bookmark: '{"index":0}',
        }),
      })
    ).status,
    200,
  );
  const me = await (
    await fetch(base + "/api/me", { headers: { cookie } })
  ).json();
  assert.equal(me.shelf.find((s) => s.book === testId).progress, 42);
  assert.equal(
    (
      await fetch(base + "/api/book/mar", {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      })
    ).status,
    403,
  );
  assert.equal((await fetch(base + "/api/file/vento?download=1")).status, 403);
  await fetch(base + "/api/shelf", {
    method: "DELETE",
    headers,
    body: JSON.stringify({ book: testId }),
  });
  console.log(
    "PASS: catálogo, login, validação de EPUB, upload de livro/capa, rascunho, publicação, download, estante e permissões.",
  );
} finally {
  if (testId) {
    await fetch(base + "/api/book/" + testId, { method: "DELETE", headers });
    assert.equal(
      (await fetch(base + "/api/file/" + testId + "?download=1")).status,
      404,
    );
    console.log("PASS: retirada da publicação de teste.");
  }
}
