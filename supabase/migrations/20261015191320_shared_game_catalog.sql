create table public.game_imports (sha256 text primary key, source text not null, extracted_at text, imported_at timestamptz not null default now(), status text not null check(status in ('staged','ready')), counts jsonb not null);
create table public."game_metadatos" ("clave" text primary key,
"valor" text);
create table public."game_elementos" ("codigo" text primary key,
"nombre" text);
create index "game_elementos_search_idx" on public."game_elementos" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_roles" ("codigo" text primary key,
"nombre" text,
"descripcion" text);
create index "game_roles_search_idx" on public."game_roles" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_rarezas" ("codigo" text primary key,
"nombre" text,
"orden" bigint,
"nota" text);
create index "game_rarezas_search_idx" on public."game_rarezas" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_tipos_arma" ("codigo" text primary key,
"nombre" text);
create index "game_tipos_arma_search_idx" on public."game_tipos_arma" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_estadisticas" ("codigo" text primary key,
"nombre" text,
"nombre_en" text,
"es_porcentaje" bigint);
create index "game_estadisticas_search_idx" on public."game_estadisticas" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_personajes" ("slug" text primary key,
"nombre" text,
"rareza" text,
"elemento_principal" text,
"rol_principal" text,
"genero" text,
"altura" text,
"grupo_sanguineo" text,
"habilidad_aventura" text,
"habilidad_aventura_desc" text,
"fecha_lanzamiento" text,
"publicado" bigint,
"imagen" text,
"url" text);
create index "game_personajes_rareza_idx" on public."game_personajes" ("rareza");
create index "game_personajes_search_idx" on public."game_personajes" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_personaje_armas" ("id" bigint primary key,
"personaje" text,
"orden" bigint,
"tipo_arma" text,
"rol" text,
"elemento" text,
foreign key ("personaje") references public."game_personajes" ("slug"));
create index "game_personaje_armas_personaje_idx" on public."game_personaje_armas" ("personaje");
create index "game_personaje_armas_tipo_arma_idx" on public."game_personaje_armas" ("tipo_arma");
create table public."game_habilidades" ("id" bigint primary key,
"personaje" text,
"tipo_arma" text,
"categoria" text,
"nombre" text,
"nombre_en" text,
"descripcion" text,
"enfriamiento_s" double precision,
"coste_magia" double precision,
"dano_pct_atq" double precision,
"tipo_dano" text,
"golpes" bigint,
"carga_relevo" double precision,
"carga_rafaga" double precision,
"carga_magia" double precision,
"orden" bigint,
"game_id" text,
foreign key ("personaje") references public."game_personajes" ("slug"));
create index "game_habilidades_personaje_idx" on public."game_habilidades" ("personaje");
create index "game_habilidades_tipo_arma_idx" on public."game_habilidades" ("tipo_arma");
create index "game_habilidades_search_idx" on public."game_habilidades" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_habilidad_efectos" ("id" bigint primary key,
"habilidad_id" bigint,
"tipo" text,
"nombre" text,
"duracion_s" double precision,
"descripcion" text,
foreign key ("habilidad_id") references public."game_habilidades" ("id"));
create index "game_habilidad_efectos_habilidad_id_idx" on public."game_habilidad_efectos" ("habilidad_id");
create index "game_habilidad_efectos_search_idx" on public."game_habilidad_efectos" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_potenciales" ("id" bigint primary key,
"personaje" text,
"tipo_arma" text,
"nivel" bigint,
"bonificacion" text,
"stats_json" text,
foreign key ("personaje") references public."game_personajes" ("slug"));
create index "game_potenciales_personaje_idx" on public."game_potenciales" ("personaje");
create index "game_potenciales_tipo_arma_idx" on public."game_potenciales" ("tipo_arma");
create table public."game_maestria_niveles" ("id" bigint primary key,
"personaje" text,
"tipo_arma" text,
"nivel" bigint,
"exp_requerida" bigint,
"coste_oro" bigint,
foreign key ("personaje") references public."game_personajes" ("slug"));
create index "game_maestria_niveles_personaje_idx" on public."game_maestria_niveles" ("personaje");
create index "game_maestria_niveles_tipo_arma_idx" on public."game_maestria_niveles" ("tipo_arma");
create table public."game_maestria_subniveles" ("id" bigint primary key,
"maestria_id" bigint,
"paso" bigint,
"exp" bigint,
"stat" text,
"stat_nombre" text,
"valor" double precision,
"valor_fmt" text,
foreign key ("maestria_id") references public."game_maestria_niveles" ("id"));
create index "game_maestria_subniveles_maestria_id_idx" on public."game_maestria_subniveles" ("maestria_id");
create table public."game_maestria_ramas" ("id" bigint primary key,
"maestria_id" bigint,
"personaje" text,
"tipo_arma" text,
"nivel" bigint,
"rama" bigint,
"tipo_nodo" text,
"aplicacion" text,
"stat" text,
"stat_nombre" text,
"valor" double precision,
"valor_fmt" text,
"materiales_json" text,
foreign key ("maestria_id") references public."game_maestria_niveles" ("id"));
create index "game_maestria_ramas_maestria_id_idx" on public."game_maestria_ramas" ("maestria_id");
create index "game_maestria_ramas_personaje_idx" on public."game_maestria_ramas" ("personaje");
create index "game_maestria_ramas_tipo_arma_idx" on public."game_maestria_ramas" ("tipo_arma");
create table public."game_maestria_comun" ("id" bigint primary key,
"nivel" bigint,
"exp_requerida" bigint,
"coste_oro" bigint,
"stat" text,
"stat_nombre" text,
"valor" double precision,
"valor_fmt" text);
create table public."game_atuendos" ("id" bigint primary key,
"personaje" text,
"nombre" text,
"rareza" text,
"efecto" text,
"descripcion" text,
"es_equipo_grabado" bigint,
"imagen" text,
foreign key ("personaje") references public."game_personajes" ("slug"));
create index "game_atuendos_personaje_idx" on public."game_atuendos" ("personaje");
create index "game_atuendos_rareza_idx" on public."game_atuendos" ("rareza");
create index "game_atuendos_search_idx" on public."game_atuendos" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_grabados" ("id" bigint primary key,
"personaje" text,
"atuendo_id" bigint,
"atuendo" text,
"grabado_id" text,
"nivel" bigint,
"descripcion" text,
foreign key ("atuendo_id") references public."game_atuendos" ("id"),
foreign key ("personaje") references public."game_personajes" ("slug"));
create index "game_grabados_atuendo_id_idx" on public."game_grabados" ("atuendo_id");
create index "game_grabados_personaje_idx" on public."game_grabados" ("personaje");
create table public."game_trascendencias" ("id" bigint primary key,
"personaje" text,
"armadura" text,
"armadura_slug" text,
"nivel" bigint,
"stat" text,
"stat_nombre" text,
"valor" double precision,
"valor_fmt" text,
"pasiva_nombre" text,
"pasiva_descripcion" text,
foreign key ("personaje") references public."game_personajes" ("slug"));
create index "game_trascendencias_personaje_idx" on public."game_trascendencias" ("personaje");
create table public."game_rafagas" ("elemento" text primary key,
"nombre" text,
"activable" bigint,
"dano_activacion" bigint,
"stat_eficacia" text,
"stat_resistencia" text,
"descripcion" text,
"debilidades_objetivo" text,
"duracion_objetivo_s" double precision,
"efectos_json" text);
create index "game_rafagas_search_idx" on public."game_rafagas" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_habilidades_combinadas" ("id" bigint primary key,
"categoria" text,
"base_personaje" text,
"base_arma" text,
"base_habilidad" text,
"apoyo1_personaje" text,
"apoyo1_arma" text,
"apoyo1_habilidad" text,
"apoyo2_personaje" text,
"apoyo2_arma" text,
"apoyo2_habilidad" text,
"dano" text,
"elemento" text,
"tipo_dano" text,
"grados_json" text);
create table public."game_banners" ("id" bigint primary key,
"personaje" text,
"banner" text,
"tipo" text,
"destacado" bigint,
"inicio" text,
"fin" text);
create index "game_banners_personaje_idx" on public."game_banners" ("personaje");
create table public."game_efectos" ("nombre" text primary key,
"tipo" text,
"descripcion" text,
"slug" text);
create index "game_efectos_search_idx" on public."game_efectos" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_efectos_codice" ("id" bigint primary key,
"tipo" text,
"categorias" text,
"origen" text,
"texto_busqueda" text);
create table public."game_armas" ("id" bigint primary key,
"slug" text,
"nombre" text,
"tipo_arma" text,
"rarezas" text,
"atq_max" bigint,
"pasiva" text,
"pasiva_descripcion" text,
"descripcion" text,
"usado_por" text,
"imagen" text,
"url" text);
create index "game_armas_tipo_arma_idx" on public."game_armas" ("tipo_arma");
create index "game_armas_search_idx" on public."game_armas" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_arma_grados" ("id" bigint primary key,
"arma_id" bigint,
"arma" text,
"rareza" text,
"atq_base" double precision,
"atq_max" double precision,
"substat" text,
"substat_base" double precision,
"substat_max" double precision,
"promocion_atq_max" double precision,
"refuerzo_max" bigint,
foreign key ("arma_id") references public."game_armas" ("id"));
create index "game_arma_grados_arma_id_idx" on public."game_arma_grados" ("arma_id");
create index "game_arma_grados_rareza_idx" on public."game_arma_grados" ("rareza");
create table public."game_arma_encantamientos" ("id" bigint primary key,
"arma_id" bigint,
"arma" text,
"rareza" text,
"stat" text,
"stat_nombre" text,
"min" double precision,
"max" double precision,
"rango_fmt" text,
foreign key ("arma_id") references public."game_armas" ("id"));
create index "game_arma_encantamientos_arma_id_idx" on public."game_arma_encantamientos" ("arma_id");
create index "game_arma_encantamientos_rareza_idx" on public."game_arma_encantamientos" ("rareza");
create table public."game_arma_pasiva_niveles" ("id" bigint primary key,
"arma_id" bigint,
"arma" text,
"rareza" text,
"nivel" bigint,
"descripcion" text,
foreign key ("arma_id") references public."game_armas" ("id"));
create index "game_arma_pasiva_niveles_arma_id_idx" on public."game_arma_pasiva_niveles" ("arma_id");
create index "game_arma_pasiva_niveles_rareza_idx" on public."game_arma_pasiva_niveles" ("rareza");
create table public."game_armaduras" ("id" bigint primary key,
"slug" text,
"game_id" text,
"nombre" text,
"ranura" text,
"rareza" text,
"substat" text,
"calidad_min" bigint,
"calidad_max" bigint,
"conjunto" text,
"talento_unico" text,
"ranuras_opciones" bigint,
"descripcion" text,
"personajes" text,
"url" text);
create index "game_armaduras_rareza_idx" on public."game_armaduras" ("rareza");
create index "game_armaduras_ranura_idx" on public."game_armaduras" ("ranura");
create index "game_armaduras_search_idx" on public."game_armaduras" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_accesorios" ("id" bigint primary key,
"slug" text,
"game_id" text,
"nombre" text,
"ranura" text,
"rareza" text,
"substat" text,
"calidad_min" bigint,
"calidad_max" bigint,
"conjunto" text,
"ranuras_opciones" bigint,
"descripcion" text,
"url" text);
create index "game_accesorios_rareza_idx" on public."game_accesorios" ("rareza");
create index "game_accesorios_ranura_idx" on public."game_accesorios" ("ranura");
create index "game_accesorios_search_idx" on public."game_accesorios" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_equipo_stats" ("id" bigint primary key,
"tabla" text,
"equipo_id" bigint,
"equipo" text,
"stat_nombre" text,
"valor_min_calidad" double precision,
"valor_max_calidad" double precision,
"es_porcentaje" bigint);
create index "game_equipo_stats_equipo_idx" on public."game_equipo_stats" (tabla,equipo_id);
create table public."game_equipo_talento_niveles" ("id" bigint primary key,
"tabla" text,
"equipo_id" bigint,
"equipo" text,
"talento" text,
"talento_id" text,
"nivel" bigint,
"probabilidad_pct" double precision,
"descripcion" text);
create index "game_equipo_talento_niveles_equipo_idx" on public."game_equipo_talento_niveles" (tabla,equipo_id);
create table public."game_equipo_opciones_aleatorias" ("id" bigint primary key,
"tabla" text,
"equipo_id" bigint,
"equipo" text,
"stat_nombre" text,
"valor_min" text,
"valor_max" text,
"probabilidad_stat" text,
"tiers" text);
create index "game_equipo_opciones_aleatorias_equipo_idx" on public."game_equipo_opciones_aleatorias" (tabla,equipo_id);
create table public."game_conjuntos" ("id" bigint primary key,
"nombre" text,
"piezas_total" bigint,
"nuevo" bigint);
create index "game_conjuntos_search_idx" on public."game_conjuntos" using gin(to_tsvector('simple', coalesce(nombre,'')));
create table public."game_conjunto_piezas" ("id" bigint primary key,
"conjunto_id" bigint,
"pieza" text,
"ranura" text,
foreign key ("conjunto_id") references public."game_conjuntos" ("id"));
create index "game_conjunto_piezas_conjunto_id_idx" on public."game_conjunto_piezas" ("conjunto_id");
create index "game_conjunto_piezas_ranura_idx" on public."game_conjunto_piezas" ("ranura");
create table public."game_conjunto_bonos" ("id" bigint primary key,
"conjunto_id" bigint,
"piezas" bigint,
"bonificacion" text,
foreign key ("conjunto_id") references public."game_conjuntos" ("id"));
create index "game_conjunto_bonos_conjunto_id_idx" on public."game_conjunto_bonos" ("conjunto_id");
alter table public."game_imports" enable row level security; revoke all on public."game_imports" from anon,authenticated; grant select on public."game_imports" to anon,authenticated; create policy catalog_read on public."game_imports" for select to anon,authenticated using (status='ready');
alter table public."game_metadatos" enable row level security; revoke all on public."game_metadatos" from anon,authenticated; grant select on public."game_metadatos" to anon,authenticated; create policy catalog_read on public."game_metadatos" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_elementos" enable row level security; revoke all on public."game_elementos" from anon,authenticated; grant select on public."game_elementos" to anon,authenticated; create policy catalog_read on public."game_elementos" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_roles" enable row level security; revoke all on public."game_roles" from anon,authenticated; grant select on public."game_roles" to anon,authenticated; create policy catalog_read on public."game_roles" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_rarezas" enable row level security; revoke all on public."game_rarezas" from anon,authenticated; grant select on public."game_rarezas" to anon,authenticated; create policy catalog_read on public."game_rarezas" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_tipos_arma" enable row level security; revoke all on public."game_tipos_arma" from anon,authenticated; grant select on public."game_tipos_arma" to anon,authenticated; create policy catalog_read on public."game_tipos_arma" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_estadisticas" enable row level security; revoke all on public."game_estadisticas" from anon,authenticated; grant select on public."game_estadisticas" to anon,authenticated; create policy catalog_read on public."game_estadisticas" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_personajes" enable row level security; revoke all on public."game_personajes" from anon,authenticated; grant select on public."game_personajes" to anon,authenticated; create policy catalog_read on public."game_personajes" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_personaje_armas" enable row level security; revoke all on public."game_personaje_armas" from anon,authenticated; grant select on public."game_personaje_armas" to anon,authenticated; create policy catalog_read on public."game_personaje_armas" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_habilidades" enable row level security; revoke all on public."game_habilidades" from anon,authenticated; grant select on public."game_habilidades" to anon,authenticated; create policy catalog_read on public."game_habilidades" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_habilidad_efectos" enable row level security; revoke all on public."game_habilidad_efectos" from anon,authenticated; grant select on public."game_habilidad_efectos" to anon,authenticated; create policy catalog_read on public."game_habilidad_efectos" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_potenciales" enable row level security; revoke all on public."game_potenciales" from anon,authenticated; grant select on public."game_potenciales" to anon,authenticated; create policy catalog_read on public."game_potenciales" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_maestria_niveles" enable row level security; revoke all on public."game_maestria_niveles" from anon,authenticated; grant select on public."game_maestria_niveles" to anon,authenticated; create policy catalog_read on public."game_maestria_niveles" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_maestria_subniveles" enable row level security; revoke all on public."game_maestria_subniveles" from anon,authenticated; grant select on public."game_maestria_subniveles" to anon,authenticated; create policy catalog_read on public."game_maestria_subniveles" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_maestria_ramas" enable row level security; revoke all on public."game_maestria_ramas" from anon,authenticated; grant select on public."game_maestria_ramas" to anon,authenticated; create policy catalog_read on public."game_maestria_ramas" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_maestria_comun" enable row level security; revoke all on public."game_maestria_comun" from anon,authenticated; grant select on public."game_maestria_comun" to anon,authenticated; create policy catalog_read on public."game_maestria_comun" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_atuendos" enable row level security; revoke all on public."game_atuendos" from anon,authenticated; grant select on public."game_atuendos" to anon,authenticated; create policy catalog_read on public."game_atuendos" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_grabados" enable row level security; revoke all on public."game_grabados" from anon,authenticated; grant select on public."game_grabados" to anon,authenticated; create policy catalog_read on public."game_grabados" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_trascendencias" enable row level security; revoke all on public."game_trascendencias" from anon,authenticated; grant select on public."game_trascendencias" to anon,authenticated; create policy catalog_read on public."game_trascendencias" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_rafagas" enable row level security; revoke all on public."game_rafagas" from anon,authenticated; grant select on public."game_rafagas" to anon,authenticated; create policy catalog_read on public."game_rafagas" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_habilidades_combinadas" enable row level security; revoke all on public."game_habilidades_combinadas" from anon,authenticated; grant select on public."game_habilidades_combinadas" to anon,authenticated; create policy catalog_read on public."game_habilidades_combinadas" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_banners" enable row level security; revoke all on public."game_banners" from anon,authenticated; grant select on public."game_banners" to anon,authenticated; create policy catalog_read on public."game_banners" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_efectos" enable row level security; revoke all on public."game_efectos" from anon,authenticated; grant select on public."game_efectos" to anon,authenticated; create policy catalog_read on public."game_efectos" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_efectos_codice" enable row level security; revoke all on public."game_efectos_codice" from anon,authenticated; grant select on public."game_efectos_codice" to anon,authenticated; create policy catalog_read on public."game_efectos_codice" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_armas" enable row level security; revoke all on public."game_armas" from anon,authenticated; grant select on public."game_armas" to anon,authenticated; create policy catalog_read on public."game_armas" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_arma_grados" enable row level security; revoke all on public."game_arma_grados" from anon,authenticated; grant select on public."game_arma_grados" to anon,authenticated; create policy catalog_read on public."game_arma_grados" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_arma_encantamientos" enable row level security; revoke all on public."game_arma_encantamientos" from anon,authenticated; grant select on public."game_arma_encantamientos" to anon,authenticated; create policy catalog_read on public."game_arma_encantamientos" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_arma_pasiva_niveles" enable row level security; revoke all on public."game_arma_pasiva_niveles" from anon,authenticated; grant select on public."game_arma_pasiva_niveles" to anon,authenticated; create policy catalog_read on public."game_arma_pasiva_niveles" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_armaduras" enable row level security; revoke all on public."game_armaduras" from anon,authenticated; grant select on public."game_armaduras" to anon,authenticated; create policy catalog_read on public."game_armaduras" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_accesorios" enable row level security; revoke all on public."game_accesorios" from anon,authenticated; grant select on public."game_accesorios" to anon,authenticated; create policy catalog_read on public."game_accesorios" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_equipo_stats" enable row level security; revoke all on public."game_equipo_stats" from anon,authenticated; grant select on public."game_equipo_stats" to anon,authenticated; create policy catalog_read on public."game_equipo_stats" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_equipo_talento_niveles" enable row level security; revoke all on public."game_equipo_talento_niveles" from anon,authenticated; grant select on public."game_equipo_talento_niveles" to anon,authenticated; create policy catalog_read on public."game_equipo_talento_niveles" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_equipo_opciones_aleatorias" enable row level security; revoke all on public."game_equipo_opciones_aleatorias" from anon,authenticated; grant select on public."game_equipo_opciones_aleatorias" to anon,authenticated; create policy catalog_read on public."game_equipo_opciones_aleatorias" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_conjuntos" enable row level security; revoke all on public."game_conjuntos" from anon,authenticated; grant select on public."game_conjuntos" to anon,authenticated; create policy catalog_read on public."game_conjuntos" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_conjunto_piezas" enable row level security; revoke all on public."game_conjunto_piezas" from anon,authenticated; grant select on public."game_conjunto_piezas" to anon,authenticated; create policy catalog_read on public."game_conjunto_piezas" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
alter table public."game_conjunto_bonos" enable row level security; revoke all on public."game_conjunto_bonos" from anon,authenticated; grant select on public."game_conjunto_bonos" to anon,authenticated; create policy catalog_read on public."game_conjunto_bonos" for select to anon,authenticated using (exists(select 1 from public.game_imports where status='ready'));
create table public.party_plans (id uuid not null, user_id uuid not null references auth.users(id) on delete cascade, data jsonb not null check(jsonb_typeof(data)='object' and data->>'version'='2' and jsonb_typeof(data->'heroes')='array' and jsonb_array_length(data->'heroes') between 0 and 4), updated_at timestamptz not null default now(), primary key(user_id,id)); create index party_plans_user_updated_idx on public.party_plans(user_id,updated_at desc); alter table public.party_plans enable row level security; revoke all on public.party_plans from anon; grant select,insert,update,delete on public.party_plans to authenticated; create policy party_select on public.party_plans for select to authenticated using ((select auth.uid())=user_id); create policy party_insert on public.party_plans for insert to authenticated with check ((select auth.uid())=user_id); create policy party_update on public.party_plans for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id); create policy party_delete on public.party_plans for delete to authenticated using ((select auth.uid())=user_id);