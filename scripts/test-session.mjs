import { randomUUID } from "node:crypto";
export const base = process.env.PROSAE_TEST_URL || "http://127.0.0.1:5173";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error("Os testes só podem gravar dados em localhost.");
export const cookieOf = (r) =>
  r.headers
    .getSetCookie()
    .map((s) => s.split(";")[0])
    .join("; ");
export async function testSession() {
  const r = await fetch(base + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Teste de integração",
      email: "test-" + randomUUID() + "@example.test",
      password: randomUUID() + "-Pass!2026",
    }),
  });
  if (r.status !== 201) throw new Error(await r.text());
  return cookieOf(r);
}
