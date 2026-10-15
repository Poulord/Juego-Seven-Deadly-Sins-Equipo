import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(process.argv[2] || "supabase/7dsorigin.db");
const db = new DatabaseSync(source, { readOnly: true });
if (db.prepare("pragma integrity_check").get().integrity_check !== "ok")
  throw new Error("SQLite integrity check failed");
if (db.prepare("pragma foreign_key_check").all().length)
  throw new Error("SQLite has broken foreign keys");
const tables = db
  .prepare(
    "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by rowid",
  )
  .all()
  .map((t) => t.name);
const raw = Object.fromEntries(
  tables.map((t) => [t, db.prepare(`select * from "${t}"`).all()]),
);
const sha = createHash("sha256").update(readFileSync(source)).digest("hex");
const out = resolve("supabase/import");
mkdirSync(out, { recursive: true });
mkdirSync("public/catalog/heroes", { recursive: true });
const qi = (s) => '"' + s.replaceAll('"', '""') + '"';
const lit = (v) =>
  v == null
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : "'" + String(v).replaceAll("'", "''") + "'";
const sql = [];
sql.push(
  "create table public.game_imports (sha256 text primary key, source text not null, extracted_at text, imported_at timestamptz not null default now(), status text not null check(status in ('staged','ready')), counts jsonb not null);",
);
for (const t of tables) {
  const cols = db.prepare(`pragma table_info("${t}")`).all();
  const fk = db.prepare(`pragma foreign_key_list("${t}")`).all();
  const definitions = cols.map((c) => {
    const mixed = raw[t].some(
      (row) => row[c.name] != null && typeof row[c.name] === "string",
    );
    const type = mixed
      ? "text"
      : c.type === "INTEGER"
        ? "bigint"
        : c.type === "REAL"
          ? "double precision"
          : "text";
    return `${qi(c.name)} ${type}${c.pk ? " primary key" : c.notnull ? " not null" : ""}`;
  });
  for (const f of fk)
    definitions.push(
      `foreign key (${qi(f.from)}) references public.${qi("game_" + f.table)} (${qi(f.to)})`,
    );
  sql.push(
    `create table public.${qi("game_" + t)} (${definitions.join(",\n")});`,
  );
  for (const col of new Set([
    ...fk.map((f) => f.from),
    ...[
      "personaje",
      "tipo_arma",
      "rareza",
      "ranura",
      "conjunto_id",
      "arma_id",
      "maestria_id",
      "habilidad_id",
      "atuendo_id",
    ].filter((c) => cols.some((v) => v.name === c)),
  ]))
    sql.push(
      `create index ${qi(("game_" + t + "_" + col + "_idx").slice(0, 63))} on public.${qi("game_" + t)} (${qi(col)});`,
    );
  if (
    cols.some((c) => c.name === "tabla") &&
    cols.some((c) => c.name === "equipo_id")
  )
    sql.push(
      `create index ${qi("game_" + t + "_equipo_idx")} on public.${qi("game_" + t)} (tabla,equipo_id);`,
    );
  if (cols.some((c) => c.name === "nombre"))
    sql.push(
      `create index ${qi("game_" + t + "_search_idx")} on public.${qi("game_" + t)} using gin(to_tsvector('simple', coalesce(nombre,'')));`,
    );
}
for (const t of ["imports", ...tables]) {
  const table = "game_" + t;
  sql.push(
    `alter table public.${qi(table)} enable row level security; revoke all on public.${qi(table)} from anon,authenticated; grant select on public.${qi(table)} to anon,authenticated; create policy catalog_read on public.${qi(table)} for select to anon,authenticated using (${t === "imports" ? "status='ready'" : "exists(select 1 from public.game_imports where status='ready')"});`,
  );
}
// Party snapshots remain separate from the shared, immutable catalog.
sql.push(
  `create table public.party_plans (id uuid not null, user_id uuid not null references auth.users(id) on delete cascade, data jsonb not null check(jsonb_typeof(data)='object' and data->>'version'='2' and jsonb_typeof(data->'heroes')='array' and jsonb_array_length(data->'heroes') between 0 and 4), updated_at timestamptz not null default now(), primary key(user_id,id)); create index party_plans_user_updated_idx on public.party_plans(user_id,updated_at desc); alter table public.party_plans enable row level security; revoke all on public.party_plans from anon; grant select,insert,update,delete on public.party_plans to authenticated; create policy party_select on public.party_plans for select to authenticated using ((select auth.uid())=user_id); create policy party_insert on public.party_plans for insert to authenticated with check ((select auth.uid())=user_id); create policy party_update on public.party_plans for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id); create policy party_delete on public.party_plans for delete to authenticated using ((select auth.uid())=user_id);`,
);
writeFileSync(resolve(out, "schema.sql"), sql.join("\n"));
const counts = Object.fromEntries(tables.map((t) => [t, raw[t].length]));
const batches = [];
function batch(content) {
  const name = `batch-${String(batches.length).padStart(3, "0")}.sql`;
  writeFileSync(resolve(out, name), content);
  batches.push(name);
}
batch(
  `insert into public.game_imports(sha256,source,extracted_at,status,counts) values (${lit(sha)},${lit(raw.metadatos.find((m) => m.clave === "fuente")?.valor || source)},${lit(raw.metadatos.find((m) => m.clave === "extraido_el")?.valor)},'staged',${lit(JSON.stringify(counts))}::jsonb) on conflict(sha256) do nothing;`,
);
for (const t of tables) {
  const rows = raw[t];
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  const pk = db
    .prepare(`pragma table_info("${t}")`)
    .all()
    .find((c) => c.pk).name;
  let chunk = [];
  let size = 0;
  const flush = () => {
    if (!chunk.length) return;
    batch(
      `insert into public.${qi("game_" + t)} (${cols.map(qi).join(",")}) values\n${chunk.join(",\n")}\non conflict (${qi(pk)}) do update set ${cols
        .filter((c) => c !== pk)
        .map((c) => `${qi(c)}=excluded.${qi(c)}`)
        .join(",")};`,
    );
    chunk = [];
    size = 0;
  };
  for (const row of rows) {
    const text = "(" + cols.map((c) => lit(row[c])).join(",") + ")";
    if (size + text.length > 22000) flush();
    chunk.push(text);
    size += text.length;
  }
  flush();
}
const verify = tables
  .map((t) => `(select count(*)=${counts[t]} from public.${qi("game_" + t)})`)
  .join(" and ");
