import type { Env } from "./env";
export function isAdministrator(userId: string | undefined, env: Env) {
  return (
    !!userId &&
    !!env.PROSAE_ADMIN_USER_ID &&
    userId === env.PROSAE_ADMIN_USER_ID.trim()
  );
}
