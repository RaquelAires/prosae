import { randomBytes, createHash } from "node:crypto";
import { hashPassword, verifyPassword, dummyHash } from "./passwords";
import type { Env } from "./env";
export const SESSION_COOKIE = "prosae_session";
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function sessionToken(req: Request) {
  const raw = req.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(SESSION_COOKIE + "="))
    ?.slice(SESSION_COOKIE.length + 1);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? raw : null;
}
export async function sessionUser(req: Request, env: Env) {
  const token = sessionToken(req);
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(digest(token), Date.now())
    .first<{ id: string; email: string; name: string }>();
  return row
    ? { userId: row.id, email: row.email, displayName: row.name }
    : null;
}
function cookie(req: Request, token: string, remember = false) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${new URL(req.url).protocol === "https:" ? "; Secure" : ""}${remember ? "; Max-Age=2592000" : ""}`;
}
function result(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}
function authError(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
async function createSession(
  req: Request,
  env: Env,
  userId: string,
  remember: boolean,
  revokeAll = false,
  passwordHash?: string,
) {
  const token = randomBytes(32).toString("hex"),
    expires = Date.now() + (remember ? 30 * 86400000 : 12 * 3600000);
  const old = sessionToken(req);
  const operations = [
    env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(Date.now()),
  ];
  if (passwordHash)
    operations.push(
      env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(
        passwordHash,
        userId,
      ),
    );
  if (revokeAll)
    operations.push(
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId),
    );
  else if (old)
    operations.push(
      env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(
        digest(old),
      ),
    );
  operations.push(
    env.DB.prepare(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
    ).bind(digest(token), userId, expires),
  );
  await env.DB.batch(operations);
  return cookie(req, token, remember);
}
async function limit(env: Env, value: string, max: number, minutes = 15) {
  const window = minutes * 60000,
    expires = (Math.floor(Date.now() / window) + 1) * window;
  const key = digest(value + ":" + expires);
  const row = await env.DB.prepare(
    "INSERT INTO auth_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits",
  )
    .bind(key, expires)
    .first<{ hits: number }>();
  if (!row || row.hits > max)
    authError(
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      429,
    );
}
export async function authRoute(req: Request, env: Env) {
  try {
    if (req.method !== "POST")
      return result({ error: "Use POST para esta operação." }, 405, {
        Allow: "POST",
      });
    const origin = req.headers.get("origin");
    if (
      (origin && origin !== new URL(req.url).origin) ||
      req.headers.get("sec-fetch-site") === "cross-site"
    )
      authError("Origem da solicitação inválida.", 403);
    if (!req.headers.get("content-type")?.includes("application/json"))
      authError("Envie os dados em JSON.", 415);
    if (Number(req.headers.get("content-length")) > 10000)
      authError("Solicitação muito grande.", 413);
    const text = await req.text();
    if (text.length > 10000) authError("Solicitação muito grande.", 413);
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      authError("Dados inválidos.");
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      authError("Dados inválidos.");
    const action = new URL(req.url).pathname.split("/").pop();
    if (action === "logout") {
      const token = sessionToken(req);
      if (token)
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
          .bind(digest(token))
          .run();
      return result({ ok: true }, 200, {
        "Set-Cookie": cookie(req, "") + "; Max-Age=0",
      });
    }
    const ip = req.headers.get("cf-connecting-ip") || "local";
    await limit(env, "all:" + ip, 40);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM auth_limits WHERE expires_at<=?").bind(
        Date.now(),
      ),
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(
        Date.now(),
      ),
    ]);
    if (action === "password") {
      const user = await sessionUser(req, env);
      if (!user) authError("Entre para alterar sua senha.", 401);
      await limit(env, "password:" + ip + ":" + user.userId, 6);
      if (
        typeof data.currentPassword !== "string" ||
        data.currentPassword.length > 128
      )
        authError("Senha atual incorreta.", 401);
      validatePassword(data.password);
      const row = await env.DB.prepare(
        "SELECT password_hash FROM users WHERE id=?",
      )
        .bind(user.userId)
        .first<{ password_hash: string }>();
      if (
        !row ||
        !(await verifyPassword(data.currentPassword, row.password_hash))
      )
        authError("Senha atual incorreta.", 401);
      return result({ ok: true }, 200, {
        "Set-Cookie": await createSession(
          req,
          env,
          user.userId,
          false,
          true,
          await hashPassword(data.password),
        ),
      });
    }
    if (action !== "login" && action !== "register")
      return result({ error: "Operação não encontrada." }, 404);
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      authError("Informe um e-mail válido.");
    await limit(
      env,
      action + ":" + ip + ":" + email,
      action === "register" ? 5 : 8,
    );
    if (action === "register") {
      const name =
        typeof data.name === "string"
          ? data.name.trim().replace(/\s+/g, " ")
          : "";
      if (name.length < 2 || name.length > 80)
        authError("Informe um nome entre 2 e 80 caracteres.");
      validatePassword(data.password);
      if (
        await env.DB.prepare("SELECT id FROM users WHERE email=?")
          .bind(email)
          .first()
      )
        authError(
          "Já existe uma conta com este e-mail. Entre na sua conta.",
          409,
        );
      const id = crypto.randomUUID(),
        passwordHash = await hashPassword(data.password);
      try {
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)",
          ).bind(id, email, name, passwordHash, Date.now()),
          env.DB.prepare("INSERT INTO profiles(id,data) VALUES(?,?)").bind(
            id,
            JSON.stringify({
              id,
              name,
              bio: "",
              region: "",
              link: "",
              photo: "",
            }),
          ),
        ]);
      } catch (e: any) {
        if (/UNIQUE/i.test(e.message || ""))
          authError(
            "Já existe uma conta com este e-mail. Entre na sua conta.",
            409,
          );
        throw e;
      }
      return result({ ok: true, user: { id, name, email } }, 201, {
        "Set-Cookie": await createSession(req, env, id, data.remember === true),
      });
    }
    const row = await env.DB.prepare(
      "SELECT id,email,name,password_hash FROM users WHERE email=?",
    )
      .bind(email)
      .first<{
        id: string;
        email: string;
        name: string;
        password_hash: string;
      }>();
    if (typeof data.password !== "string" || data.password.length > 128)
      authError("E-mail ou senha incorretos.", 401);
    const matches = await verifyPassword(
      data.password,
      row?.password_hash || dummyHash,
    );
    if (!row || !matches) authError("E-mail ou senha incorretos.", 401);
    return result(
      { ok: true, user: { id: row.id, name: row.name, email: row.email } },
      200,
      {
        "Set-Cookie": await createSession(
          req,
          env,
          row.id,
          data.remember === true,
        ),
      },
    );
  } catch (e: any) {
    return result(
      {
        error: e.status
          ? e.message
          : "Não foi possível concluir o login. Tente novamente.",
      },
      e.status || 500,
      e.status === 429 ? { "Retry-After": "900" } : {},
    );
  }
}
function validatePassword(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    authError("Use uma senha entre 12 e 128 caracteres.");
}
