import type { Catalog, Equipped } from "./types";
import { numericOption } from "./catalog";
export default function PieceDetails({
  piece,
  catalog,
  onChange,
}: {
  piece: Equipped;
  catalog: Catalog;
  onChange: (p: Equipped) => void;
}) {
  const enchantments = catalog.arma_encantamientos.filter(
    (e) => e.arma_id === piece.sourceId && e.rareza === piece.rarity,
  );
  const options = catalog.equipo_opciones_aleatorias.filter(
    (o) => o.tabla === piece.sourceTable && o.equipo_id === piece.sourceId,
  );
  const talents = catalog.equipo_talento_niveles.filter(
    (t) => t.tabla === piece.sourceTable && t.equipo_id === piece.sourceId,
  );
  const passives = catalog.arma_pasiva_niveles.filter(
    (p) => p.arma_id === piece.sourceId && p.rareza === piece.rarity,
  );
  const gear =
    piece.sourceTable !== "armas"
      ? catalog[piece.sourceTable].find((g) => g.id === piece.sourceId)
      : undefined;
  const maxOptions = gear?.ranuras_opciones ?? 0;
  return (
    <div className="piece-adjustments">
      <h3>Mejoras de esta configuración</h3>
      {piece.sourceTable === "armas" ? (
        <>
          <label>
            Habilidad especial del arma
            <select
              aria-label="Nivel de pasiva"
              value={
                passives.find((p) => p.descripcion === piece.passive)?.id || ""
              }
              onChange={(e) =>
                onChange({
                  ...piece,
                  passive: passives.find((p) => p.id === Number(e.target.value))
                    ?.descripcion,
                })
              }
            >
              <option value="">Sin pasiva seleccionada</option>
              {passives.map((p) => (
                <option value={p.id} key={p.id}>
                  Nivel {p.nivel}
                </option>
              ))}
            </select>
          </label>
          {enchantments.length > 0 && (
            <>
              <label>
                Añadir encantamiento
                <select
                  aria-label="Añadir encantamiento"
                  value=""
                  disabled={piece.enchants.length >= 3}
                  onChange={(e) => {
                    const definition = enchantments.find(
                      (v) => v.id === Number(e.target.value),
                    );
                    if (definition)
                      onChange({
                        ...piece,
                        enchants: [
                          ...piece.enchants,
                          {
                            definition: structuredClone(definition),
                            value: definition.min,
                          },
                        ],
                      });
                  }}
                >
                  <option value="">Selecciona un atributo</option>
                  {enchantments
                    .filter(
                      (e) =>
                        !piece.enchants.some((x) => x.definition.id === e.id),
                    )
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.stat_nombre} · {e.rango_fmt}
                      </option>
                    ))}
                </select>
              </label>
              {piece.enchants.map((e, i) => (
                <label key={e.definition.id}>
                  {e.definition.stat_nombre} ({e.definition.rango_fmt})
                  <div className="roll-control">
                    <input
                      aria-label={`Valor ${e.definition.stat_nombre}`}
                      type="range"
                      min={
                        e.definition.min /
                        (/Rate/.test(e.definition.stat) ? 100 : 1)
                      }
                      max={
                        e.definition.max /
                        (/Rate/.test(e.definition.stat) ? 100 : 1)
                      }
                      step={/Rate/.test(e.definition.stat) ? 0.01 : 1}
                      value={
                        e.value / (/Rate/.test(e.definition.stat) ? 100 : 1)
                      }
                      onChange={(v) => {
                        const value = /Rate/.test(e.definition.stat)
                          ? Math.round(Number(v.target.value) * 100)
                          : Number(v.target.value);
                        if (
                          value >= e.definition.min &&
                          value <= e.definition.max
                        )
                          onChange({
                            ...piece,
                            enchants: piece.enchants.map((x, j) =>
                              j === i ? { ...x, value } : x,
                            ),
                          });
                      }}
                    />
                    <output>
                      {(
                        e.value / (/Rate/.test(e.definition.stat) ? 100 : 1)
                      ).toLocaleString("es-ES")}
                      {/Rate/.test(e.definition.stat) ? "%" : ""}
                    </output>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...piece,
                          enchants: piece.enchants.filter((_, j) => i !== j),
                        })
                      }
                    >
                      Quitar
                    </button>
                  </div>
                  <small>Selecciona el valor que aparece en tu pieza.</small>
                </label>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          {options.length > 0 && (
            <>
              <label>
                Atributos aleatorios{" "}
                {maxOptions
                  ? `(máx. ${maxOptions})`
                  : "(número de ranuras sin confirmar)"}
                <select
                  aria-label="Añadir atributo aleatorio"
                  value=""
                  disabled={!maxOptions || piece.options.length >= maxOptions}
                  onChange={(e) => {
                    const definition = options.find(
                      (v) => v.id === Number(e.target.value),
                    );
                    if (definition)
                      onChange({
                        ...piece,
                        options: [
                          ...piece.options,
                          {
                            definition: structuredClone(definition),
                            value: numericOption(definition.valor_min),
                          },
                        ],
                      });
                  }}
                >
                  <option value="">Seleccionar atributo</option>
                  {options
                    .filter(
                      (e) =>
                        !piece.options.some((o) => o.definition.id === e.id),
                    )
                    .map((o) => (
                      <option value={o.id} key={o.id}>
                        {o.stat_nombre} · {o.valor_min}–{o.valor_max}
                      </option>
                    ))}
                </select>
              </label>
              {piece.options.map((o, i) => (
                <label key={o.definition.id}>
                  {o.definition.stat_nombre}
                  <div className="roll-control">
                    <input
                      aria-label={`Atributo ${o.definition.stat_nombre}`}
                      type="number"
                      min={numericOption(o.definition.valor_min)}
                      max={numericOption(o.definition.valor_max)}
                      step="0.01"
                      value={o.value}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (
                          value >= numericOption(o.definition.valor_min) &&
                          value <= numericOption(o.definition.valor_max)
                        )
                          onChange({
                            ...piece,
                            options: piece.options.map((x, j) =>
                              i === j ? { ...x, value } : x,
                            ),
                          });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...piece,
                          options: piece.options.filter((_, j) => i !== j),
                        })
                      }
                    >
                      Quitar
                    </button>
                  </div>
                  <small>{o.definition.tiers}</small>
                </label>
              ))}
            </>
          )}
          {talents.length > 0 && (
            <label>
              Talento único
              <select
                value={piece.talent?.id || ""}
                onChange={(e) =>
                  onChange({
                    ...piece,
                    talent: structuredClone(
                      talents.find((t) => t.id === Number(e.target.value)),
                    ),
                  })
                }
              >
                <option value="">Sin talento activado</option>
                {talents.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.talento} · Nivel {t.nivel}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      {piece.passive && (
        <div className="passive-text">
          <b>Habilidad especial</b>
          <p>{piece.passive}</p>
        </div>
      )}
      {piece.talent && (
        <p className="passive-text">{piece.talent.descripcion}</p>
      )}
    </div>
  );
}
