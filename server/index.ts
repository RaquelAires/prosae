import { createApi } from "./api";
import { authRoute } from "./auth";
import type { Env } from "./env";
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth/")) return authRoute(request, env);
    if (url.pathname.startsWith("/api/")) return createApi(env)(request);
    if (url.pathname === "/health")
      return Response.json({ ok: true, framework: "Vue 3" });
    return env.ASSETS.fetch(request);
  },
};
