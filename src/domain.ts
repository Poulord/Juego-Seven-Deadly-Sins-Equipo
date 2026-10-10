export const slots = [
  "Arma",
  "Parte superior",
  "Parte inferior",
  "Cinturón",
  "Botas",
  "Anillo",
  "Collar",
  "Pendientes",
] as const;
export type Slot = (typeof slots)[number];
export const statLabels = {
  hp: "PV",
  attack: "Ataque",
  defense: "Defensa",
  crit: "Prob. crítica",
  critDamage: "Daño crítico",
  critResist: "Resistencia crítica",
  critDefense: "Defensa crítica",
  penetration: "Perforación",
  perseverance: "Perseverancia",
  breakResist: "Resistencia a roturas",
  burst: "Medidor de ráfaga",
  speed: "Velocidad",
};
export type Stat = keyof typeof statLabels;
export type Stats = Partial<Record<Stat, number>>;
export type Modifier = { stat: Stat; value: number; mode: "flat" | "percent" };
export type Kind =
  | "Personaje"
  | "Pieza"
  | "Conjunto"
  | "Grabado"
  | "Encantamiento";
export interface Entry {
  id: string;
  name: string;
  kind: Kind;
  slot?: Slot;
  quality: string;
  description: string;
  effect: string;
  source: string;
  stats: Stats;
  modifiers: Modifier[];
  setId?: string;
  thresholds: { count: number; effect: string; modifiers: Modifier[] }[];
}
export interface Piece {
  entry: Entry;
  engraving?: Entry;
  enchantment?: Entry;
}
export interface Team {
  id: string;
  name: string;
  character: Entry;
  boss: string;
  activity: string;
  tags: string[];
  notes: string;
  base: Stats;
  pieces: Partial<Record<Slot, Piece>>;
  sets: Entry[];
  updatedAt: string;
  favorite: boolean;
}
export const blankEntry = (kind: Kind = "Pieza"): Entry => ({
  id: crypto.randomUUID(),
  name: "",
  kind,
  slot: kind === "Pieza" ? "Arma" : undefined,
  quality: "Sin verificar",
  description: "",
  effect: "",
  source: "",
  stats: {},
  modifiers: [],
  thresholds: [],
});
export const blankTeam = (character: Entry): Team => ({
  id: crypto.randomUUID(),
  name: "Nuevo equipo",
  character: structuredClone(character),
  boss: "",
  activity: "Exploración",
  tags: [],
  notes: "",
  base: structuredClone(character.stats),
  pieces: {},
  sets: [],
  updatedAt: new Date().toISOString(),
  favorite: false,
});
export function duplicateTeam(team: Team): Team {
  return {
    ...structuredClone(team),
    id: crypto.randomUUID(),
    name: `${team.name} · copia`,
    updatedAt: new Date().toISOString(),
  };
}
export function equip(
  team: Team,
  slot: Slot,
  entry: Entry | undefined,
  catalog: Entry[],
): Team {
  const next = structuredClone(team);
  if (entry) {
    if (entry.kind !== "Pieza" || entry.slot !== slot)
      throw new Error("Pieza incompatible");
    next.pieces[slot] = { entry: structuredClone(entry) };
  } else delete next.pieces[slot];
  const ids = new Set(
    Object.values(next.pieces)
      .map((p) => p?.entry.setId)
      .filter(Boolean),
  );
  next.sets = [...ids]
    .map(
      (id) =>
        next.sets.find((s) => s.id === id) || catalog.find((s) => s.id === id),
    )
    .filter((s): s is Entry => !!s)
    .map((s) => structuredClone(s));
  return next;
}
export function calculate(team: Team) {
  const flat: Stats = { ...team.base };
  const pct: Stats = {};
  const effects: string[] = [];
  const add = (m: Modifier) => {
    const dst = m.mode === "flat" ? flat : pct;
    dst[m.stat] = (dst[m.stat] || 0) + m.value;
  };
  const counts: Record<string, number> = {};
  Object.values(team.pieces).forEach((piece) => {
    if (!piece) return;
    const e = piece.entry;
    if (e.setId) counts[e.setId] = (counts[e.setId] || 0) + 1;
    [e, piece.engraving, piece.enchantment].forEach((v) => {
      if (!v) return;
      Object.entries(v.stats).forEach(([s, value]) =>
        add({ stat: s as Stat, value: value!, mode: "flat" }),
      );
      v.modifiers.forEach(add);
      if (v.effect) effects.push(`${v.name}: ${v.effect}`);
    });
  });
  const bonuses = team.sets.flatMap((s) =>
    s.thresholds.map((t) => ({
      name: s.name,
      count: counts[s.id] || 0,
      threshold: t.count,
      effect: t.effect,
      active: (counts[s.id] || 0) >= t.count,
      modifiers: t.modifiers,
    })),
  );
  bonuses.filter((b) => b.active).forEach((b) => b.modifiers.forEach(add));
  const totals = Object.fromEntries(
    Object.keys(statLabels).map((key) => [
      key,
      Math.round(
        (flat[key as Stat] || 0) * (1 + (pct[key as Stat] || 0) / 100) * 100,
      ) / 100,
    ]),
  ) as Record<Stat, number>;
  return { totals, bonuses, effects };
}
export function matches(
  team: Team,
  query: string,
  character: string,
  activity: string,
) {
  return (
    (!character || team.character.id === character) &&
    (!activity || team.activity === activity) &&
    [team.name, team.character.name, team.boss, team.activity, ...team.tags]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase())
  );
}
export function isTeam(value: unknown): value is Team {
  if (!value || typeof value !== "object") return false;
  const t = value as Team;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    !!t.character &&
    typeof t.character.name === "string" &&
    !!t.pieces &&
    !!t.base &&
    Array.isArray(t.sets) &&
    Array.isArray(t.tags) &&
    typeof t.updatedAt === "string"
  );
}