batch(
  `do $$ begin if not (${verify}) then raise exception 'Catalog counts do not match source'; end if; end $$; update public.game_imports set status='ready' where sha256=${lit(sha)};`,
);
const audit = {
  sha256: sha,
  source: raw.metadatos,
  counts,
  totalRows: Object.values(counts).reduce((a, b) => a + b, 0),
  batches,
  limitations: [
    "No per-character base stat progression table.",
    "Some conditional effects are prose; not automatically simulated.",
    "Equipment stats already contain display percentages, coded Rate values use hundredths.",
    "Armor quality has endpoints only; intermediate progression is not provided.",
  ],
};
writeFileSync(resolve(out, "manifest.json"), JSON.stringify(audit, null, 2));
writeFileSync(
  "public/catalog/manifest.json",
  JSON.stringify({ ...audit, batches: undefined }),
);
const common = [
  "personajes",
  "personaje_armas",
  "armas",
  "arma_grados",
  "arma_encantamientos",
  "arma_pasiva_niveles",
  "armaduras",
  "accesorios",
  "equipo_stats",
  "equipo_talento_niveles",
  "equipo_opciones_aleatorias",
  "conjuntos",
  "conjunto_bonos",
  "conjunto_piezas",
  "estadisticas",
  "elementos",
  "roles",
  "rarezas",
  "tipos_arma",
  "habilidades_combinadas",
];
writeFileSync(
  "public/catalog/catalog.json",
  JSON.stringify(Object.fromEntries(common.map((k) => [k, raw[k]]))),
);
for (const hero of raw.personajes) {
  const detail = Object.fromEntries(
    [
      "habilidades",
      "potenciales",
      "maestria_niveles",
      "maestria_subniveles",
      "maestria_ramas",
      "atuendos",
      "grabados",
      "trascendencias",
    ].map((k) => [
      k,
      k === "maestria_subniveles"
        ? raw[k].filter((r) =>
            raw.maestria_niveles.some(
              (m) => m.id === r.maestria_id && m.personaje === hero.slug,
            ),
          )
        : raw[k].filter((r) => r.personaje === hero.slug),
    ]),
  );
  detail.habilidad_efectos = raw.habilidad_efectos.filter((r) =>
    detail.habilidades.some((h) => h.id === r.habilidad_id),
  );
  writeFileSync(
    `public/catalog/heroes/${hero.slug}.json`,
    JSON.stringify(detail),
  );
}
writeFileSync(
  "supabase/catalog-audit.json",
  JSON.stringify({ ...audit, batches: undefined }, null, 2),
);
db.close();
console.log(
  JSON.stringify({
    tables: tables.length,
    rows: audit.totalRows,
    sha256: sha,
    batches: batches.length,
    counts,
  }),
);
