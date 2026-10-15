import { loadEnv } from "vite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const env = loadEnv("development", process.cwd(), "VITE_");
const url = env.VITE_SUPABASE_URL,
  key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Supabase URL and publishable key required");
const manifest = JSON.parse(
  readFileSync("supabase/catalog-audit.json", "utf8"),
);
const result = {
  checkedAt: new Date().toISOString(),
  project: new URL(url).hostname.split(".")[0],
  tables: [],
  checks: [],
};
for (const [name, count] of Object.entries(manifest.counts)) {
  const r = await fetch(`${url}/rest/v1/game_${name}?select=*`, {
    method: "HEAD",
    headers: { apikey: key, Prefer: "count=exact" },
  });
  const actual = Number(r.headers.get("content-range")?.split("/")[1]);
  if (!r.ok || actual !== count)
    throw new Error(
      `${name}: expected ${count}, received ${actual}, status ${r.status}`,
    );
  result.tables.push({ table: name, count: actual });
}
const release = await fetch(
  `${url}/rest/v1/game_imports?select=sha256,status`,
  { headers: { apikey: key } },
).then((r) => r.json());
if (release[0]?.sha256 !== manifest.sha256 || release[0]?.status !== "ready")
  throw new Error("Catalog version mismatch");
result.checks.push("35 table counts and SHA match SQLite");
const write = await fetch(`${url}/rest/v1/game_personajes`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ slug: "forbidden-test" }),
});
if (write.ok)
  throw new Error("Anonymous catalog insert was unexpectedly allowed");
result.checks.push(`Anonymous catalog writes rejected (${write.status})`);
const party = await fetch(`${url}/rest/v1/party_plans?select=id`, {
  headers: { apikey: key },
});
if (party.ok && JSON.stringify(await party.json()) !== "[]")
  throw new Error("Anonymous party data exposed");
result.checks.push(`Anonymous private plans blocked (${party.status})`);
mkdirSync("output", { recursive: true });
writeFileSync(
  "output/supabase-verification.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    tables: result.tables.length,
    rows: result.tables.reduce((s, t) => s + t.count, 0),
    checks: result.checks,
  }),
);
