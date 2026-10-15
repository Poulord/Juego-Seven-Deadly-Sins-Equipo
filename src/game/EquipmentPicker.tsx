import { useState } from "react";
import { Search, Swords, Shield, Diamond } from "lucide-react";
import type { Catalog, Equipped, HeroPlan } from "./types";
import { snapshotGear, snapshotWeapon } from "./catalog";
import Portrait from "./Portrait";
import GameModal from "./Modal";
export default function EquipmentPicker({
  hero,
  slot,
  catalog,
  onSelect,
  onClose,
}: {
  hero: HeroPlan;
  slot: string;
  catalog: Catalog;
  onSelect: (p: Equipped) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("");
  const [scenario, setScenario] = useState<"base" | "max">("base");
  const weapon = slot === "Arma";
  const table = ["Anillo", "Collar", "Pendientes"].includes(slot)
    ? "accesorios"
    : "armaduras";
  const gear = catalog[table]
    .filter(
      (g) =>
        g.ranura === slot &&
        (!g.personajes ||
          g.personajes
            .split(",")
            .map((s) => s.trim())
            .includes(hero.character.nombre)),
    )
    .filter(
      (g) =>
        (!rarity || g.rareza === rarity) &&
        g.nombre.toLowerCase().includes(query.toLowerCase()),
    );
  const weapons = catalog.armas.filter(
    (w) =>
      w.tipo_arma === hero.style.tipo_arma &&
      catalog.arma_grados.some(
        (g) => g.arma_id === w.id && (!rarity || g.rareza === rarity),
      ) &&
      w.nombre.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <GameModal
      wide
      title={`Seleccionar ${slot.toLowerCase()}`}
      onClose={onClose}
    >
      <div className="picker-toolbar">
        <label className="game-search">
          <Search size={18} />
          <input
            autoFocus
            aria-label="Buscar pieza"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
          />
        </label>
        <label>
          Rareza
          <select
            aria-label="Rareza de pieza"
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
          >
            <option value="">Todas</option>
            {["SSR", "SR", "R", "N"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Valores de referencia
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as "base" | "max")}
          >
            <option value="base">Base / calidad mínima</option>
            <option value="max">Máximo / calidad máxima</option>
          </select>
        </label>
      </div>
      <p className="game-help">
        {weapon
          ? `${hero.character.nombre} · ${hero.style.tipo_arma}`
          : "Solo piezas compatibles con esta ranura y este héroe."}{" "}
        Los valores intermedios de mejora no se interpolan.
      </p>
      <div className="equipment-results">
        {weapon
          ? weapons.map((w) => (
              <article className="equipment-result" key={w.id}>
                <Portrait src={w.imagen} name={w.nombre} />
                <div>
                  <h3>{w.nombre}</h3>
                  <p>{w.pasiva || w.tipo_arma}</p>
                  <div className="grade-options">
                    {catalog.arma_grados
                      .filter(
                        (g) =>
                          g.arma_id === w.id &&
                          (!rarity || g.rareza === rarity),
                      )
                      .map((g) => (
                        <button
                          type="button"
                          key={g.id}
                          className="grade-button"
                          onClick={() =>
                            onSelect(snapshotWeapon(catalog, w, g, scenario))
                          }
                        >
                          {g.rareza} · ATQ{" "}
                          {scenario === "max" ? g.atq_max : g.atq_base}
                        </button>
                      ))}
                  </div>
                </div>
              </article>
            ))
          : gear.map((g) => (
              <button
                className="equipment-result gear-result"
                key={g.id}
                onClick={() =>
                  onSelect(snapshotGear(catalog, g, table, scenario))
                }
              >
                <div
                  className={`item-emblem ${g.rareza === "SSR" ? "gold" : ""}`}
                >
                  {slot.includes("Armadura") ? <Shield /> : <Diamond />}
                </div>
                <div>
                  <small>
                    {g.rareza} · Calidad {g.calidad_min}–{g.calidad_max}
                  </small>
                  <h3>{g.nombre}</h3>
                  <p>{g.conjunto || g.talento_unico || "Sin conjunto"}</p>
                </div>
                <span>＋</span>
              </button>
            ))}
        {!(weapon ? weapons.length : gear.length) && (
          <p>No hay piezas con estos filtros.</p>
        )}
      </div>
    </GameModal>
  );
}
