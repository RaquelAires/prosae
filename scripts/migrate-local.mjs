import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const config = "dist/server/wrangler.json";
if (!fs.existsSync(config))
  throw new Error("Execute npm run build antes de preparar o banco local.");
const run = (args) => {
  const r = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      config,
      "--persist-to",
      ".wrangler/state",
      ...args,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout;
};
// Adopt the existing initial schema, preserving data created before the Vue migration.
const tables = JSON.parse(
  run([
    "--command",
    "SELECT name FROM sqlite_master WHERE type='table'",
    "--json",
  ]),
);
const names = tables.flatMap((x) => x.results || []).map((x) => x.name);
const initial = fs
  .readdirSync("drizzle")
  .filter((x) => x.endsWith(".sql"))
  .sort()[0];
if (
  ["assets", "books", "profiles", "shelves"].every((x) => names.includes(x))
) {
  console.log("Banco existente preservado. Nenhuma tabela foi recriada.");
  process.exit(0);
}
if (["assets", "books", "profiles", "shelves"].some((x) => names.includes(x)))
  throw new Error(
    "Banco com estrutura parcial. Faça uma cópia antes de aplicar a migração manualmente.",
  );
run(["--file", path.join("drizzle", initial)]);
console.log("Banco local preparado. Execute npm run dev.");
