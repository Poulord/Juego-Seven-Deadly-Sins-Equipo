import { useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  blankEntry,
  calculate,
  equip,
  slots,
  statLabels,
  type Entry,
  type Modifier,
  type Stat,
  type Stats,
  type Team,
  type Slot,
} from "./domain";
export function StatFields({
  value,
  onChange,
}: {
  value: Stats;
  onChange: (s: Stats) => void;
}) {
  return (
    <div className="stat-fields">
      {Object.entries(statLabels).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            type="number"
            min="0"
            step="0.01"
            value={value[key as Stat] ?? ""}
            placeholder="0"
            onChange={(e) =>
              onChange({ ...value, [key]: Number(e.target.value) })
            }
          />
        </label>
      ))}
    </div>
  );
}
function Modifiers({
  value,
  onChange,
}: {
  value: Modifier[];
  onChange: (s: Modifier[]) => void;
}) {
  return (
    <div className="modifiers">
      {value.map((m, i) => (
        <div className="modifier" key={i}>
          <select
            aria-label="Estadística del modificador"
            value={m.stat}
            onChange={(e) =>
              onChange(
                value.map((v, j) =>
                  i === j ? { ...v, stat: e.target.value as Stat } : v,
                ),
              )
            }
          >
            {Object.entries(statLabels).map(([k, l]) => (
              <option value={k} key={k}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Tipo de modificador"
            value={m.mode}
            onChange={(e) =>
              onChange(
                value.map((v, j) =>
                  i === j
                    ? { ...v, mode: e.target.value as Modifier["mode"] }
                    : v,
                ),
              )
            }
          >
            <option value="flat">Valor fijo</option>
            <option value="percent">Porcentaje</option>
          </select>
          <input
            aria-label="Valor del modificador"
            type="number"
            step="0.01"
            value={m.value}
            onChange={(e) =>
              onChange(
                value.map((v, j) =>
                  i === j ? { ...v, value: Number(e.target.value) } : v,
                ),
              )
            }
          />
          <button
            type="button"
            className="icon-button"
            aria-label="Eliminar modificador"
            onClick={() => onChange(value.filter((_, j) => i !== j))}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="quiet"
        onClick={() =>
          onChange([...value, { stat: "attack", mode: "flat", value: 0 }])
        }
      >
        <Plus size={15} /> Añadir modificador
      </button>
    </div>
  );
}
export function EntryEditor({
  initial,
  catalog,
  onSave,
  onClose,
  busy,
}: {
  initial: Entry;
  catalog: Entry[];
  onSave: (e: Entry) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [entry, setEntry] = useState(structuredClone(initial));
  const update = (patch: Partial<Entry>) => setEntry({ ...entry, ...patch });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSave({ ...entry, name: entry.name.trim() });
  };
  return (
    <form onSubmit={submit} className="panel entry-editor">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CATÁLOGO PERSONAL</p>
          <h2>{initial.name ? "Editar entrada" : "Nueva entrada"}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Cerrar editor"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <div className="form-grid">
        <label>
          Nombre
          <input
            required
            maxLength={120}
            value={entry.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <label>
          Categoría
          <select
            value={entry.kind}
            onChange={(e) =>
              update({
                kind: e.target.value as Entry["kind"],
                slot: e.target.value === "Pieza" ? "Arma" : undefined,
              })
            }
          >
            {["Personaje", "Pieza", "Conjunto", "Grabado", "Encantamiento"].map(
              (k) => (
                <option key={k}>{k}</option>
              ),
            )}
          </select>
        </label>
        {entry.kind === "Pieza" && (
          <>
            <label>
              Ranura
              <select
                value={entry.slot}
                onChange={(e) => update({ slot: e.target.value as Slot })}
              >
                {slots.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Conjunto
              <select
                value={entry.setId || ""}
                onChange={(e) => update({ setId: e.target.value || undefined })}
              >
                <option value="">Sin conjunto</option>
                {catalog
                  .filter((c) => c.kind === "Conjunto")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
        <label>
          Calidad / rareza
          <input
            value={entry.quality}
            placeholder="SSR, grado 5…"
            onChange={(e) => update({ quality: e.target.value })}
          />
        </label>
        <label>
          Fuente o versión del juego
          <input
            value={entry.source}
            placeholder="Anotación manual o enlace"
            onChange={(e) => update({ source: e.target.value })}
          />
        </label>
        <label className="span-2">
          Descripción
          <textarea
            value={entry.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </label>
        <label className="span-2">
          Efecto / condición (texto)
          <textarea
            value={entry.effect}
            placeholder="Los efectos condicionales se muestran sin aplicarse automáticamente."
            onChange={(e) => update({ effect: e.target.value })}
          />
        </label>
      </div>
      <h3>Estadísticas fijas</h3>
      <StatFields value={entry.stats} onChange={(stats) => update({ stats })} />
      <h3>Modificadores</h3>
      <Modifiers
        value={entry.modifiers}
        onChange={(modifiers) => update({ modifiers })}
      />
      {entry.kind === "Conjunto" && (
        <>
          <h3>Bonificaciones de conjunto</h3>
          {entry.thresholds.map((t, i) => (
            <div className="threshold" key={i}>
              <div className="form-grid">
                <label>
                  Piezas necesarias
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={t.count}
                    onChange={(e) =>
                      update({
                        thresholds: entry.thresholds.map((v, j) =>
                          i === j ? { ...v, count: Number(e.target.value) } : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Efecto
                  <input
                    value={t.effect}
                    onChange={(e) =>
                      update({
                        thresholds: entry.thresholds.map((v, j) =>
                          i === j ? { ...v, effect: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <Modifiers
                value={t.modifiers}
                onChange={(modifiers) =>
                  update({
                    thresholds: entry.thresholds.map((v, j) =>
                      i === j ? { ...v, modifiers } : v,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="quiet danger"
                onClick={() =>
                  update({
                    thresholds: entry.thresholds.filter((_, j) => i !== j),
                  })
                }
              >
                <Trash2 size={14} /> Eliminar bonificación
              </button>
            </div>
          ))}
          <button
            className="quiet"
            type="button"
            onClick={() =>
              update({
                thresholds: [
                  ...entry.thresholds,
                  { count: 4, effect: "", modifiers: [] },
                ],
              })
            }
          >
            <Plus size={15} /> Añadir bonificación
          </button>
        </>
      )}
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancelar
        </button>
        <button disabled={busy || !entry.name.trim()} className="primary">
          Guardar entrada
        </button>
      </div>
    </form>
  );
}
export function TeamEditor({
  initial,
  catalog,
  onSave,
  onClose,
  busy,
}: {
  initial: Team;
  catalog: Entry[];
  onSave: (t: Team) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [team, setTeam] = useState(structuredClone(initial));
  const [active, setActive] = useState<Slot>("Arma");
  const update = (patch: Partial<Team>) => setTeam({ ...team, ...patch });
  const piece = team.pieces[active];
  const setAugment = (field: "engraving" | "enchantment", id: string) => {
    if (!piece) return;
    const entry = catalog.find((c) => c.id === id);
    update({
      pieces: {
        ...team.pieces,
        [active]: {
          ...piece,
          [field]: entry ? structuredClone(entry) : undefined,
        },
      },
    });
  };
  const result = calculate(team);
  return (
    <form
      className="editor-layout"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          ...team,
          name: team.name.trim(),
          updatedAt: new Date().toISOString(),
        });
      }}
    >
      <section>
        <div className="panel">
          <p className="eyebrow">TU PRÓXIMA ESTRATEGIA</p>
          <div className="section-heading">
            <h2>Configurar equipo</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Cerrar equipo"
              onClick={onClose}
            >
              <X />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Nombre del equipo
              <input
                required
                maxLength={120}
                value={team.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </label>
            <label>
              Personaje
              <select
                value={team.character.id}
                onChange={(e) => {
                  const c = catalog.find((v) => v.id === e.target.value);
                  if (c)
                    update({
                      character: structuredClone(c),
                      base: structuredClone(c.stats),
                    });
                }}
              >
                {!catalog.some((c) => c.id === team.character.id) && (
                  <option value={team.character.id}>
                    {team.character.name} (guardado)
                  </option>
                )}
                {catalog
                  .filter((c) => c.kind === "Personaje")
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Jefe o propósito
              <input
                value={team.boss}
                placeholder="Por ejemplo, Taranis"
                onChange={(e) => update({ boss: e.target.value })}
              />
            </label>
            <label>
              Actividad
              <input
                list="activities"
                value={team.activity}
                onChange={(e) => update({ activity: e.target.value })}
              />
              <datalist id="activities">
                {["Exploración", "Jefes", "Mazmorras", "Incursiones"].map(
                  (a) => (
                    <option key={a}>{a}</option>
                  ),
                )}
              </datalist>
            </label>
            <label className="span-2">
              Etiquetas (separadas por comas)
              <input
                value={team.tags.join(",")}
                onChange={(e) => update({ tags: e.target.value.split(",") })}
              />
            </label>
          </div>
        </div>
        <div className="panel">
          <h3>Ocho piezas. Un plan independiente.</h3>
          <p className="muted">
            Selecciona una ranura para equipar y ajustar sus mejoras.
          </p>
          <div className="slot-grid">
            {slots.map((s, i) => (
              <button
                type="button"
                key={s}
                className={`slot ${active === s ? "selected" : ""} ${team.pieces[s] ? "filled" : ""}`}
                onClick={() => setActive(s)}
              >
                <span className="slot-number">0{i + 1}</span>
                <span>{s}</span>
                <small>{team.pieces[s]?.entry.name || "Sin equipar"}</small>
              </button>
            ))}
          </div>
          <div className="piece-detail">
            <div className="section-heading">
              <h3>{active}</h3>
              {piece && (
                <button
                  className="quiet danger"
                  type="button"
                  onClick={() =>
                    setTeam(equip(team, active, undefined, catalog))
                  }
                >
                  Quitar pieza
                </button>
              )}
            </div>
            <label>
              Pieza del catálogo
              <select
                value={piece?.entry.id || ""}
                onChange={(e) =>
                  setTeam(
                    equip(
                      team,
                      active,
                      catalog.find((c) => c.id === e.target.value),
                      catalog,
                    ),
                  )
                }
              >
                <option value="">Sin equipar</option>
                {piece && !catalog.some((c) => c.id === piece.entry.id) && (
                  <option value={piece.entry.id}>
                    {piece.entry.name} (guardada)
                  </option>
                )}
                {catalog
                  .filter((c) => c.kind === "Pieza" && c.slot === active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.quality}
                    </option>
                  ))}
              </select>
            </label>
            {piece ? (
              <>
                <div className="form-grid">
                  {(["engraving", "enchantment"] as const).map((field, i) => (
                    <label key={field}>
                      {i === 0 ? "Grabado" : "Encantamiento"}
                      <select
                        value={piece[field]?.id || ""}
                        onChange={(e) => setAugment(field, e.target.value)}
                      >
                        <option value="">Sin mejora</option>
                        {piece[field] &&
                          !catalog.some((c) => c.id === piece[field]!.id) && (
                            <option value={piece[field]!.id}>
                              {piece[field]!.name} (guardado)
                            </option>
                          )}
                        {catalog
                          .filter(
                            (c) =>
                              c.kind ===
                              (i === 0 ? "Grabado" : "Encantamiento"),
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ))}
                </div>
                <details>
                  <summary>Ajustar estadísticas de esta pieza</summary>
                  <p className="muted">
                    Estos cambios solo se guardan en este equipo.
                  </p>
                  <StatFields
                    value={piece.entry.stats}
                    onChange={(stats) =>
                      update({
                        pieces: {
                          ...team.pieces,
                          [active]: {
                            ...piece,
                            entry: { ...piece.entry, stats },
                          },
                        },
                      })
                    }
                  />
                </details>
              </>
            ) : (
              <p className="muted">
                Añade piezas en Catálogo para seleccionarlas aquí.
              </p>
            )}
          </div>
        </div>
        <div className="panel">
          <details>
            <summary>Estadísticas base del personaje</summary>
            <p className="muted">
              Introduce valores sin equipamiento para evitar contarlos dos
              veces.
            </p>
            <StatFields
              value={team.base}
              onChange={(base) => update({ base })}
            />
          </details>
          <label className="notes">
            Notas de estrategia
            <textarea
              rows={4}
              value={team.notes}
              placeholder="Rotación, sinergias y decisiones de equipo…"
              onChange={(e) => update({ notes: e.target.value })}
            />
          </label>
        </div>
      </section>
      <aside className="panel summary-panel">
        <p className="eyebrow">RESULTADO DEL PLAN</p>
        <h2>{team.character.name}</h2>
        <p className="muted">
          {Object.keys(team.pieces).length} / 8 piezas equipadas
        </p>
        <StatsView team={team} />
        <h3>Bonificaciones de conjunto</h3>
        {result.bonuses.length ? (
          result.bonuses.map((b, i) => (
            <div key={i} className={`bonus ${b.active ? "active" : ""}`}>
              <b>
                {b.name} · {b.count}/{b.threshold}
              </b>
              <span>
                {b.effect || "Sin descripción"} {b.active ? "✓" : "· Inactiva"}
              </span>
            </div>
          ))
        ) : (
          <p className="muted">No hay conjuntos seleccionados.</p>
        )}
        {!!result.effects.length && (
          <>
            <h3>Efectos descritos</h3>
            {result.effects.map((e, i) => (
              <p className="muted" key={i}>
                {e}
              </p>
            ))}
          </>
        )}
        <p className="calculation-note">
          Estimación manual: (base + valores fijos) × (1 + porcentajes / 100).
          Los porcentajes de crítico introducidos como valores fijos son puntos
          porcentuales. No simula daño ni efectos condicionales del juego.
        </p>
        <button disabled={busy || !team.name.trim()} className="primary full">
          {busy ? "Guardando…" : "Guardar equipo"}
        </button>
        <button type="button" className="quiet full" onClick={onClose}>
          Cancelar
        </button>
      </aside>
    </form>
  );
}
export function StatsView({ team }: { team: Team }) {
  const { totals } = calculate(team);
  return (
    <div className="stats-list">
      {Object.entries(statLabels).map(([s, l]) => (
        <div key={s}>
          <span>{l}</span>
          <b>
            {totals[s as Stat].toLocaleString("es-ES")}
            {[
              "crit",
              "critDamage",
              "critResist",
              "critDefense",
              "penetration",
              "perseverance",
              "breakResist",
            ].includes(s)
              ? "%"
              : ""}
          </b>
        </div>
      ))}
    </div>
  );
}
