import { blankEntry, blankTeam, equip, type Entry, type Team } from "./domain";
export function initialCatalog(): Entry[] {
  return [
    "Meliodas",
    "Tristan",
    "Ban",
    "Diane",
    "King",
    "Elizabeth",
    "Merlín",
    "Escanor",
    "Gowther",
    "Lancelot",
  ].map((name) => ({
    ...blankEntry("Personaje"),
    id: `character-${name}`,
    name,
    source: "https://7dsorigin.app/es/personajes",
    description:
      "Introduce las estadísticas de tu personaje y su estilo de arma. Valores pendientes de revisión.",
  }));
}
export function demoData() {
  const catalog = initialCatalog();
  const set = {
    ...blankEntry("Conjunto"),
    id: "demo-set",
    name: "Conjunto de práctica",
    quality: "Ejemplo",
    thresholds: [
      {
        count: 4,
        effect: "Ataque +10% (ejemplo ficticio)",
        modifiers: [
          { stat: "attack" as const, mode: "percent" as const, value: 10 },
        ],
      },
    ],
  };
  catalog.push(set);
  const weapon = {
    ...blankEntry(),
    id: "demo-sword",
    name: "Espada de práctica",
    quality: "Ejemplo",
    stats: { attack: 750 },
    description: "Pieza ficticia para probar el planificador.",
  };
  catalog.push(weapon);
  ["Parte superior", "Parte inferior", "Cinturón", "Botas"].forEach((slot, i) =>
    catalog.push({
      ...blankEntry(),
      id: `demo-armor-${i}`,
      name: `${slot} de práctica`,
      slot: slot as Entry["slot"],
      quality: "Ejemplo",
      setId: set.id,
      stats: { defense: 100, hp: 500 },
    }),
  );
  let t: Team = {
    ...blankTeam(catalog[0]),
    name: "Asalto a Taranis",
    boss: "Taranis",
    activity: "Jefes",
    tags: ["Ejemplo", "Daño"],
    notes:
      "Datos ficticios. Sustituye las piezas y estadísticas por las de tu cuenta.",
    base: { attack: 2000, hp: 10000, defense: 500, crit: 20, critDamage: 150 },
    favorite: true,
  };
  catalog
    .filter((e) => e.kind === "Pieza")
    .forEach((e) => (t = equip(t, e.slot!, e, catalog)));
  const second = structuredClone(t);
  second.id = crypto.randomUUID();
  second.name = "Explorador de Britannia";
  second.character = structuredClone(catalog[1]);
  second.activity = "Exploración";
  second.boss = "";
  second.tags = ["Ejemplo", "Supervivencia"];
  second.base.hp = 15000;
  second.base.attack = 1500;
  second.favorite = false;
  return { catalog, teams: [t, second] };
}
