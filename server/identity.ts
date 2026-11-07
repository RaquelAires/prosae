import type { Env } from "./env";
import { sessionUser } from "./auth";
export const getRequestUser = (req: Request, env: Env) => sessionUser(req, env);
