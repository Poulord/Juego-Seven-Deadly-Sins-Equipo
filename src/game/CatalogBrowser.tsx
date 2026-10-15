import { useState } from "react";
import type { Catalog, Character } from "./types";
import Portrait from "./Portrait";
import HeroInfo from "./HeroInfo";
import GameModal from "./Modal";
export default function CatalogBrowser({ catalog }: { catalog: Catalog }) {
  const [category, setCategory] = useState("Héroes"),
    [query, setQuery] = useState(""),
    [rarity, setRarity] = useState(""),
    [page, setPage] = useState(0);
  const [hero, setHero] = useState<Character | null>(null),
    [info, setInfo] = useState<{ name: string; text: string } | null>(null);
  const rows =
    category === "Héroes"
      ? catalog.personajes.map((c) => ({
          id: c.slug,
          name: c.nombre,
          rarity: c.rareza,
          image: c.imagen,
          subtitle: `${c.elemento_principal} · ${c.rol_principal}`,
          text: c.habilidad_aventura_desc,
          hero: c,
        }))
      : category === "Armas"
        ? catalog.armas.map((w) => ({
            id: String(w.id),
            name: w.nombre,
            rarity: w.rarezas,
            image: w.imagen,
            subtitle: w.tipo_arma,
            text: [
              w.descripcion,
              ...catalog.arma_grados
                .filter((g) => g.arma_id === w.id)
                .map(
                  (g) =>
                    `${g.rareza}: ATQ ${g.atq_base}–${g.atq_max}; ${g.substat || ""} ${g.substat_base ?? ""}–${g.substat_max ?? ""} (valores de origen)`,
                ),
              ...catalog.arma_pasiva_niveles
                .filter((p) => p.arma_id === w.id)
                .map((p) => `${p.rareza} · Nv. ${p.nivel}: ${p.descripcion}`),
            ].join("\n\n"),
          }))
        : category === "Conjuntos"
          ? catalog.conjuntos.map((s) => ({
              id: String(s.id),
              name: s.nombre,
              rarity: "",
              image: "",
              subtitle: `${s.piezas_total} piezas`,
              text: catalog.conjunto_bonos
                .filter((b) => b.conjunto_id === s.id)
                .map((b) => `${b.piezas} piezas: ${b.bonificacion}`)
                .join("\n\n"),
            }))
          : (category === "Accesorios"
              ? catalog.accesorios
              : catalog.armaduras
            ).map((g) => ({
              id: String(g.id),
              name: g.nombre,
              rarity: g.rareza,
              image: "",
              subtitle: `${g.ranura} · ${g.conjunto || "Sin conjunto"}`,
              text: [
                g.descripcion,
                `Calidad ${g.calidad_min}–${g.calidad_max}`,
                ...catalog.equipo_stats
                  .filter(
                    (s) =>
                      s.equipo_id === g.id &&
                      s.tabla ===
                        (category === "Accesorios"
                          ? "accesorios"
                          : "armaduras"),
                  )
                  .map(
                    (s) =>
                      `${s.stat_nombre}: ${s.valor_min_calidad}–${s.valor_max_calidad}${s.es_porcentaje ? "%" : ""}`,
                  ),
                ...catalog.equipo_talento_niveles
                  .filter(
                    (t) =>
                      t.equipo_id === g.id &&
                      t.tabla ===
                        (category === "Accesorios"
                          ? "accesorios"
                          : "armaduras"),
                  )
                  .map((t) => `${t.talento} Nv.${t.nivel}: ${t.descripcion}`),
              ].join("\n\n"),
            }));
  const filtered = rows.filter(
    (r) =>
      (!rarity || r.rarity.split(/[, /]+/).includes(rarity)) &&
      `${r.name} ${r.subtitle}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="catalog-view">
      <div className="game-page-title">
        <span className="game-kicker">ARCHIVO DE BRITANNIA</span>
        <h1>Conoce tu arsenal.</h1>
        <p>
          Catálogo compartido de solo lectura. Habilidades, grabados, maestrías
          y potenciales en la ficha de cada héroe.
        </p>
      </div>
      <div className="game-tabs">
        {["Héroes", "Armas", "Armaduras", "Accesorios", "Conjuntos"].map(
          (c) => (
            <button
              className={category === c ? "active" : ""}
              key={c}
              onClick={() => {
                setCategory(c);
                setPage(0);
                setQuery("");
              }}
            >
              {c}
            </button>
          ),
        )}
      </div>
      <div className="picker-toolbar">
        <input
          aria-label="Buscar catálogo"
          placeholder="Buscar en el catálogo…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <select
          aria-label="Rareza del catálogo"
          value={rarity}
          onChange={(e) => {
            setRarity(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todas las rarezas</option>
          <option>SSR</option>
          <option>SR</option>
          <option>R</option>
        </select>
        <span>{filtered.length} entradas</span>
      </div>
      <div className="game-catalog-grid">
        {filtered.slice(page * 36, page * 36 + 36).map((r) => (
          <button
            className="game-catalog-card"
            key={r.id}
            onClick={() =>
              "hero" in r
                ? setHero(r.hero as Character)
                : setInfo({ name: r.name, text: r.text })
            }
          >
            <div className="catalog-art">
              <Portrait src={r.image} name={r.name} />
              <span>{r.rarity}</span>
            </div>
            <h3>{r.name}</h3>
            <small>{r.subtitle}</small>
            <span className="view-reference">Consultar ficha →</span>
          </button>
        ))}
      </div>
      <div className="pagination">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>
          {page + 1} / {Math.max(1, Math.ceil(filtered.length / 36))}
        </span>
        <button
          disabled={(page + 1) * 36 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
      {hero && <HeroInfo hero={hero} onClose={() => setHero(null)} />}{" "}
      {info && (
        <GameModal title={info.name} onClose={() => setInfo(null)}>
          <p className="reference-prose">{info.text}</p>
        </GameModal>
      )}
    </section>
  );
}
