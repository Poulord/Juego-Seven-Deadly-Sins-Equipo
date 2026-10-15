export interface Character {
  slug: string;
  nombre: string;
  rareza: string;
  elemento_principal: string;
  rol_principal: string;
  imagen: string;
  habilidad_aventura: string;
  habilidad_aventura_desc: string;
  url: string;
}
export interface Style {
  id: number;
  personaje: string;
  orden: number;
  tipo_arma: string;
  rol: string;
  elemento: string;
}
export interface Weapon {
  id: number;
  slug: string;
  nombre: string;
  tipo_arma: string;
  rarezas: string;
  atq_max: number;
  pasiva: string;
  pasiva_descripcion: string;
  descripcion: string;
  usado_por: string;
  imagen: string;
  url: string;
}
export interface WeaponGrade {
  id: number;
  arma_id: number;
  rareza: string;
  atq_base: number;
  atq_max: number;
  substat: string | null;
  substat_base: number | null;
  substat_max: number | null;
  promocion_atq_max: number | null;
  refuerzo_max: number;
}
export interface Gear {
  id: number;
  slug: string;
  game_id: string;
  nombre: string;
  ranura: string;
  rareza: string;
  substat: string | null;
  calidad_min: number;
  calidad_max: number;
  conjunto: string | null;
  talento_unico?: string;
  personajes?: string;
  ranuras_opciones: number | null;
  descripcion: string;
  url: string;
}
export interface GearStat {
  id: number;
  tabla: string;
  equipo_id: number;
  stat_nombre: string;
  valor_min_calidad: number;
  valor_max_calidad: number;
  es_porcentaje: number;
}
export interface RandomOption {
  id: number;
  tabla: string;
  equipo_id: number;
  stat_nombre: string;
  valor_min: string;
  valor_max: string;
  probabilidad_stat: string;
  tiers: string;
}
export interface Enchant {
  id: number;
  arma_id: number;
  rareza: string;
  stat: string;
  stat_nombre: string;
  min: number;
  max: number;
  rango_fmt: string;
}
export interface SetBonus {
  id: number;
  conjunto_id: number;
  piezas: number;
  bonificacion: string;
}
export interface Talent {
  id: number;
  tabla: string;
  equipo_id: number;
  talento: string;
  nivel: number;
  descripcion: string;
}
export interface Passive {
  id: number;
  arma_id: number;
  rareza: string;
  nivel: number;
  descripcion: string;
}
export interface StatDefinition {
  codigo: string;
  nombre: string;
  es_porcentaje: number;
}
export interface Combined {
  id: number;
  categoria: string;
  base_personaje: string;
  base_arma: string;
  base_habilidad: string;
  apoyo1_personaje: string;
  apoyo1_arma: string;
  apoyo1_habilidad: string;
  apoyo2_personaje: string | null;
  apoyo2_arma: string | null;
  apoyo2_habilidad: string | null;
  dano: string;
  elemento: string;
}
export interface Catalog {
  personajes: Character[];
  personaje_armas: Style[];
  armas: Weapon[];
  arma_grados: WeaponGrade[];
  arma_encantamientos: Enchant[];
  arma_pasiva_niveles: Passive[];
  armaduras: Gear[];
  accesorios: Gear[];
  equipo_stats: GearStat[];
  equipo_talento_niveles: Talent[];
  equipo_opciones_aleatorias: RandomOption[];
  conjuntos: { id: number; nombre: string; piezas_total: number }[];
  conjunto_bonos: SetBonus[];
  estadisticas: StatDefinition[];
  habilidades_combinadas: Combined[];
}
export interface Skill {
  id: number;
  personaje: string;
  tipo_arma: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  enfriamiento_s: number | null;
}
export interface Engraving {
  id: number;
  personaje: string;
  atuendo: string;
  atuendo_id: number;
  grabado_id: string;
  nivel: number;
  descripcion: string;
}
export interface Detail {
  habilidades: Skill[];
  grabados: Engraving[];
  potenciales: {
    id: number;
    tipo_arma: string;
    nivel: number;
    bonificacion: string;
  }[];
  maestria_niveles: {
    id: number;
    tipo_arma: string;
    nivel: number;
    exp_requerida: number;
    coste_oro: number;
  }[];
  maestria_subniveles: {
    id: number;
    maestria_id: number;
    stat_nombre: string;
    valor: number;
    valor_fmt: string;
  }[];
  maestria_ramas: {
    id: number;
    tipo_arma: string;
    nivel: number;
    stat_nombre: string | null;
    valor_fmt: string | null;
    aplicacion: string;
  }[];
  atuendos: { id: number; nombre: string; imagen: string; efecto: string }[];
  trascendencias: {
    id: number;
    armadura: string;
    nivel: number;
    stat_nombre: string;
    valor_fmt: string;
    pasiva_descripcion: string | null;
  }[];
}
export interface Contribution {
  label: string;
  value: number;
  percent: boolean;
}
export interface Equipped {
  key: string;
  sourceTable: "armas" | "armaduras" | "accesorios";
  sourceId: number;
  name: string;
  slot: string;
  image: string;
  rarity: string;
  scenario: "base" | "max";
  gradeId?: number;
  setName?: string;
  setId?: number;
  stats: Contribution[];
  passive?: string;
  enchants: { definition: Enchant; value: number }[];
  options: { definition: RandomOption; value: number }[];
  talent?: Talent;
}
export interface HeroPlan {
  character: Character;
  style: Style;
  pieces: Record<string, Equipped>;
  bonuses: SetBonus[];
  engraving?: Engraving;
}
export interface PartyPlan {
  version: 2;
  id: string;
  name: string;
  boss: string;
  activity: string;
  tags: string[];
  notes: string;
  favorite: boolean;
  catalogVersion: string;
  heroes: HeroPlan[];
  updatedAt: string;
}
export interface CatalogManifest {
  sha256: string;
  counts: Record<string, number>;
  totalRows: number;
  limitations: string[];
  source: { clave: string; valor: string }[];
}
