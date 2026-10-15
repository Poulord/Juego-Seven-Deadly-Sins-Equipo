import { supabase } from "../backend";
import type {
  Catalog,
  CatalogManifest,
  Detail,
  Enchant,
  Equipped,
  Gear,
  HeroPlan,
  PartyPlan,
  RandomOption,
  Weapon,
  WeaponGrade,
} from "./types";
export const equipmentSlots = [
  "Arma",
  "Armadura ligada (grabado)",
  "Parte superior",
  "Parte inferior",
  "Cinturón",
  "Botas",
  "Anillo",
  "Collar",
  "Pendientes",
];
export const emptyPlan = (version: string): PartyPlan => ({
  version: 2,
  id: crypto.randomUUID(),
  name: "Nueva formación",
  boss: "",
  activity: "Exploración",
  tags: [],
  notes: "",
  favorite: false,
  catalogVersion: version,
  heroes: [],
  updatedAt: new Date().toISOString(),
});
export async function loadCatalog(): Promise<{
  catalog: Catalog;
  manifest: CatalogManifest;
}> {
  const [c, m] = await Promise.all([
    fetch("/catalog/catalog.json"),
    fetch("/catalog/manifest.json"),
  ]);
  if (!c.ok || !m.ok)
    throw new Error("No se pudo cargar el catálogo del juego");
  const localCatalog: Catalog = await c.json();
  const manifest: CatalogManifest = await m.json();
  if (!supabase) return { catalog: localCatalog, manifest };
  const { data, error } = await supabase
    .from("game_imports")
    .select("sha256")
    .eq("status", "ready")
    .order("imported_at", { ascending: false })
    .limit(1);
  if (error)
    throw new Error(
      `No se pudo consultar el catálogo de Supabase: ${error.message}`,
    );
  if (data[0]?.sha256 !== manifest.sha256)
    throw new Error(
      "La versión del catálogo remoto no coincide con esta aplicación. Actualiza los archivos del catálogo.",
    );
  const entries = await Promise.all(
    Object.keys(localCatalog).map(
      async (name) => [name, await readRemote(name)] as const,
    ),
  );
  return {
    catalog: Object.fromEntries(entries) as unknown as Catalog,
    manifest,
  };
}
async function readRemote(
  name: string,
  column?: string,
  value?: string | number,
): Promise<unknown[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const all: unknown[] = [];
  for (let start = 0; ; start += 500) {
    let query = supabase
      .from(`game_${name}`)
      .select("*")
      .order(
        name === "personajes"
          ? "slug"
          : name === "estadisticas" ||
              name === "elementos" ||
              name === "roles" ||
              name === "rarezas" ||
              name === "tipos_arma"
            ? "codigo"
            : "id",
      )
      .range(start, start + 499);
    if (column) query = query.eq(column, value!);
    const { data, error } = await query;
    if (error) throw error;
    all.push(...data);
    if (data.length < 500) return all;
  }
}
async function loadDetail(slug: string): Promise<Detail> {
  if (!supabase) {
    const response = await fetch(
      `/catalog/heroes/${encodeURIComponent(slug)}.json`,
    );
    if (!response.ok) throw new Error("No se pudo cargar la ficha del héroe");
    return response.json();
  }
  const names = [
    "habilidades",
    "grabados",
    "potenciales",
    "maestria_niveles",
    "maestria_ramas",
    "atuendos",
    "trascendencias",
  ];
  const values = await Promise.all(
    names.map(
      async (n) => [n, await readRemote(n, "personaje", slug)] as const,
    ),
  );
  const detail = Object.fromEntries(values) as unknown as Detail;
  const ids = detail.maestria_niveles.map((m) => m.id);
  const { data, error } = await supabase
    .from("game_maestria_subniveles")
    .select("*")
    .in("maestria_id", ids)
    .order("id");
  if (error) throw error;
  detail.maestria_subniveles = data;
  return detail;
}
const detailCache = new Map<string, Promise<Detail>>();
export function heroDetail(slug: string) {
  if (!detailCache.has(slug))
    detailCache.set(
      slug,
      loadDetail(slug).catch((e) => {
        detailCache.delete(slug);
        throw e;
      }),
    );
  return detailCache.get(slug)!;
}
export function safeImage(url?: string) {
  try {
    const u = new URL(url || "");
    return u.protocol === "https:" && u.hostname === "7dsorigin.app"
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function makeHero(catalog: Catalog, slug: string): HeroPlan {
  const c = catalog.personajes.find((c) => c.slug === slug),
    s = catalog.personaje_armas.find((s) => s.personaje === slug);
  if (!c || !s) throw new Error("Personaje sin estilo de arma");
  return {
    character: structuredClone(c),
    style: structuredClone(s),
    pieces: {},
    bonuses: [],
  };
}
export function snapshotWeapon(
  c: Catalog,
  w: Weapon,
  g: WeaponGrade,
  scenario: "base" | "max",
): Equipped {
  const sub = scenario === "max" ? g.substat_max : g.substat_base;
  const stat = c.estadisticas.find(
    (s) => s.nombre === g.substat && s.codigo.includes("_"),
  );
  const percent = !!stat?.es_porcentaje;
  return {
    key: `weapon-${w.id}-${g.id}`,
    sourceTable: "armas",
    sourceId: w.id,
    name: w.nombre,
    slot: "Arma",
    image: safeImage(w.imagen),
    rarity: g.rareza,
    scenario,
    gradeId: g.id,
    stats: [
      {
        label: "Ataque de equipo",
        value: (scenario === "max" ? g.atq_max : g.atq_base) || 0,
        percent: false,
      },
      ...(g.substat && sub != null
        ? [{ label: g.substat, value: percent ? sub / 100 : sub, percent }]
        : []),
    ],
    passive:
      c.arma_pasiva_niveles.find(
        (p) => p.arma_id === w.id && p.rareza === g.rareza && p.nivel === 1,
      )?.descripcion || w.pasiva_descripcion,
    enchants: [],
    options: [],
  };
}
export function snapshotGear(
  c: Catalog,
  g: Gear,
  table: "armaduras" | "accesorios",
  scenario: "base" | "max",
): Equipped {
  return {
    key: `${table}-${g.id}`,
    sourceTable: table,
    sourceId: g.id,
    name: g.nombre,
    slot: g.ranura,
    image: "",
    rarity: g.rareza,
    scenario,
    setName: g.conjunto || undefined,
    setId: c.conjuntos.find((s) => s.nombre === g.conjunto)?.id,
    stats: c.equipo_stats
      .filter((s) => s.tabla === table && s.equipo_id === g.id)
      .map((s) => ({
        label: s.stat_nombre,
        value: scenario === "max" ? s.valor_max_calidad : s.valor_min_calidad,
        percent: !!s.es_porcentaje,
      })),
    enchants: [],
    options: [],
  };
}
export function withPiece(
  hero: HeroPlan,
  piece: Equipped | null,
  slot: string,
  c: Catalog,
): HeroPlan {
  const next = structuredClone(hero);
  if (piece) {
    if (piece.slot !== slot) throw new Error("Ranura incompatible");
    if (slot === "Arma") {
      const w = c.armas.find((w) => w.id === piece.sourceId);
      if (!w || w.tipo_arma !== hero.style.tipo_arma)
        throw new Error("Arma incompatible con el estilo");
    }
    next.pieces[slot] = structuredClone(piece);
  } else delete next.pieces[slot];
  const ids = new Set(Object.values(next.pieces).map((p) => p.setId));
  const preserved = next.bonuses.filter((b) => ids.has(b.conjunto_id));
  next.bonuses = [
    ...preserved,
    ...c.conjunto_bonos
      .filter(
        (b) =>
          ids.has(b.conjunto_id) && !preserved.some((old) => old.id === b.id),
      )
      .map((b) => structuredClone(b)),
  ];
  return next;
}
export function numericOption(text: string) {
  return Number(text.replace(/[^\d.,-]/g, "").replace(",", "."));
}
export function enchantValue(e: Enchant, value: number) {
  if (!Number.isFinite(value) || value < e.min || value > e.max)
    throw new Error("Encantamiento fuera del rango del catálogo");
  return /Rate/.test(e.stat) ? value / 100 : value;
}
export function optionValue(d: RandomOption, v: number) {
  const min = numericOption(d.valor_min),
    max = numericOption(d.valor_max);
  if (!Number.isFinite(v) || v < min || v > max)
    throw new Error("Atributo fuera del rango del catálogo");
  return v;
}
export function contributions(hero: HeroPlan) {
  const result: Record<string, { value: number; percent: boolean }> = {};
  const effects: string[] = [];
  const add = (label: string, value: number, percent: boolean) => {
    const key = label + (percent ? " (%)" : "");
    result[key] = { value: (result[key]?.value || 0) + value, percent };
  };
  for (const p of Object.values(hero.pieces)) {
    for (const s of p.stats) add(s.label, s.value, s.percent);
    for (const e of p.enchants)
      add(
        e.definition.stat_nombre,
        enchantValue(e.definition, e.value),
        /Rate/.test(e.definition.stat),
      );
    for (const o of p.options)
      add(
        o.definition.stat_nombre,
        optionValue(o.definition, o.value),
        o.definition.valor_max.includes("%"),
      );
    if (p.passive) effects.push(p.passive);
    if (p.talent) effects.push(p.talent.descripcion);
  }
  return { stats: result, effects };
}
export function activeBonuses(hero: HeroPlan, c: Catalog) {
  return hero.bonuses.map((b) => {
    const name =
      Object.values(hero.pieces).find((p) => p.setId === b.conjunto_id)
        ?.setName ||
      c.conjuntos.find((s) => s.id === b.conjunto_id)?.nombre ||
      "";
    const count = Object.values(hero.pieces).filter(
      (p) => p.setId === b.conjunto_id,
    ).length;
    return { ...b, name, count, active: count >= b.piezas };
  });
}
export function combinedSkills(plan: PartyPlan, c: Catalog) {
  return c.habilidades_combinadas.filter((s) => {
    const needs = [
      [s.base_personaje, s.base_arma],
      [s.apoyo1_personaje, s.apoyo1_arma],
      ...(s.apoyo2_personaje ? [[s.apoyo2_personaje, s.apoyo2_arma]] : []),
    ];
    return needs.every(([slug, weapon]) =>
      plan.heroes.some(
        (h) => h.character.slug === slug && h.style.tipo_arma === weapon,
      ),
    );
  });
}
