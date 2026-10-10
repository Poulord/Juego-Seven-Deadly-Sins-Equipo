import { describe, expect, it } from "vitest";
import {
  blankEntry,
  blankTeam,
  calculate,
  duplicateTeam,
  equip,
  matches,
} from "../src/domain";
import { demoData } from "../src/data";
describe("independent plans", () => {
  it("reuses a piece without mutating another team or the catalog", () => {
    const { catalog, teams } = demoData();
    const other = duplicateTeam(teams[0]);
    other.pieces.Arma!.entry.stats.attack = 9999;
    other.base.hp = 7;
    expect(teams[0].pieces.Arma!.entry.stats.attack).toBe(750);
    expect(catalog.find((e) => e.id === "demo-sword")!.stats.attack).toBe(750);
    expect(teams[0].base.hp).toBe(10000);
  });
  it("equips a snapshot and rejects incompatible slots", () => {
    const piece = { ...blankEntry(), name: "Sword", stats: { attack: 10 } };
    const team = blankTeam(blankEntry("Personaje"));
    const next = equip(team, "Arma", piece, []);
    piece.stats.attack = 500;
    expect(next.pieces.Arma!.entry.stats.attack).toBe(10);
    expect(team.pieces.Arma).toBeUndefined();
    expect(() => equip(team, "Botas", piece, [])).toThrow("incompatible");
  });
  it("applies active set thresholds exactly once and ignores inactive bonuses", () => {
    const { teams, catalog } = demoData();
    expect(calculate(teams[0]).totals.attack).toBe(3025);
    const removed = equip(teams[0], "Botas", undefined, catalog);
    expect(calculate(removed).totals.attack).toBe(2750);
    expect(calculate(removed).bonuses[0].active).toBe(false);
  });
  it("includes engraving and enchantment without evaluating conditional prose", () => {
    const { teams } = demoData();
    const t = teams[0];
    t.pieces.Arma!.engraving = {
      ...blankEntry("Grabado"),
      name: "Engraving",
      modifiers: [{ stat: "attack", mode: "flat", value: 100 }],
    };
    t.pieces.Arma!.enchantment = {
      ...blankEntry("Encantamiento"),
      name: "Enchant",
      modifiers: [{ stat: "attack", mode: "percent", value: 10 }],
      effect: "Conditional damage: not calculated",
    };
    expect(calculate(t).totals.attack).toBe(3420);
    expect(calculate(t).effects).toContain(
      "Enchant: Conditional damage: not calculated",
    );
  });
  it("keeps a saved set bonus when catalog is edited or deleted", () => {
    const { catalog, teams } = demoData();
    catalog.find((e) => e.id === "demo-set")!.thresholds[0].modifiers[0].value =
      90;
    expect(calculate(teams[0]).totals.attack).toBe(3025);
  });
  it("filters by character, activity, boss and tags", () => {
    const { teams } = demoData();
    expect(matches(teams[0], "tArAnIs", "", "Jefes")).toBe(true);
    expect(matches(teams[0], "Daño", teams[0].character.id, "")).toBe(true);
    expect(matches(teams[0], "", "", "Exploración")).toBe(false);
  });
});
