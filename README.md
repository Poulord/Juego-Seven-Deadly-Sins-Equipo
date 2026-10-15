# Origin Forge — Seven Deadly Sins: Origin

Planificador de formaciones de cuatro héroes. React + TypeScript + Vite, catálogo compartido de solo lectura y configuraciones privadas en Supabase.

## Ejecutar

Requiere Node 24 y npm.

```sh
npm ci
npm run dev
```

El proyecto remoto utilizado es `gffnzmouzkmpnzmyzvzw` (SevenDeadlySins Equipo, Pablos's Org, eu-west-3). La conexión local está en `.env`, que no se publica en Git. Para otro checkout, copiar `.env.example` a `.env` y configurar la URL y la clave publicable. Nunca usar claves secretas o service_role en Vite.

Sin variables se utiliza la copia estática del catálogo y almacenamiento local de formaciones. Con Supabase se consulta el catálogo remoto y se comprueba que su SHA coincide con esta versión. Las fichas de cada héroe se cargan bajo demanda. El modo local no aísla usuarios que comparten un perfil del navegador. Las cuentas guardan directamente en la BD; no se suben automáticamente las formaciones locales.

## Catálogo importado el 15 de octubre de 2026

Origen: el archivo `supabase/7dsorigin.db` proporcionado por el usuario. Fuente declarada por el archivo: https://7dsorigin.app/es. SHA-256: `5932833c3b75996d35e8fc1f61c77eda7935b1191f94797a58a4d0504440e1b8`.

Se importaron las **35 tablas y 16.609 registros**, manteniendo los campos originales, claves primarias y referencias declaradas. Los nombres PostgreSQL llevan el prefijo `game_` para separarlos de los planes privados. Los campos JSON de origen permanecen sin pérdida como texto. `habilidades.dano_pct_atq` contenía expresiones como `25% ATK` pese a estar declarado REAL en SQLite; una migración lo conserva como texto.

- 28 personajes (18 SSR y 10 SR), con 84 estilos de arma.
- 170 armas, 290 grados, 1.086 encantamientos y 763 niveles de pasiva.
- 281 armaduras, 73 accesorios, 877 estadísticas de piezas y 2.021 opciones aleatorias.
- 24 conjuntos y 48 umbrales de bonificación.
- 303 niveles de grabado, 504 habilidades y 716 combinaciones.
- Maestrías, potenciales, trascendencias, atuendos, efectos, ráfagas y diccionarios de referencia: todos conservados en Supabase.

`supabase/catalog-audit.json` contiene los recuentos completos y limitaciones. La verificación real mediante REST y clave publicable contrastó los recuentos de las 35 tablas, el SHA de la versión y el rechazo de escrituras anónimas al catálogo y de acceso anónimo a planes privados. La auditoría de seguridad de Supabase no devolvió avisos. El asesor de rendimiento solo informó índices recién creados sin uso todavía; no es un fallo de la carga.

## Organización y privacidad

- `game_*`: catálogo común, lectura por anon/authenticated y escritura reservada a administración. RLS en todas las tablas.
- `game_imports`: huella de origen, fecha de extracción, recuentos y estado de la primera importación; solo se marcó lista tras verificar todos los recuentos.
- `party_plans`: instantáneas privadas de formaciones de hasta cuatro héroes, indexadas por propietario/fecha. Las políticas SELECT/INSERT/UPDATE/DELETE comprueban el propietario; UPDATE incluye WITH CHECK.
- `teams` y `catalog_entries`: conservan los planes manuales de la primera versión. Acceso desde «Planes de la primera versión», ruta `/?legacy=1`. No se han eliminado ni migrado destructivamente los datos anteriores.

Se añadieron índices B-tree para relaciones, tipos de arma, rarezas, ranuras y búsquedas por pieza (`tabla,equipo_id`), además de GIN para nombres. Los usuarios no pueden modificar el catálogo de referencia desde la nueva interfaz.

Cada formación guarda copias de personajes, estilos, piezas, atributos elegidos, grabados, talentos y reglas de conjunto. Una pieza puede usarse en cualquier número de planes. Duplicar y editar una formación no modifica otra ni el catálogo. Cambiar el estilo de arma retira el arma incompatible de esa configuración.

## Editor y presentación

- Selector con los 28 héroes, búsqueda y filtro SR/SSR; evita repetir un héroe dentro del grupo.
- Cuatro puestos de formación y selección individual de estilo de combate.
- Armas compatibles con el estilo, selección de grado y valores de origen base/máximo.
- Armaduras, accesorios y armadura ligada en sus ranuras correspondientes.
- Encantamientos dentro de rangos, atributos aleatorios cuando el catálogo declara el número de ranuras, pasivas por nivel, talentos únicos y grabados por héroe/nivel.
- Panel de aportes de las piezas, umbrales de conjunto activos/inactivos y referencia de efectos.
- Información del equipo por héroe y ataques combinados que coinciden exactamente con héroes y estilos elegidos.
- Guardar, duplicar, eliminar, favoritos, filtros, comparación de hasta tres formaciones y exportación JSON.
- Catálogo de consulta con habilidades, grabados, potencial, maestría y trascendencia.
- Retratos y armas usando las URLs presentes en la BD. La BD no incluye URLs de imagen de todas las armaduras: esas ranuras usan símbolos, sin inventar rutas.
- Diseño inspirado en las capturas: tonos azul noche/dorado, panel de información claro, selección azul, retratos, transición de héroe y partículas. Fondo a partir de la captura proporcionada por el usuario. No se incluyen modelos 3D ni animaciones extraídas del juego. Respeta prefers-reduced-motion y se adapta a móvil.

## Límites de los cálculos

La BD **no contiene una tabla de estadísticas base de cada héroe por nivel**, ni una fórmula completa y validada de combate. Por eso la interfaz muestra **aportes de equipamiento**, no inventa los totales finales ni el poder de combate. No suma porcentajes entre héroes.

Los valores codificados `Rate` (p. ej. encantamientos) se almacenan en centésimas de porcentaje; las estadísticas de armadura de `equipo_stats` ya vienen en unidades de visualización. Las secundarias de arma se convierten según el diccionario canónico de estadísticas. No se interpolan niveles o calidades intermedias: se elige explícitamente el extremo base o máximo disponible.

Las bonificaciones de conjunto se detectan por número de piezas y se muestran con sus condiciones. Los efectos narrativos/condicionales, maestrías, potencial y trascendencia se pueden consultar; no se evalúan automáticamente ni se añaden al aporte de piezas. Los valores intermedios de refuerzo, progresión base y un motor completo requieren más datos y validación con el juego.

## Regenerar y verificar

```sh
npm run catalog:prepare
npm run catalog:verify
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`catalog:prepare` lee SQLite en modo solo lectura, comprueba integridad/FK, genera copia de consulta, fichas por héroe, manifiesto y lotes SQL reanudables en `supabase/import/`. El archivo SQLite y los lotes están ignorados por Git. No modifica el archivo original.

Las tres migraciones están en `supabase/migrations`. Para recrear un proyecto vacío, aplicar todas en orden y después los lotes del manifiesto generado en orden; detenerse ante cualquier error. Los lotes usan UPSERT por las claves de origen. La generación no sube datos automáticamente ni necesita credenciales. El patrón está preparado para esta primera carga: actualizar un catálogo de producción exige preparar una nueva versión en staging y promoverla de forma atómica, sin sobrescribir directamente la versión en uso.

`catalog:verify` necesita `.env`, usa exclusivamente la clave publicable y guarda un informe en `output/supabase-verification.json`. Comprueba también el rechazo de operaciones anónimas; no crea usuarios ni envía correos.

Las pruebas de dominio cubren cobertura, unidades, extremos, compatibilidad, copias independientes, conjuntos y ataques combinados. Las pruebas PGlite ejecutan las migraciones y verifican aislamiento entre dos propietarios y catálogo inmutable. E2E comprueba la formación real de cuatro héroes, piezas, cambio de estilo, grabados, resumen, duplicación independiente, recarga y móvil; también mantiene los flujos de la primera versión. GitHub Actions ejecuta pruebas y build.

## Cuentas y despliegue

El cliente incluye registro, confirmación por correo, inicio y cierre de sesión. Antes de producción, configurar en Supabase Auth la Site URL y Redirect URLs del dominio final y del origen local (`http://127.0.0.1:5173`). No se han enviado correos ni creado cuentas personales para probar el alta; la entrega verifica RLS local y permisos REST remotos, no el envío real de confirmaciones.

En Vercel: proyecto Vite, build `npm run build`, salida `dist` y las dos variables públicas de Supabase. El despliegue en Vercel y la prueba de alta con correo real quedan pendientes.

`main` contiene la primera versión, ya fusionada en PR #1. Esta entrega usa `codex/catalogo-supabase-formaciones` y un PR separado. No se ha fusionado esta rama. Fase 2: capturas/OCR con revisión antes de guardar, tras decidir conservación de imágenes y método de reconocimiento.

Proyecto de fans sin afiliación a Netmarble. Las imágenes y personajes pertenecen a sus titulares; se conserva la procedencia de los datos.
