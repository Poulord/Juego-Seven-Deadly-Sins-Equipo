import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Catalog, Detail } from "../src/game/types";
import {
  activeBonuses,
  contributions,
  enchantValue,
  makeHero,
  optionValue,
  snapshotGear,
  snapshotWeapon,
  withPiece,
  combinedSkills,
  emptyPlan,
} from "../src/game/catalog";
const c = JSON.parse(
  readFileSync("public/catalog/catalog.json", "utf8"),
) as Catalog;
describe("real game catalog and snapshots", () => {
  it("contains all 28 heroes including 10 SR and every supplied main equipment record", () => {
    expect(c.personajes).toHaveLength(28);
    expect(c.personajes.filter((h) => h.rareza === "SR")).toHaveLength(10);
    expect(c.armas).toHaveLength(170);
    expect(c.armaduras).toHaveLength(281);
    expect(c.accesorios).toHaveLength(73);
    expect(c.estadisticas).toHaveLength(109);
    for (const hero of c.personajes)
      expect(
        c.personaje_armas.filter((s) => s.personaje === hero.slug),
      ).toHaveLength(3);
  });
  it("retains all 303 engraving levels in hero detail files", () => {
    const count = c.personajes.reduce(
      (sum, h) =>
        sum +
        (
          JSON.parse(
            readFileSync(`public/catalog/heroes/${h.slug}.json`, "utf8"),
          ) as Detail
        ).grabados.length,
      0,
    );
    expect(count).toBe(303);
  });
  it("converts coded Rate enchantments once, keeps gear display percentages unchanged", () => {
    const e = c.arma_encantamientos.find((e) => e.stat.includes("Rate"))!;
    expect(enchantValue(e, e.min)).toBe(e.min / 100);
    expect(() => enchantValue(e, e.max + 1)).toThrow();
    const stat = c.equipo_stats.find(
      (s) => s.es_porcentaje && s.tabla === "armaduras",
    )!;
    const gear = c.armaduras.find((g) => g.id === stat.equipo_id)!;
    expect(
      snapshotGear(c, gear, "armaduras", "max").stats.find(
        (s) => s.label === stat.stat_nombre,
      )?.value,
    ).toBe(stat.valor_max_calidad);
  });
  it("uses explicit endpoints and converts weapon secondary percentages without inventing intermediate values", () => {
    const g = c.arma_grados.find((g) => g.substat === "Daño crítico")!;
    const w = c.armas.find((w) => w.id === g.arma_id)!;
    expect(snapshotWeapon(c, w, g, "max").stats[1]).toEqual({
      label: g.substat,
      value: g.substat_max! / 100,
      percent: true,
    });
    expect(snapshotWeapon(c, w, g, "base").stats[0].value).toBe(g.atq_base);
  });
  it("preserves pieces, enchantments and bonuses when another plan or the catalog changes", () => {
    let h = makeHero(c, "meliodas");
    const g = c.armaduras.find(
      (g) => g.ranura === "Parte superior" && g.conjunto,
    )!;
    const piece = snapshotGear(c, g, "armaduras", "base");
    h = withPiece(h, piece, piece.slot, c);
    const copy = structuredClone(h);
    copy.pieces[piece.slot].stats[0].value = 999999;
    expect(h.pieces[piece.slot].stats[0].value).not.toBe(999999);
    const modified = structuredClone(c);
    modified.conjunto_bonos.forEach((b) => (b.bonificacion = "changed"));
    const untouched = withPiece(h, null, "Botas", modified);
    expect(untouched.bonuses[0].bonificacion).toBe(h.bonuses[0].bonificacion);
  });
  it("checks equipment compatibility and set thresholds by ID", () => {
    let h = makeHero(c, "meliodas");
    const bad = c.armas.find((w) => w.tipo_arma !== h.style.tipo_arma)!;
    const grade = c.arma_grados.find((g) => g.arma_id === bad.id)!;
    expect(() =>
      withPiece(h, snapshotWeapon(c, bad, grade, "base"), "Arma", c),
    ).toThrow("incompatible");
    const group = c.conjuntos.find(
      (s) =>
        c.armaduras.filter(
          (g) =>
            g.conjunto === s.nombre && g.ranura !== "Armadura ligada (grabado)",
        ).length >= 4,
    )!;
    for (const g of c.armaduras.filter(
      (g) =>
        g.conjunto === group.nombre && g.ranura !== "Armadura ligada (grabado)",
    ))
      h = withPiece(h, snapshotGear(c, g, "armaduras", "base"), g.ranura, c);
    for (const b of activeBonuses(h, c))
      expect(b.active).toBe(b.count >= b.piezas);
    expect(Object.keys(contributions(h).stats).length).toBeGreaterThan(0);
  });
  it("does not enable combined skills without their exact heroes and styles", () => {
    const skill = c.habilidades_combinadas.find((s) => !s.apoyo2_personaje)!;
    const p = emptyPlan("test");
    p.heroes = [skill.base_personaje, skill.apoyo1_personaje].map((slug) =>
      makeHero(c, slug),
    );
    p.heroes[0].style = c.personaje_armas.find(
      (s) =>
        s.personaje === skill.base_personaje && s.tipo_arma === skill.base_arma,
    )!;
    p.heroes[1].style = c.personaje_armas.find(
      (s) =>
        s.personaje === skill.apoyo1_personaje &&
        s.tipo_arma === skill.apoyo1_arma,
    )!;
    expect(combinedSkills(p, c).some((s) => s.id === skill.id)).toBe(true);
    p.heroes.pop();
    expect(combinedSkills(p, c).some((s) => s.id === skill.id)).toBe(false);
  });
});
