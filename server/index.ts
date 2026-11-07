import { createApi } from "./api";
import type { Env } from "./env";
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    // Development-only identity. Vite removes this branch from production builds.
    if (
      import.meta.env.DEV &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    ) {
      if (
        ["/signin-with-chatgpt", "/signout-with-chatgpt"].includes(url.pathname)
      ) {
        const returnTo = url.searchParams.get("return_to") || "/";
        const safe =
          returnTo.startsWith("/") && !returnTo.startsWith("//")
            ? returnTo
            : "/";
        return new Response(null, {
          status: 302,
          headers: {
            Location: safe,
            "Set-Cookie":
              url.pathname === "/signin-with-chatgpt"
                ? "prosae_dev=1; HttpOnly; SameSite=Lax; Path=/"
                : "prosae_dev=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/",
          },
        });
      }
      const headers = new Headers(request.headers);
      for (const k of Array.from(headers.keys()))
        if (k.startsWith("oai-authenticated-")) headers.delete(k);
      if (
        /(?:^|;\s*)prosae_dev=1(?:;|$)/.test(
          request.headers.get("cookie") || "",
        )
      ) {
        headers.set("oai-authenticated-user-id", "local_seedy");
        headers.set("oai-authenticated-user-email", "seedy@sites.test");
        headers.set("oai-authenticated-user-full-name", "Autor local");
      }
      request = new Request(request, { headers });
    }
    if (url.pathname.startsWith("/api/")) return createApi(env)(request);
    if (url.pathname === "/health")
      return Response.json({ ok: true, framework: "Vue 3" });
    return env.ASSETS.fetch(request);
  },
};
