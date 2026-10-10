import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Swords,
  BookOpen,
  GitCompareArrows,
  Plus,
  Search,
  Star,
  Copy,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  LogOut,
  UserRound,
  X,
  Download,
  ChevronRight,
  Layers3,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import {
  blankEntry,
  blankTeam,
  calculate,
  duplicateTeam,
  matches,
  statLabels,
  type Entry,
  type Kind,
  type Stat,
  type Team,
} from "./domain";
import { demoData, initialCatalog } from "./data";
import { deleteCloud, loadCloud, saveCloud, supabase } from "./backend";
import { EntryEditor, TeamEditor } from "./Editors";
type Page = "teams" | "catalog" | "compare";
const storageKey = "origin-forge-local-v1";
function readLocal(): { teams: Team[]; catalog: Entry[] } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.teams) && Array.isArray(d.catalog)) return d;
    }
  } catch {
    /* Leave malformed storage untouched until an explicit save. */
  }
  return { teams: [], catalog: initialCatalog() };
}
function Modal({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-label={label}>
      <div className="section-heading">
        <h2>{label}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar diálogo"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const [local] = useState(readLocal);
  const [teams, setTeams] = useState(local.teams);
  const [catalog, setCatalog] = useState(local.catalog);
  const [page, setPage] = useState<Page>("teams");
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Team | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [auth, setAuth] = useState(false);
  const [register, setRegister] = useState(false);
  const [query, setQuery] = useState("");
  const [character, setCharacter] = useState("");
  const [activity, setActivity] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [kind, setKind] = useState<Kind | "Todas">("Todas");
  const [comparison, setComparison] = useState<string[]>([]);
  const [deletion, setDeletion] = useState<{
    table: "teams" | "catalog_entries";
    id: string;
    name: string;
  } | null>(null);
  const epoch = useRef(0);
  const currentUser = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!supabase) return;
    currentUser.current = undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user || null;
      if (currentUser.current === (next?.id || null)) return;
      currentUser.current = next?.id || null;
      setUser(next);
      setReady(false);
      setEditing(null);
      setEntry(null);
      setComparison([]);
      setError("");
      const generation = ++epoch.current;
      setTeams([]);
      setCatalog([]);
      if (next) {
        // Defer API calls until Supabase releases its auth callback lock.
        void new Promise<void>((resolve) => setTimeout(resolve, 0))
          .then(() => loadCloud(next.id))
          .then((data) => {
            if (generation !== epoch.current) return;
            setTeams(data.teams);
            setCatalog(
              [
                ...initialCatalog(),
                ...data.catalog.filter((c) => !c.id.startsWith("character-")),
                ...data.catalog.filter((c) => c.id.startsWith("character-")),
              ].filter(
                (c, i, a) => a.findLastIndex((e) => e.id === c.id) === i,
              ),
            );
            setReady(true);
          })
          .catch((e) => {
            if (generation === epoch.current) {
              setError(`No se pudieron cargar tus datos: ${e.message}`);
            }
          });
      } else {
        const data = readLocal();
        setTeams(data.teams);
        setCatalog(data.catalog);
        setReady(true);
      }
    });
    return () => {
      epoch.current++;
      data.subscription.unsubscribe();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    const generation = epoch.current;
    try {
      await action();
    } catch (e) {
      if (generation === epoch.current)
        setError(
          e instanceof Error ? e.message : "No se pudo completar la operación.",
        );
    } finally {
      setBusy(false);
    }
  }
  function persist(nextTeams: Team[], nextCatalog: Entry[]) {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ teams: nextTeams, catalog: nextCatalog }),
    );
  }
  async function saveTeam(t: Team, close = true) {
    await run(async () => {
      const id = user?.id;
      const generation = epoch.current;
      const next = teams.some((v) => v.id === t.id)
        ? teams.map((v) => (v.id === t.id ? t : v))
        : [t, ...teams];
      if (id) await saveCloud("teams", t, id);
      else persist(next, catalog);
      if (generation !== epoch.current) return;
      setTeams(next);
      if (close) setEditing(null);
      setNotice(
        "Equipo guardado. Las otras configuraciones mantienen sus piezas.",
      );
    });
  }
  async function saveEntry(e: Entry) {
    await run(async () => {
      const generation = epoch.current;
      const next = catalog.some((c) => c.id === e.id)
        ? catalog.map((c) => (c.id === e.id ? e : c))
        : [...catalog, e];
      if (user) await saveCloud("catalog_entries", e, user.id);
      else persist(teams, next);
      if (generation !== epoch.current) return;
      setCatalog(next);
      setEntry(null);
      setNotice(
        "Entrada guardada. Los equipos existentes conservan su versión.",
      );
    });
  }
  async function remove() {
    if (!deletion) return;
    await run(async () => {
      const generation = epoch.current;
      const nextTeams =
        deletion.table === "teams"
          ? teams.filter((t) => t.id !== deletion.id)
          : teams;
      const nextCatalog =
        deletion.table === "catalog_entries"
          ? catalog.filter((c) => c.id !== deletion.id)
          : catalog;
      if (user) await deleteCloud(deletion.table, deletion.id, user.id);
      else persist(nextTeams, nextCatalog);
      if (generation !== epoch.current) return;
      setTeams(nextTeams);
      setCatalog(nextCatalog);
      setComparison(comparison.filter((id) => id !== deletion.id));
      setDeletion(null);
      setNotice(
        "Eliminado. Las piezas guardadas en otros equipos se conservan.",
      );
    });
  }
  async function authenticate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await run(async () => {
      if (!supabase)
        throw new Error("Configura Supabase para activar las cuentas.");
      const credentials = {
        email: String(data.get("email")),
        password: String(data.get("password")),
      };
      const result = register
        ? await supabase.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: window.location.origin },
          })
        : await supabase.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      setAuth(false);
      setNotice(
        register && !result.data.session
          ? "Revisa tu correo para confirmar tu cuenta."
          : "Sesión iniciada.",
      );
    });
  }
  const navigate = (p: Page) => {
    setPage(p);
    setEditing(null);
    setEntry(null);
    setQuery("");
  };
  const visible = teams.filter(
    (t) => matches(t, query, character, activity) && (!favorites || t.favorite),
  );
  const compared = comparison
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is Team => !!t);
  function exportData() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              exportedAt: new Date().toISOString(),
              teams,
              catalog,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "origin-forge-equipos.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function loadDemo() {
    void run(async () => {
      if (user)
        throw new Error("Los ejemplos solo están disponibles en modo local.");
      const demo = demoData();
      persist(demo.teams, demo.catalog);
      setTeams(demo.teams);
      setCatalog(demo.catalog);
      setNotice("Ejemplos cargados con estadísticas ficticias para practicar.");
    });
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("teams");
          }}
        >
          <div className="brand-mark">
            <Swords size={25} />
          </div>
          <span>
            ORIGIN <b>FORGE</b>
            <small>SEVEN DEADLY SINS</small>
          </span>
        </a>
        <div className="nav-caption">TU LIBRO DE ESTRATEGIAS</div>
        <nav>
          {(
            [
              ["teams", "Mis equipos", Swords],
              ["catalog", "Catálogo", BookOpen],
              ["compare", "Comparador", GitCompareArrows],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? "nav active" : "nav"}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              {label}
              {id === "teams" && <span>{teams.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="snapshot-note">
            <ShieldCheck size={22} />
            <b>Cada plan, a salvo</b>
            <p>Una misma pieza puede formar parte de todos tus equipos.</p>
          </div>
          <button
            className="account"
            disabled={busy}
            onClick={() =>
              user
                ? void run(async () => {
                    const { error } = await supabase!.auth.signOut();
                    if (error) throw error;
                  })
                : setAuth(true)
            }
          >
            <UserRound size={21} />
            <span>
              {user ? user.email : "Explorador local"}
              <small>{user ? "Cerrar sesión" : "Conectar mi cuenta"}</small>
            </span>
            {user ? <LogOut size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            BRITANNIA <ChevronRight size={13} />{" "}
            {page === "teams"
              ? "Mis equipos"
              : page === "catalog"
                ? "Catálogo"
                : "Comparador"}
          </span>
          <div>
            <span className="status-dot" />
            {user ? "Espacio privado" : "Modo local"}
            <button
              className="icon-button"
              aria-label={user ? "Cerrar sesión" : "Conectar cuenta"}
              disabled={busy}
              onClick={() =>
                user
                  ? void run(async () => {
                      const { error } = await supabase!.auth.signOut();
                      if (error) throw error;
                    })
                  : setAuth(true)
              }
            >
              {user ? <LogOut size={18} /> : <UserRound size={18} />}
            </button>
            <button
              className="icon-button"
              aria-label="Exportar copia de seguridad"
              title="Exportar copia de seguridad"
              disabled={!ready}
              onClick={exportData}
            >
              <Download size={18} />
            </button>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Cerrar error">
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert" role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            </div>
          )}
          {!ready ? (
            <div className="panel empty">
              <h2>{error ? "Carga interrumpida" : "Preparando tu espacio…"}</h2>
              {error && (
                <button
                  className="secondary"
                  onClick={() => window.location.reload()}
                >
                  Reintentar carga
                </button>
              )}
            </div>
          ) : editing ? (
            <TeamEditor
              key={editing.id}
              initial={editing}
              catalog={catalog}
              onSave={saveTeam}
              onClose={() => setEditing(null)}
              busy={busy}
            />
          ) : entry ? (
            <EntryEditor
              key={entry.id}
              initial={entry}
              catalog={catalog}
              onSave={saveEntry}
              onClose={() => setEntry(null)}
              busy={busy}
            />
          ) : (
            <>
              {page === "teams" && (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <p className="eyebrow">
                        <span /> EL PRÓXIMO COMBATE EMPIEZA AQUÍ
                      </p>
                      <h1>
                        Una aventura.
                        <br />
                        <em>Infinitas estrategias.</em>
                      </h1>
                      <p>
                        Diseña tus equipos, conserva cada configuración
                        <br className="desktop-break" /> y encuentra el plan
                        perfecto para cada desafío.
                      </p>
                      <button
                        className="primary"
                        disabled={
                          busy || !catalog.some((c) => c.kind === "Personaje")
                        }
                        onClick={() =>
                          setEditing(
                            blankTeam(
                              catalog.find((c) => c.kind === "Personaje")!,
                            ),
                          )
                        }
                      >
                        <Plus size={17} /> Crear equipo
                      </button>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="rune rune-one">✦</div>
                      <div className="rune rune-two">✧</div>
                      <div className="sword-symbol">
                        <Swords strokeWidth={0.75} />
                      </div>
                      <span className="art-caption">
                        THE SEVEN DEADLY SINS
                        <br />
                        <b>O R I G I N</b>
                      </span>
                    </div>
                    <span className="hero-chapter">
                      LIBRO DE ESTRATEGIAS / CAPÍTULO I
                    </span>
                  </section>
                  <div className="overview">
                    <div>
                      <Layers3 />
                      <span>
                        <b>{teams.length}</b> Equipos guardados
                      </span>
                    </div>
                    <div>
                      <UserRound />
                      <span>
                        <b>{new Set(teams.map((t) => t.character.id)).size}</b>{" "}
                        Personajes preparados
                      </span>
                    </div>
                    <div>
                      <ShieldCheck />
                      <span>
                        Configuraciones <b>independientes</b>
                      </span>
                    </div>
                  </div>
                  <div className="section-heading library-heading">
                    <div>
                      <p className="eyebrow">TU ARSENAL</p>
                      <h2>
                        Mis equipos{" "}
                        <span className="count">{teams.length}</span>
                      </h2>
                    </div>
                    <button
                      className="quiet"
                      onClick={() => {
                        setFavorites(!favorites);
                      }}
                    >
                      <Star
                        size={16}
                        fill={favorites ? "currentColor" : "none"}
                      />{" "}
                      {favorites ? "Todos los equipos" : "Solo favoritos"}
                    </button>
                  </div>
                  <div className="filters">
                    <label className="search">
                      <Search size={18} />
                      <input
                        aria-label="Buscar equipos"
                        placeholder="Buscar equipo, jefe o etiqueta…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filtrar personaje"
                      value={character}
                      onChange={(e) => setCharacter(e.target.value)}
                    >
                      <option value="">Todos los personajes</option>
                      {Array.from(
                        new Map(
                          teams.map((t) => [t.character.id, t.character]),
                        ).values(),
                      ).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filtrar actividad"
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                    >
                      <option value="">Todas las actividades</option>
                      {[...new Set(teams.map((t) => t.activity))].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  {visible.length ? (
                    <div className="team-grid">
                      {visible.map((t, i) => {
                        const stats = calculate(t).totals;
                        return (
                          <article
                            className={`team-card tone-${i % 3}`}
                            key={t.id}
                          >
                            <div className="card-visual">
                              <div className="character-seal">
                                {t.character.name.slice(0, 1)}
                                <span>✦</span>
                              </div>
                              <span className="card-character">
                                {t.character.name}
                              </span>
                              <button
                                className="favorite icon-button"
                                aria-label={`${t.favorite ? "Quitar" : "Añadir"} favorito ${t.name}`}
                                disabled={busy}
                                onClick={() =>
                                  void saveTeam(
                                    { ...t, favorite: !t.favorite },
                                    false,
                                  )
                                }
                              >
                                <Star
                                  size={17}
                                  fill={t.favorite ? "currentColor" : "none"}
                                />
                              </button>
                              <span className="activity-badge">
                                {t.activity}
                              </span>
                            </div>
                            <div className="card-body">
                              <div className="section-heading">
                                <h3>{t.name}</h3>
                                <button
                                  className="icon-button"
                                  aria-label={`Editar ${t.name}`}
                                  onClick={() => setEditing(t)}
                                >
                                  <ArrowUpRight size={20} />
                                </button>
                              </div>
                              <p className="card-purpose">
                                {t.boss || "Sin jefe asignado"} ·{" "}
                                {Object.keys(t.pieces).length}/8 piezas
                              </p>
                              <div className="card-stats">
                                <span>
                                  ATAQUE
                                  <b>{stats.attack.toLocaleString("es-ES")}</b>
                                </span>
                                <span>
                                  DEFENSA
                                  <b>{stats.defense.toLocaleString("es-ES")}</b>
                                </span>
                                <span>
                                  PV<b>{stats.hp.toLocaleString("es-ES")}</b>
                                </span>
                              </div>
                              <div className="tags">
                                {t.tags.filter(Boolean).map((tag, j) => (
                                  <span key={j}>{tag.trim()}</span>
                                ))}
                              </div>
                              <footer>
                                <label className="compare-check">
                                  <input
                                    type="checkbox"
                                    checked={comparison.includes(t.id)}
                                    disabled={
                                      !comparison.includes(t.id) &&
                                      comparison.length >= 3
                                    }
                                    onChange={(e) =>
                                      setComparison(
                                        e.target.checked
                                          ? [...comparison, t.id]
                                          : comparison.filter(
                                              (id) => id !== t.id,
                                            ),
                                      )
                                    }
                                  />{" "}
                                  Comparar
                                </label>
                                <div>
                                  <button
                                    className="icon-button"
                                    disabled={busy}
                                    aria-label={`Duplicar ${t.name}`}
                                    onClick={() =>
                                      void saveTeam(duplicateTeam(t), false)
                                    }
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <button
                                    className="icon-button"
                                    disabled={busy}
                                    aria-label={`Eliminar ${t.name}`}
                                    onClick={() =>
                                      setDeletion({
                                        table: "teams",
                                        id: t.id,
                                        name: t.name,
                                      })
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </footer>
                            </div>
                          </article>
                        );
                      })}
                      <button
                        className="new-card"
                        onClick={() =>
                          setEditing(
                            blankTeam(
                              catalog.find((c) => c.kind === "Personaje")!,
                            ),
                          )
                        }
                      >
                        <span>
                          <Plus size={25} />
                        </span>
                        <b>Una nueva estrategia</b>
                        <small>Crea un equipo a tu medida</small>
                      </button>
                    </div>
                  ) : (
                    <div className="panel empty">
                      <Swords size={36} />
                      <h3>
                        {teams.length
                          ? "No hay equipos con estos filtros"
                          : "Tu aventura comienza con un equipo"}
                      </h3>
                      <p>
                        {teams.length
                          ? "Prueba otro personaje, actividad o búsqueda."
                          : "Añade tus piezas al catálogo y guarda tu primera estrategia."}
                      </p>
                      {!teams.length && (
                        <div className="empty-actions">
                          <button
                            className="primary"
                            onClick={() =>
                              setEditing(
                                blankTeam(
                                  catalog.find((c) => c.kind === "Personaje")!,
                                ),
                              )
                            }
                          >
                            Crear mi primer equipo
                          </button>
                          {!user && (
                            <button className="secondary" onClick={loadDemo}>
                              Probar con ejemplos ficticios
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {comparison.length > 0 && (
                    <div className="compare-bar">
                      <span>
                        <GitCompareArrows size={18} /> {comparison.length}{" "}
                        equipos seleccionados · máximo 3
                      </span>
                      <button
                        className="primary"
                        onClick={() => navigate("compare")}
                      >
                        Comparar equipos <ArrowUpRight size={17} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {page === "catalog" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">LAS PIEZAS DE TU ESTRATEGIA</p>
                      <h1>Catálogo personal</h1>
                      <p className="muted">
                        Registra datos del juego, sus efectos y su fuente. Los
                        valores iniciales están pendientes de revisión.
                      </p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => setEntry(blankEntry())}
                    >
                      <Plus size={17} /> Nueva entrada
                    </button>
                  </div>
                  <div className="filters">
                    <label className="search">
                      <Search size={18} />
                      <input
                        aria-label="Buscar catálogo"
                        placeholder="Buscar nombre o descripción…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Categoría del catálogo"
                      value={kind}
                      onChange={(e) =>
                        setKind(e.target.value as Kind | "Todas")
                      }
                    >
                      {[
                        "Todas",
                        "Personaje",
                        "Pieza",
                        "Conjunto",
                        "Grabado",
                        "Encantamiento",
                      ].map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div className="catalog-grid">
                    {catalog
                      .filter(
                        (c) =>
                          (kind === "Todas" || c.kind === kind) &&
                          `${c.name} ${c.description}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((c) => (
                        <article className="panel catalog-card" key={c.id}>
                          <div className="section-heading">
                            <span className="category-tag">
                              {c.kind} {c.slot ? `· ${c.slot}` : ""}
                            </span>
                            <span className="quality">{c.quality}</span>
                          </div>
                          <h3>{c.name}</h3>
                          <p className="muted">
                            {c.description || "Sin descripción"}
                          </p>
                          {c.effect && <p>{c.effect}</p>}
                          <div className="tags">
                            {Object.entries(c.stats).map(([key, value]) => (
                              <span key={key}>
                                {statLabels[key as Stat]} +{value}
                              </span>
                            ))}
                          </div>
                          {c.source && (
                            <small className="source">Fuente: {c.source}</small>
                          )}
                          <footer>
                            <button
                              className="quiet"
                              onClick={() => setEntry(c)}
                            >
                              Editar entrada <ArrowUpRight size={14} />
                            </button>
                            {!c.id.startsWith("character-") && (
                              <button
                                className="icon-button"
                                aria-label={`Eliminar entrada ${c.name}`}
                                onClick={() =>
                                  setDeletion({
                                    table: "catalog_entries",
                                    id: c.id,
                                    name: c.name,
                                  })
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </footer>
                        </article>
                      ))}
                  </div>
                </>
              )}
              {page === "compare" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">ENCUENTRA TU MEJOR OPCIÓN</p>
                      <h1>Comparar equipos</h1>
                      <p className="muted">
                        Selecciona hasta tres configuraciones para ver sus
                        diferencias.
                      </p>
                    </div>
                  </div>
                  <div className="comparison-selectors">
                    {[0, 1, 2].map((i) => (
                      <label key={i}>
                        Equipo {i + 1}
                        <select
                          aria-label={`Equipo ${i + 1}`}
                          value={comparison[i] || ""}
                          onChange={(e) => {
                            const next = [...comparison];
                            next[i] = e.target.value;
                            setComparison(next.filter(Boolean));
                          }}
                        >
                          <option value="">Selecciona un equipo</option>
                          {teams
                            .filter(
                              (t) =>
                                !comparison.includes(t.id) ||
                                comparison[i] === t.id,
                            )
                            .map((t) => (
                              <option value={t.id} key={t.id}>
                                {t.name} · {t.character.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {compared.length ? (
                    <div className="panel comparison-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Estadística</th>
                            {compared.map((t) => (
                              <th key={t.id}>
                                {t.name}
                                <small>{t.character.name}</small>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(statLabels).map(([s, l]) => {
                            const vals = compared.map(
                              (t) => calculate(t).totals[s as Stat],
                            );
                            return (
                              <tr key={s}>
                                <th>{l}</th>
                                {vals.map((v, i) => (
                                  <td
                                    key={i}
                                    className={
                                      v === Math.max(...vals) &&
                                      compared.length > 1
                                        ? "best"
                                        : ""
                                    }
                                  >
                                    {v.toLocaleString("es-ES")}
                                    {i > 0 && (
                                      <small>
                                        {v - vals[0] >= 0 ? "+" : ""}
                                        {(v - vals[0]).toLocaleString(
                                          "es-ES",
                                        )}{" "}
                                        vs. equipo 1
                                      </small>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                          <tr>
                            <th>Bonificaciones activas</th>
                            {compared.map((t) => (
                              <td key={t.id}>
                                {calculate(t)
                                  .bonuses.filter((b) => b.active)
                                  .map((b, i) => (
                                    <small key={i}>
                                      {b.name}: {b.effect}
                                    </small>
                                  ))}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <th>Notas</th>
                            {compared.map((t) => (
                              <td key={t.id}>{t.notes || "Sin notas"}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                      <p className="calculation-note">
                        Se comparan estimaciones manuales; no constituyen una
                        simulación de daño. Verde indica el valor más alto, sin
                        valorar su utilidad para cada estrategia.
                      </p>
                    </div>
                  ) : (
                    <div className="panel empty">
                      <GitCompareArrows size={36} />
                      <h3>Cada decisión cuenta</h3>
                      <p>
                        Crea equipos y selecciónalos aquí para comparar sus
                        estadísticas.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <footer className="site-footer">
            <span>
              ORIGIN FORGE <span>✦</span> Un lugar para cada estrategia.
            </span>
            <span>
              Proyecto de fans · Catálogo manual · OCR previsto para fase 2
            </span>
          </footer>
        </div>
      </main>
      {auth && (
        <Modal
          label={register ? "Crear cuenta" : "Entrar en Origin Forge"}
          onClose={() => setAuth(false)}
        >
          <p className="muted">
            Tus equipos privados, disponibles desde cualquier dispositivo.
          </p>
          {supabase ? (
            <form onSubmit={authenticate}>
              <label>
                Correo electrónico
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
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
              </label>
              <button className="primary full" disabled={busy}>
                {busy
                  ? "Conectando…"
                  : register
                    ? "Crear cuenta"
                    : "Iniciar sesión"}
              </button>
              <button
                type="button"
                className="quiet full"
                onClick={() => setRegister(!register)}
              >
                {register ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}
              </button>
              <p className="calculation-note">
                Los equipos locales no se suben automáticamente. Exporta una
                copia si quieres conservarlos antes de empezar en tu cuenta.
              </p>
            </form>
          ) : (
            <div className="alert">
              Las cuentas estarán disponibles al configurar el proyecto
              Supabase. Puedes usar ahora el editor en modo local.
            </div>
          )}
        </Modal>
      )}
      {deletion && (
        <Modal
          label="Eliminar definitivamente"
          onClose={() => setDeletion(null)}
        >
          <p>
            Se eliminará «{deletion.name}». Esta acción no se puede deshacer.
          </p>
          <p className="muted">Otros equipos conservarán sus propias piezas.</p>
          <div className="form-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setDeletion(null)}
            >
              Cancelar
            </button>
            <button
              className="primary destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
