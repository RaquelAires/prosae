import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { base, cookieOf } from "./test-session.mjs";
// Separate loopback test clients; the production edge supplies this header itself.
const testClient = "local-auth-test-" + randomUUID();
const email = "auth-" + randomUUID() + "@example.test",
  password = randomUUID() + "-Pass!2026",
  nextPassword = randomUUID() + "-New!";
async function call(action, body, cookie = "", extra = {}) {
  return fetch(base + "/api/auth/" + action, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": testClient,
      ...(cookie ? { cookie } : {}),
      ...extra,
    },
    body: JSON.stringify(body),
  });
}
assert.equal(
  (await call("register", { name: "Ana", email, password: "curta" })).status,
  400,
);
assert.equal(
  (await call("register", { name: "Ana", email: "invalid", password })).status,
  400,
);
assert.equal(
  (
    await call("register", { name: "Ana", email, password }, "", {
      Origin: "https://invalid.example",
    })
  ).status,
  403,
);
const signup = await call("register", {
  name: "Ana Leitora",
  email: email.toUpperCase(),
  password,
});
assert.equal(signup.status, 201);
const firstCookie = cookieOf(signup);
assert(firstCookie);
assert(signup.headers.get("set-cookie").includes("HttpOnly"));
assert(signup.headers.get("set-cookie").includes("SameSite=Lax"));
assert(!signup.headers.get("set-cookie").includes("Max-Age"));
assert.equal(
  (await call("register", { name: "Outra", email, password })).status,
  409,
);
assert.equal(
  (await call("login", { email, password: "senha errada" })).status,
  401,
);
const signin = await call("login", { email, password, remember: true });
assert.equal(signin.status, 200);
const secondCookie = cookieOf(signin);
assert(signin.headers.get("set-cookie").includes("Max-Age=2592000"));
const me = await (
  await fetch(base + "/api/me", { headers: { cookie: secondCookie } })
).json();
assert.equal(me.user.email, email);
assert(!JSON.stringify(me).includes("password_hash"));
assert.equal(
  (
    await fetch(base + "/api/me", {
      headers: {
        cookie: "prosae_session=" + randomUUID().replaceAll("-", "").repeat(2),
      },
    }).then((r) => r.json())
  ).user,
  null,
);
assert.equal(
  (
    await call(
      "password",
      { currentPassword: "incorreta", password: nextPassword },
      secondCookie,
    )
  ).status,
  401,
);
const change = await call(
  "password",
  { currentPassword: password, password: nextPassword },
  secondCookie,
);
assert.equal(change.status, 200);
const changedCookie = cookieOf(change);
assert.equal(
  (
    await (
      await fetch(base + "/api/me", { headers: { cookie: firstCookie } })
    ).json()
  ).user,
  null,
);
assert.equal(
  (
    await (
      await fetch(base + "/api/me", { headers: { cookie: secondCookie } })
    ).json()
  ).user,
  null,
);
assert.equal((await call("login", { email, password })).status, 401);
assert.equal(
  (await call("login", { email, password: nextPassword })).status,
  200,
);
assert.equal((await call("logout", {}, changedCookie)).status, 200);
assert.equal(
  (
    await (
      await fetch(base + "/api/me", { headers: { cookie: changedCookie } })
    ).json()
  ).user,
  null,
);
const badEmail = "missing-" + randomUUID() + "@example.test";
let last;
for (let i = 0; i < 9; i++)
  last = await call("login", { email: badEmail, password });
assert.equal(last.status, 429);
assert(last.headers.get("retry-after"));
console.log(
  "PASS: cadastro, senha mínima, e-mail duplicado, login, cookie HttpOnly, persistência, logout, troca de senha, revogação, CSRF e limitação de tentativas.",
);
