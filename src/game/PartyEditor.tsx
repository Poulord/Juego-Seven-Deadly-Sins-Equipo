import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  Diamond,
  Heart,
  Plus,
  Save,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  X,
} from "lucide-react";
import type { Catalog, Character, Detail, Equipped, PartyPlan } from "./types";
import {
  activeBonuses,
  combinedSkills,
  contributions,
  equipmentSlots,
  heroDetail,
  makeHero,
  withPiece,
} from "./catalog";
import Portrait from "./Portrait";
import GameModal from "./Modal";
import EquipmentPicker from "./EquipmentPicker";
import PieceDetails from "./PieceDetails";
import HeroInfo from "./HeroInfo";
export default function PartyEditor({
  initial,
  catalog,
  busy,
  onSave,
  onClose,
}: {
  initial: PartyPlan;
  catalog: Catalog;
  busy: boolean;
  onSave: (p: PartyPlan) => Promise<void>;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState(() => structuredClone(initial));
  const [active, setActive] = useState(0);
  const [picker, setPicker] = useState<number | null>(
    initial.heroes.length ? null : 0,
  );
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("");
  const [tab, setTab] = useState("Armas");
  const [slot, setSlot] = useState("Arma");
  const [equipment, setEquipment] = useState<string | null>(null);
  const [info, setInfo] = useState(false);
  const [summary, setSummary] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState("");
  const hero = plan.heroes[active];
  const piece = hero?.pieces[slot];
  useEffect(() => {
    setDetail(null);
    setDetailError("");
    if (!hero) return;
    let current = true;
    void heroDetail(hero.character.slug)
      .then((d) => {
        if (current) setDetail(d);
      })
      .catch((e) => {
        if (current) setDetailError(e.message);
      });
    return () => {
      current = false;
    };
  }, [hero?.character.slug]);
  const update = (patch: Partial<PartyPlan>) =>
    setPlan((p) => ({ ...p, ...patch }));
  const chooseHero = (c: Character) => {
    if (picker === null) return;
    const heroes = [...plan.heroes];
    heroes[picker] = makeHero(catalog, c.slug);
    update({ heroes });
    setActive(picker);
    setPicker(null);
    setQuery("");
    setSlot("Arma");
    setTab("Armas");
  };
  const equip = (p: Equipped) => {
    if (!hero) return;
    const heroes = plan.heroes.map((h, i) => {
      if (i !== active) return h;
      const next = withPiece(h, p, p.slot, catalog);
      if (
        p.slot === "Armadura ligada (grabado)" &&
        next.engraving?.atuendo !== p.name
      )
        delete next.engraving;
      return next;
    });
    update({ heroes });
    setSlot(p.slot);
    setEquipment(null);
  };
  const removePiece = () => {
    if (!hero) return;
    update({
      heroes: plan.heroes.map((h, i) =>
        i === active ? withPiece(h, null, slot, catalog) : h,
      ),
    });
  };
  const data = hero ? contributions(hero) : null;
  const bonuses = hero ? activeBonuses(hero, catalog) : [];
  const combined = combinedSkills(plan, catalog);
  const visibleSlots =
    tab === "Armas" ? ["Arma"] : equipmentSlots.filter((s) => s !== "Arma");
  const heroArt =
    detail?.atuendos.find((a) => a.id === hero?.engraving?.atuendo_id)
      ?.imagen || hero?.character.imagen;
  return (
    <section className="party-editor">
      <header className="formation-header">
        <button
          className="game-back"
          onClick={onClose}
          aria-label="Volver a equipos"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <span className="game-kicker">PREPARACIÓN DE LA AVENTURA</span>
          <input
            className="formation-name"
            aria-label="Nombre de formación"
            maxLength={120}
            value={plan.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="formation-heading-actions">
          <span>{plan.heroes.length} / 4 héroes</span>
          <button
            className="game-button light"
            onClick={() => setSummary(true)}
          >
            <BookOpen size={17} />
            Información de equipo
          </button>
          <button
            className="game-button blue"
            disabled={busy || !plan.name.trim() || !plan.heroes.length}
            onClick={() =>
              void onSave({
                ...plan,
                name: plan.name.trim(),
                updatedAt: new Date().toISOString(),
              })
            }
          >
            <Save size={17} />
            {busy ? "Guardando…" : "Guardar formación"}
          </button>
        </div>
      </header>
      <div className="hero-roster" aria-label="Héroes de la formación">
        {[0, 1, 2, 3].map((i) => {
          const h = plan.heroes[i];
          return h ? (
            <button
              className={`roster-chip ${active === i ? "active" : ""}`}
              key={h.character.slug}
              onClick={() => {
                setActive(i);
                setSlot("Arma");
                setTab("Armas");
              }}
            >
              <Portrait src={h.character.imagen} name={h.character.nombre} />
              <div>
                <b>{h.character.nombre}</b>
                <small>
                  {h.style.elemento} · {h.style.rol}
                </small>
              </div>
              <span>{h.character.rareza}</span>
            </button>
          ) : (
            <button
              key={i}
              className="roster-empty"
              onClick={() => {
                setPicker(plan.heroes.length);
                setQuery("");
              }}
            >
              <Plus size={24} />
              <span>Añadir héroe</span>
            </button>
          );
        })}
      </div>
      <div className="formation-workspace">
        <nav className="formation-nav">
          {[
            ["Información básica", BookOpen],
            ["Armas", Swords],
            ["Armadura", Shield],
            ["Grabados", Sparkles],
          ].map(([t, I]) => {
            const Icon = I as typeof BookOpen;
            return (
              <button
                key={String(t)}
                className={tab === t ? "active" : ""}
                onClick={() => {
                  setTab(String(t));
                  setSlot(t === "Armas" ? "Arma" : "Parte superior");
                }}
              >
                <Icon size={22} />
                <span>{String(t)}</span>
              </button>
            );
          })}
          <div className="formation-nav-bottom">
            <button disabled={!hero} onClick={() => setPicker(active)}>
              <Plus size={18} />
              Cambiar héroe
            </button>
            <button disabled={!hero} onClick={() => setInfo(true)}>
              <BookOpen size={18} />
              Consultar ficha
            </button>
            <button
              disabled={!hero}
              onClick={() => {
                update({ heroes: plan.heroes.filter((_, i) => i !== active) });
                setActive(0);
              }}
            >
              <Trash2 size={17} />
              Retirar del equipo
            </button>
          </div>
        </nav>
        <div className="hero-stage">
          <div className="stage-rune" />
          <div className="stage-sparks" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          {hero ? (
            <>
              <div className="hero-focus" key={hero.character.slug}>
                <span className="hero-rare">{hero.character.rareza}</span>
                <Portrait
                  className="hero-stage-portrait"
                  src={heroArt}
                  name={hero.character.nombre}
                />
                <h2>{hero.character.nombre}</h2>
                <span
                  className={`element-label element-${hero.style.elemento}`}
                >
                  ✦ {hero.style.elemento}
                </span>
                <p>{hero.style.rol}</p>
              </div>
              <label className="style-select">
                Estilo de combate
                <select
                  aria-label="Estilo de arma"
                  value={hero.style.id}
                  onChange={(e) => {
                    const style = catalog.personaje_armas.find(
                      (s) => s.id === Number(e.target.value),
                    );
                    if (style)
                      update({
                        heroes: plan.heroes.map((h, i) => {
                          if (i !== active) return h;
                          const pieces = { ...h.pieces };
                          delete pieces.Arma;
                          return {
                            ...h,
                            style: structuredClone(style),
                            pieces,
                          };
                        }),
                      });
                  }}
                >
                  {catalog.personaje_armas
                    .filter((s) => s.personaje === hero.character.slug)
                    .map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.tipo_arma} · {s.elemento} · {s.rol}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : (
            <div className="stage-empty">
              <Swords size={60} />
              <h2>Escribe tu próxima aventura</h2>
              <p>Elige hasta cuatro héroes y conserva cada estrategia.</p>
              <button className="game-button blue" onClick={() => setPicker(0)}>
                Elegir primer héroe
              </button>
            </div>
          )}
          <div className="stage-caption">
            FORMACIÓN INDEPENDIENTE <span>◆</span> CADA PIEZA PUEDE REUTILIZARSE
          </div>
        </div>
        <aside className="hero-equipment-panel">
          {!hero ? (
            <div className="game-empty">
              <p>Selecciona un héroe para comenzar.</p>
            </div>
          ) : (
            <>
              {tab === "Información básica" ? (
                <>
                  <div className="parchment-title">
                    <span>HÉROE SELECCIONADO</span>
                    <h2>{hero.character.nombre}</h2>
                    <small>
                      {hero.character.rareza} · {hero.style.elemento} ·{" "}
                      {hero.style.rol}
                    </small>
                  </div>
                  <div className="parchment-content">
                    <h3>{hero.character.habilidad_aventura}</h3>
                    <p>{hero.character.habilidad_aventura_desc}</p>
                    <button
                      className="game-button light"
                      onClick={() => setInfo(true)}
                    >
                      Ver habilidades, maestría y potencial
                    </button>
                    <h3>Aporte de las piezas</h3>
                    <StatRows stats={data!.stats} />
                    <p className="calculation-caveat">
                      La BD no incluye la progresión de estadísticas base del
                      héroe. Estos valores son aportes del equipo; no son sus
                      totales finales.
                    </p>
                  </div>
                </>
              ) : tab === "Grabados" ? (
                <>
                  <div className="parchment-title">
                    <span>ARMADURA LIGADA</span>
                    <h2>Grabados y efectos</h2>
                  </div>
                  <div className="parchment-content">
                    {detailError && <p role="alert">{detailError}</p>}
                    <label>
                      Grabado y nivel
                      <select
                        aria-label="Grabado del héroe"
                        value={hero.engraving?.id || ""}
                        onChange={(e) => {
                          const engraving = detail?.grabados.find(
                            (g) => g.id === Number(e.target.value),
                          );
                          update({
                            heroes: plan.heroes.map((h, i) =>
                              i === active
                                ? {
                                    ...h,
                                    engraving: engraving
                                      ? structuredClone(engraving)
                                      : undefined,
                                  }
                                : h,
                            ),
                          });
                        }}
                      >
                        <option value="">Sin grabado</option>
                        {detail?.grabados
                          .filter(
                            (g) =>
                              !hero.pieces["Armadura ligada (grabado)"] ||
                              g.atuendo ===
                                hero.pieces["Armadura ligada (grabado)"].name,
                          )
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.atuendo} · Nivel {g.nivel}
                            </option>
                          ))}
                      </select>
                    </label>
                    {hero.engraving && (
                      <div className="engraving-effect">
                        <Sparkles />
                        <h3>
                          {hero.engraving.atuendo} · Nivel{" "}
                          {hero.engraving.nivel}
                        </h3>
                        <p>{hero.engraving.descripcion}</p>
                      </div>
                    )}
                    <p className="calculation-caveat">
                      Los efectos condicionales se conservan como referencia y
                      no se añaden automáticamente a los valores estáticos.
                    </p>
                    <button
                      className="game-button light"
                      onClick={() => setEquipment("Armadura ligada (grabado)")}
                    >
                      Seleccionar armadura ligada
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="parchment-title">
                    <span>
                      {tab === "Armas"
                        ? hero.style.tipo_arma.toUpperCase()
                        : "EQUIPAMIENTO Y CONJUNTOS"}
                    </span>
                    <h2>{piece?.name || "Selecciona una pieza"}</h2>
                    <small>
                      {piece
                        ? `${piece.rarity} · Valores ${piece.scenario === "max" ? "máximos" : "base"}`
                        : "Catálogo de referencia · solo lectura"}
                    </small>
                  </div>
                  <div className="parchment-content">
                    <div className="equipment-slots">
                      {visibleSlots.map((s) => (
                        <button
                          key={s}
                          className={`diamond-slot ${slot === s ? "selected" : ""} ${hero.pieces[s] ? "equipped" : ""}`}
                          aria-label={`Ranura ${s}`}
                          onClick={() => {
                            setSlot(s);
                            if (!hero.pieces[s]) setEquipment(s);
                          }}
                        >
                          {hero.pieces[s]?.image ? (
                            <Portrait
                              src={hero.pieces[s].image}
                              name={hero.pieces[s].name}
                            />
                          ) : s === "Arma" ? (
                            <Swords />
                          ) : (
                            <Diamond />
                          )}
                          <small>
                            {s === "Armadura ligada (grabado)" ? "Grabado" : s}
                          </small>
                          <span>{hero.pieces[s]?.rarity || "＋"}</span>
                        </button>
                      ))}
                    </div>
                    {piece ? (
                      <>
                        <div className="selected-item-label">
                          <b>{piece.name}</b>
                          <span>{piece.setName || piece.rarity}</span>
                        </div>
                        <StatRows
                          stats={Object.fromEntries(
                            piece.stats.map((s) => [
                              s.label,
                              { value: s.value, percent: s.percent },
                            ]),
                          )}
                        />
                        <div className="equipment-actions">
                          <button
                            className="game-button dark"
                            onClick={() => setEquipment(slot)}
                          >
                            Cambiar
                          </button>
                          <button
                            className="game-button light"
                            onClick={removePiece}
                          >
                            Quitar
                          </button>
                        </div>
                        <PieceDetails
                          key={piece.key}
                          piece={piece}
                          catalog={catalog}
                          onChange={(p) =>
                            update({
                              heroes: plan.heroes.map((h, i) =>
                                i === active
                                  ? { ...h, pieces: { ...h.pieces, [slot]: p } }
                                  : h,
                              ),
                            })
                          }
                        />
                      </>
                    ) : (
                      <button
                        className="game-button blue full"
                        onClick={() => setEquipment(slot)}
                      >
                        <Plus size={17} />
                        Seleccionar {slot.toLowerCase()}
                      </button>
                    )}
                    {bonuses.length > 0 && (
                      <div className="set-bonuses">
                        <h3>Bonificaciones de conjunto</h3>
                        {bonuses.map((b) => (
                          <article
                            key={b.id}
                            className={b.active ? "active" : ""}
                          >
                            <b>
                              {b.active ? "✓" : "◇"} {b.name} [{b.count}/
                              {b.piezas}]
                            </b>
                            <p>{b.bonificacion}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </aside>
      </div>
      <details className="formation-notes">
        <summary>Propósito, etiquetas y notas de estrategia</summary>
        <div className="formation-meta">
          <label>
            Jefe / propósito
            <input
              value={plan.boss}
              onChange={(e) => update({ boss: e.target.value })}
              placeholder="Equipos para Taranis…"
            />
          </label>
          <label>
            Actividad
            <input
              list="party-activities"
              value={plan.activity}
              onChange={(e) => update({ activity: e.target.value })}
            />
            <datalist id="party-activities">
              <option>Exploración</option>
              <option>Jefes</option>
              <option>Mazmorras</option>
              <option>Incursiones</option>
            </datalist>
          </label>
          <label>
            Etiquetas
            <input
              value={plan.tags.join(",")}
              onChange={(e) => update({ tags: e.target.value.split(",") })}
            />
          </label>
        </div>
        <label>
          Notas
          <textarea
            value={plan.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Rotación, ataques combinados y decisiones…"
          />
        </label>
      </details>
      {picker !== null && (
        <GameModal
          wide
          title="Seleccionar héroe"
          onClose={() => setPicker(null)}
        >
          <div className="picker-toolbar">
            <label>
              Buscar héroe
              <input
                autoFocus
                aria-label="Buscar héroe"
                placeholder="Nombre del héroe…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              Rareza
              <select
                aria-label="Rareza del héroe"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
              >
                <option value="">Todas las rarezas</option>
                <option>SSR</option>
                <option>SR</option>
              </select>
            </label>
          </div>
          <div className="character-picker">
            {catalog.personajes
              .filter(
                (c) =>
                  (!rarity || c.rareza === rarity) &&
                  c.nombre
                    .toLocaleLowerCase()
                    .includes(query.toLocaleLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.slug}
                  disabled={plan.heroes.some(
                    (h, i) => i !== picker && h.character.slug === c.slug,
                  )}
                  className="character-choice"
                  onClick={() => chooseHero(c)}
                >
                  <Portrait src={c.imagen} name={c.nombre} />
                  <b>{c.nombre}</b>
                  <small>
                    {c.rareza} · {c.elemento_principal}
                  </small>
                </button>
              ))}
          </div>
        </GameModal>
      )}
      {equipment && hero && (
        <EquipmentPicker
          key={`${hero.character.slug}-${equipment}`}
          hero={hero}
          slot={equipment}
          catalog={catalog}
          onClose={() => setEquipment(null)}
          onSelect={equip}
        />
      )}{" "}
      {info && hero && (
        <HeroInfo
          hero={hero.character}
          style={hero.style.tipo_arma}
          onClose={() => setInfo(false)}
        />
      )}{" "}
      {summary && (
        <GameModal
          wide
          title="Información del equipo"
          onClose={() => setSummary(false)}
        >
          <div className="team-summary">
            {plan.heroes.map((h) => (
              <article key={h.character.slug}>
                <div className="summary-hero">
                  <Portrait
                    src={h.character.imagen}
                    name={h.character.nombre}
                  />
                  <div>
                    <h3>{h.character.nombre}</h3>
                    <small>
                      {h.style.tipo_arma} · {h.style.elemento}
                    </small>
                  </div>
                </div>
                <StatRows stats={contributions(h).stats} />
                {h.engraving && (
                  <p>
                    {h.engraving.atuendo} · Nivel {h.engraving.nivel}
                  </p>
                )}
                <small>
                  {Object.keys(h.pieces).length} piezas seleccionadas
                </small>
              </article>
            ))}
          </div>
          <h3>Ataques combinados disponibles</h3>
          {combined.length ? (
            combined.map((s) => (
              <div className="combined-skill" key={s.id}>
                <b>
                  {s.base_habilidad} + {s.apoyo1_habilidad}
                  {s.apoyo2_habilidad ? ` + ${s.apoyo2_habilidad}` : ""}
                </b>
                <p>
                  {s.elemento} · {s.dano} · {s.categoria}
                </p>
              </div>
            ))
          ) : (
            <p>
              Esta formación y estos estilos no coinciden con una combinación
              registrada.
            </p>
          )}
          <p className="game-help">
            Se muestran aportes de equipamiento por héroe. No se suman
            porcentajes entre héroes ni se inventa un poder de combate. Las
            bonificaciones y efectos condicionales se consultan en cada ficha.
          </p>
        </GameModal>
      )}
    </section>
  );
}
export function StatRows({
  stats,
}: {
  stats: Record<string, { value: number; percent: boolean }>;
}) {
  const rows = Object.entries(stats);
  return rows.length ? (
    <div className="game-stat-rows">
      {rows.map(([label, s]) => (
        <div key={label}>
          <span>{label.replace(" (%)", "")}</span>
          <b>
            {s.value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}
            {s.percent ? "%" : ""}
          </b>
        </div>
      ))}
    </div>
  ) : (
    <p className="game-help">Sin estadísticas de piezas seleccionadas.</p>
  );
}
