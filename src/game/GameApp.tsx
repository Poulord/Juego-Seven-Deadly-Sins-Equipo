import { useEffect, useState, type FormEvent } from "react";
import {
  BookOpen,
  ChevronRight,
  Copy,
  Download,
  GitCompareArrows,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Swords,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Catalog, CatalogManifest, PartyPlan } from "./types";
import { emptyPlan, loadCatalog, contributions } from "./catalog";
import { usePlans } from "./session";
import { supabase } from "../backend";
import Portrait from "./Portrait";
import GameModal from "./Modal";
import PartyEditor, { StatRows } from "./PartyEditor";
import CatalogBrowser from "./CatalogBrowser";
import "./game.css";
export default function GameApp() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [manifest, setManifest] = useState<CatalogManifest | null>(null),
    [failure, setFailure] = useState(""),
    [notice, setNotice] = useState(""),
    [view, setView] = useState("Formaciones"),
    [editing, setEditing] = useState<PartyPlan | null>(null),
    [auth, setAuth] = useState(false),
    [register, setRegister] = useState(false),
    [authBusy, setAuthBusy] = useState(false),
    [query, setQuery] = useState(""),
    [filterHero, setFilterHero] = useState(""),
    [activity, setActivity] = useState(""),
    [favorite, setFavorite] = useState(false),
    [compared, setCompared] = useState<string[]>([]),
    [deleting, setDeleting] = useState<PartyPlan | null>(null);
  const plans = usePlans();
  useEffect(() => {
    let current = true;
    void loadCatalog()
      .then((d) => {
        if (current) {
          setCatalog(d.catalog);
          setManifest(d.manifest);
        }
      })
      .catch((e) => {
        if (current) setFailure(e.message);
      });
    return () => {
      current = false;
    };
  }, []);
  useEffect(() => {
    setEditing(null);
    setCompared([]);
    setDeleting(null);
    setNotice("");
  }, [plans.user?.id]);
  async function action(fn: () => Promise<void>) {
    setFailure("");
    try {
      await fn();
    } catch (e) {
      setFailure(
        e instanceof Error ? e.message : "No se pudo completar la operación",
      );
    }
  }
  async function save(p: PartyPlan) {
    await action(async () => {
      await plans.save(p);
      setEditing(null);
      setNotice(
        "Formación guardada. Todas sus piezas se conservan de forma independiente.",
      );
    });
  }
  async function authenticate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const data = new FormData(e.currentTarget);
    setAuthBusy(true);
    await action(async () => {
      const input = {
        email: String(data.get("email")),
        password: String(data.get("password")),
      };
      const result = register
        ? await supabase!.auth.signUp({
            ...input,
            options: { emailRedirectTo: location.origin },
          })
        : await supabase!.auth.signInWithPassword(input);
      if (result.error) throw result.error;
      setAuth(false);
      setNotice(
        register && !result.data.session
          ? "Confirma tu cuenta desde el correo electrónico."
          : "Sesión iniciada.",
      );
    });
    setAuthBusy(false);
  }
  const visible = plans.plans.filter(
    (p) =>
      (!filterHero || p.heroes.some((h) => h.character.slug === filterHero)) &&
      (!activity || p.activity === activity) &&
      (!favorite || p.favorite) &&
      `${p.name} ${p.boss} ${p.tags.join(" ")} ${p.heroes.map((h) => h.character.nombre).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selected = plans.plans.filter((p) => compared.includes(p.id));
  function exportPlans() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 2, plans: plans.plans }, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "origin-forge-formaciones.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="game-app">
      <div className="game-ambient" aria-hidden="true" />
      <header className="game-topbar">
        <a href="/" className="game-brand">
          <span>
            <Swords />
          </span>
          <div>
            ORIGIN <b>FORGE</b>
            <small>EL ARCHIVO DE TUS AVENTURAS</small>
          </div>
        </a>
        <nav>
          {[
            ["Formaciones", Swords],
            ["Catálogo", BookOpen],
            ["Comparador", GitCompareArrows],
          ].map(([name, I]) => {
            const Icon = I as typeof Swords;
            return (
              <button
                className={view === name ? "active" : ""}
                key={String(name)}
                onClick={() => {
                  setView(String(name));
                  setEditing(null);
                }}
              >
                <Icon size={17} />
                {String(name)}
              </button>
            );
          })}
        </nav>
        <div className="game-account">
          <span className="connection-light" />
          <span>{plans.user ? "Espacio privado" : "Modo local"}</span>
          <button
            aria-label={plans.user ? "Cerrar sesión" : "Conectar cuenta"}
            disabled={plans.busy || authBusy}
            onClick={() =>
              plans.user
                ? void action(async () => {
                    const { error } = await supabase!.auth.signOut();
                    if (error) throw error;
                  })
                : setAuth(true)
            }
          >
            {plans.user ? <LogOut size={19} /> : <UserRound size={19} />}
          </button>
        </div>
      </header>
      <main className="game-main">
        {(failure || plans.error) && (
          <div className="game-alert error" role="alert">
            {failure || plans.error}
            <button
              onClick={() => {
                setFailure("");
                if (plans.error) location.reload();
              }}
            >
              Cerrar / reintentar
            </button>
          </div>
        )}
        {notice && (
          <div className="game-alert" role="status">
            {notice}
            <button onClick={() => setNotice("")}>Cerrar</button>
          </div>
        )}
        {!catalog || !manifest ? (
          <section className="game-loading">
            <Swords />
            <h1>
              {failure
                ? "No se pudo abrir el archivo"
                : "Abriendo el archivo de Britannia…"}
            </h1>
            {failure && (
              <button onClick={() => location.reload()}>Reintentar</button>
            )}
          </section>
        ) : editing ? (
          <PartyEditor
            key={editing.id}
            initial={editing}
            catalog={catalog}
            busy={plans.busy}
            onSave={save}
            onClose={() => setEditing(null)}
          />
        ) : view === "Catálogo" ? (
          <CatalogBrowser catalog={catalog} />
        ) : view === "Comparador" ? (
          <>
            <div className="game-page-title">
              <span className="game-kicker">CADA DECISIÓN CUENTA</span>
              <h1>Frente a frente.</h1>
              <p>
                Compara hasta tres formaciones con el desglose de cada héroe.
              </p>
            </div>
            <div className="comparison-selectors">
              {[0, 1, 2].map((i) => (
                <label key={i}>
                  Formación {i + 1}
                  <select
                    value={compared[i] || ""}
                    onChange={(e) => {
                      const next = [...compared];
                      next[i] = e.target.value;
                      setCompared(next.filter(Boolean));
                    }}
                  >
                    <option value="">Elegir formación</option>
                    {plans.plans
                      .filter(
                        (p) => !compared.includes(p.id) || p.id === compared[i],
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="party-comparison">
              {selected.map((p) => (
                <article key={p.id}>
                  <h2>{p.name}</h2>
                  <small>
                    {p.activity} · {p.boss || "Sin jefe"}
                  </small>
                  {p.heroes.map((h) => (
                    <div className="compare-hero" key={h.character.slug}>
                      <div className="summary-hero">
                        <Portrait
                          src={h.character.imagen}
                          name={h.character.nombre}
                        />
                        <b>{h.character.nombre}</b>
                      </div>
                      <StatRows stats={contributions(h).stats} />
                    </div>
                  ))}
                </article>
              ))}
            </div>
            {!selected.length && (
              <div className="game-empty">
                <GitCompareArrows size={40} />
                <h2>Selecciona tus estrategias</h2>
                <p>
                  Se comparan aportes de equipamiento. Faltan las estadísticas
                  base.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <section className="adventure-banner">
              <div>
                <span className="game-kicker">SEVEN DEADLY SINS: ORIGIN</span>
                <h1>
                  Reúne a tus héroes.
                  <br />
                  <em>Forja tu próxima victoria.</em>
                </h1>
                <p>
                  Cuatro compañeros. Cientos de posibilidades.
                  <br />
                  Cada formación, una estrategia que permanece contigo.
                </p>
                <button
                  className="game-button blue"
                  disabled={plans.loading || !!plans.error}
                  onClick={() => setEditing(emptyPlan(manifest.sha256))}
                >
                  <Plus size={19} />
                  Crear formación
                </button>
              </div>
              <div className="banner-portraits" aria-hidden="true">
                {["meliodas", "ban", "daisy", "elizabeth"].map((slug, i) => {
                  const c =
                    catalog.personajes.find((h) => h.slug === slug) ||
                    catalog.personajes[i];
                  return (
                    <Portrait
                      key={slug}
                      src={c?.imagen}
                      name={c?.nombre || slug}
                      className={`banner-hero banner-hero-${i}`}
                    />
                  );
                })}
                <span className="banner-orbit" />
              </div>
              <span className="banner-edition">
                TU LIBRO DE ESTRATEGIAS · CAPÍTULO II
              </span>
            </section>
            <div className="catalog-metrics">
              <span>
                <b>{catalog.personajes.length}</b> héroes SR y SSR
              </span>
              <span>
                <b>{catalog.armas.length}</b> armas
              </span>
              <span>
                <b>{catalog.armaduras.length + catalog.accesorios.length}</b>{" "}
                armaduras y accesorios
              </span>
              <span>
                <ShieldCheck size={17} />
                Planes independientes
              </span>
            </div>
            <div className="game-section-heading">
              <div>
                <span className="game-kicker">LISTOS PARA LA AVENTURA</span>
                <h2>
                  Mis formaciones <small>{plans.plans.length}</small>
                </h2>
              </div>
              <div>
                <button
                  className={`game-quiet ${favorite ? "gold" : ""}`}
                  onClick={() => setFavorite(!favorite)}
                >
                  <Star size={16} fill={favorite ? "currentColor" : "none"} />
                  Favoritos
                </button>
                <button
                  className="game-quiet"
                  aria-label="Exportar formaciones"
                  onClick={exportPlans}
                >
                  <Download size={17} />
                </button>
              </div>
            </div>
            <div className="party-filters">
              <label className="game-search">
                <Search size={18} />
                <input
                  aria-label="Buscar formaciones"
                  placeholder="Buscar formación, jefe o etiqueta…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Filtrar héroe"
                value={filterHero}
                onChange={(e) => setFilterHero(e.target.value)}
              >
                <option value="">Todos los héroes</option>
                {catalog.personajes.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar actividad"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              >
                <option value="">Todas las actividades</option>
                {[...new Set(plans.plans.map((p) => p.activity))].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            {plans.loading ? (
              <div className="game-empty">Cargando formaciones privadas…</div>
            ) : visible.length ? (
              <div className="party-library">
                {visible.map((p) => (
                  <article className="formation-card" key={p.id}>
                    <div className="formation-card-top">
                      <span>{p.activity}</span>
                      <button
                        aria-label={`Favorito ${p.name}`}
                        disabled={plans.busy}
                        onClick={() =>
                          void action(() =>
                            plans.save({ ...p, favorite: !p.favorite }),
                          )
                        }
                      >
                        <Star
                          size={17}
                          fill={p.favorite ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                    <button
                      className="formation-card-open"
                      aria-label={`Editar ${p.name}`}
                      onClick={() => setEditing(p)}
                    >
                      <div className="formation-faces">
                        {p.heroes.map((h) => (
                          <Portrait
                            key={h.character.slug}
                            src={h.character.imagen}
                            name={h.character.nombre}
                          />
                        ))}
                      </div>
                      <h3>{p.name}</h3>
                      <p>{p.boss || "Britannia te espera"}</p>
                      <span>
                        {p.heroes.map((h) => h.character.nombre).join(" · ")}
                      </span>
                    </button>
                    <div className="formation-card-bottom">
                      <label>
                        <input
                          type="checkbox"
                          checked={compared.includes(p.id)}
                          disabled={
                            !compared.includes(p.id) && compared.length >= 3
                          }
                          onChange={(e) =>
                            setCompared(
                              e.target.checked
                                ? [...compared, p.id]
                                : compared.filter((id) => id !== p.id),
                            )
                          }
                        />
                        Comparar
                      </label>
                      <div>
                        <button
                          disabled={plans.busy}
                          aria-label={`Duplicar ${p.name}`}
                          onClick={() =>
                            void action(() =>
                              plans.save({
                                ...structuredClone(p),
                                id: crypto.randomUUID(),
                                name: p.name + " · copia",
                                updatedAt: new Date().toISOString(),
                              }),
                            )
                          }
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          aria-label={`Eliminar ${p.name}`}
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                <button
                  className="formation-new"
                  disabled={plans.loading}
                  onClick={() => setEditing(emptyPlan(manifest.sha256))}
                >
                  <Plus />
                  <h3>Una nueva aventura</h3>
                  <small>Crea otra formación</small>
                </button>
              </div>
            ) : (
              <div className="game-empty">
                <Swords size={43} />
                <h2>
                  {plans.plans.length
                    ? "No hay resultados"
                    : "Tu próxima aventura empieza aquí"}
                </h2>
                <p>
                  {plans.plans.length
                    ? "Prueba otra búsqueda."
                    : "Selecciona cuatro héroes y conserva cada configuración."}
                </p>
                <button
                  className="game-button light"
                  disabled={!!plans.error}
                  onClick={() => setEditing(emptyPlan(manifest.sha256))}
                >
                  Crear mi primera formación
                </button>
              </div>
            )}
            {compared.length > 0 && (
              <div className="game-compare-bar">
                <span>{compared.length} formaciones seleccionadas</span>
                <button
                  className="game-button blue"
                  onClick={() => setView("Comparador")}
                >
                  Comparar <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
        <footer className="game-footer">
          <span>
            ORIGIN FORGE <b>✦</b> Un lugar para cada estrategia.
          </span>
          <span>
            Catálogo {manifest?.sha256.slice(0, 8) || "…"} ·{" "}
            {manifest?.totalRows.toLocaleString("es-ES") || "…"} registros ·{" "}
            {supabase ? "Supabase" : "Copia local"}
          </span>
          <a href="/?legacy=1">Planes de la primera versión</a>
        </footer>
      </main>
      {auth && (
        <GameModal
          title={register ? "Crear cuenta" : "Entrar en Origin Forge"}
          onClose={() => setAuth(false)}
        >
          {supabase ? (
            <form onSubmit={authenticate}>
              {failure && (
                <p role="alert" className="auth-error">
                  {failure}
                </p>
              )}
              <p>
                Guarda tus formaciones en tu espacio privado. Los planes locales
                no se suben automáticamente.
              </p>
              <label>
                Correo
                <input
                  autoFocus
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  name="password"
                  minLength={8}
                  autoComplete={register ? "new-password" : "current-password"}
                  required
                />
              </label>
              <button className="game-button blue full" disabled={authBusy}>
                {authBusy
                  ? "Conectando…"
                  : register
                    ? "Crear cuenta"
                    : "Iniciar sesión"}
              </button>
              <button
                className="game-quiet full"
                type="button"
                onClick={() => setRegister(!register)}
              >
                {register ? "Ya tengo cuenta" : "Crear una cuenta"}
              </button>
            </form>
          ) : (
            <p>
              Configura Supabase para usar las cuentas. El editor local está
              disponible.
            </p>
          )}
        </GameModal>
      )}
      {deleting && (
        <GameModal title="Eliminar formación" onClose={() => setDeleting(null)}>
          <p>
            Se eliminará «{deleting.name}». Las piezas de tus otras formaciones
            se conservarán. Esta acción no se puede deshacer.
          </p>
          <div className="equipment-actions">
            <button
              className="game-button light"
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </button>
            <button
              className="game-button blue"
              disabled={plans.busy}
              onClick={() =>
                void action(async () => {
                  await plans.remove(deleting.id);
                  setDeleting(null);
                  setCompared(compared.filter((id) => id !== deleting.id));
                })
              }
            >
              Eliminar
            </button>
          </div>
        </GameModal>
      )}
    </div>
  );
}
