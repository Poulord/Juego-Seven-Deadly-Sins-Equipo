import { useEffect, useState } from "react";
import { heroDetail } from "./catalog";
import type { Character, Detail } from "./types";
import GameModal from "./Modal";
import Portrait from "./Portrait";
export default function HeroInfo({
  hero,
  style,
  onClose,
}: {
  hero: Character;
  style?: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Habilidades");
  useEffect(() => {
    let valid = true;
    void heroDetail(hero.slug)
      .then((d) => {
        if (valid) setDetail(d);
      })
      .catch((e) => {
        if (valid) setError(e.message);
      });
    return () => {
      valid = false;
    };
  }, [hero.slug]);
  return (
    <GameModal wide title={`Información de ${hero.nombre}`} onClose={onClose}>
      <div className="hero-file">
        <Portrait src={hero.imagen} name={hero.nombre} />
        <div>
          <b>
            {hero.rareza} · {hero.elemento_principal} · {hero.rol_principal}
          </b>
          <p>
            {hero.habilidad_aventura}: {hero.habilidad_aventura_desc}
          </p>
          <small>
            Ficha de referencia de solo lectura. No contiene estadísticas base
            por nivel.
          </small>
        </div>
      </div>
      <div className="game-tabs">
        {[
          "Habilidades",
          "Grabados",
          "Potencial",
          "Maestría",
          "Trascendencia",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {!detail && !error ? (
        <p>Cargando ficha…</p>
      ) : (
        detail && (
          <div className="reference-scroll">
            {tab === "Habilidades" &&
              detail.habilidades
                .filter((s) => !style || s.tipo_arma === style)
                .map((s) => (
                  <article key={s.id}>
                    <small>
                      {s.tipo_arma} · {s.categoria}
                      {s.enfriamiento_s ? ` · ${s.enfriamiento_s} s` : ""}
                    </small>
                    <h3>{s.nombre}</h3>
                    <p>{s.descripcion || "Sin descripción en origen"}</p>
                  </article>
                ))}
            {tab === "Grabados" &&
              detail.grabados.map((g) => (
                <article key={g.id}>
                  <h3>
                    {g.atuendo} · Nivel {g.nivel}
                  </h3>
                  <p>{g.descripcion}</p>
                </article>
              ))}
            {tab === "Potencial" &&
              detail.potenciales
                .filter((p) => !style || p.tipo_arma === style)
                .map((p) => (
                  <article key={p.id}>
                    <h3>
                      {p.tipo_arma} · Nivel {p.nivel}
                    </h3>
                    <p>{p.bonificacion}</p>
                  </article>
                ))}
            {tab === "Maestría" &&
              detail.maestria_niveles
                .filter((m) => !style || m.tipo_arma === style)
                .map((m) => (
                  <article key={m.id}>
                    <h3>
                      {m.tipo_arma} · Nivel {m.nivel}
                    </h3>
                    <p>
                      {m.exp_requerida.toLocaleString("es-ES")} EXP ·{" "}
                      {m.coste_oro.toLocaleString("es-ES")} oro
                    </p>
                    {detail.maestria_subniveles
                      .filter((s) => s.maestria_id === m.id)
                      .map((s) => (
                        <p key={s.id}>
                          {s.stat_nombre}: {s.valor_fmt}
                        </p>
                      ))}
                    {detail.maestria_ramas
                      .filter(
                        (r) =>
                          r.tipo_arma === m.tipo_arma &&
                          r.nivel === m.nivel &&
                          r.stat_nombre,
                      )
                      .map((r) => (
                        <small key={r.id}>
                          {r.stat_nombre} {r.valor_fmt} · {r.aplicacion}
                          <br />
                        </small>
                      ))}
                  </article>
                ))}
            {tab === "Trascendencia" &&
              detail.trascendencias.map((t) => (
                <article key={t.id}>
                  <h3>
                    {t.armadura} · Nivel {t.nivel}
                  </h3>
                  <p>
                    {t.stat_nombre} {t.valor_fmt}
                  </p>
                  {t.pasiva_descripcion && <p>{t.pasiva_descripcion}</p>}
                </article>
              ))}
          </div>
        )
      )}
    </GameModal>
  );
}
