import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
if (!fs.existsSync("dist/server/wrangler.json"))
  throw new Error("Execute npm run build antes de preparar o banco local.");
const args = [
  "--import",
  "./scripts/sites-env.mjs",
  "node_modules/wrangler/bin/wrangler.js",
];
function run(tail, json = false) {
  const r = spawnSync(
    process.execPath,
    [
      ...args,
      "d1",
      ...tail,
      "DB",
      "--local",
      "--config",
      "wrangler.jsonc",
      "--persist-to",
      ".wrangler/state",
      ...(json ? ["--json"] : []),
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return json ? JSON.parse(r.stdout) : r.stdout;
}
function sql(command) {
  const r = spawnSync(
    process.execPath,
    [
      ...args,
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "wrangler.jsonc",
      "--persist-to",
      ".wrangler/state",
      "--command",
      command,
      "--json",
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return JSON.parse(r.stdout);
}
const names = sql("SELECT name FROM sqlite_master WHERE type='table'")
  .flatMap((x) => x.results || [])
  .map((x) => x.name);
const base = ["assets", "books", "profiles", "shelves"],
  exists = base.every((x) => names.includes(x));
if (!exists && base.some((x) => names.includes(x)))
  throw new Error(
    "O banco tem uma estrutura inicial parcial. Preserve uma cópia antes de aplicar migrações manualmente.",
  );
if (exists) {
  const first = fs
    .readdirSync("drizzle")
    .filter((x) => x.endsWith(".sql"))
    .sort()[0];
  if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(first))
    throw new Error("Nome de migração inválido.");
  // Adopt only the original schema, which earlier project versions applied manually.
  sql(
    "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  sql(`INSERT OR IGNORE INTO d1_migrations(name) VALUES('${first}')`);
}
const r = spawnSync(
  process.execPath,
  [
    ...args,
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    "wrangler.jsonc",
    "--persist-to",
    ".wrangler/state",
  ],
  { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
);
if (r.status !== 0) throw new Error(r.stderr || r.stdout);
console.log(r.stdout);
console.log(
  "Migrações locais concluídas. Os dados existentes foram preservados.",
);
